import { Injectable, Logger } from '@nestjs/common';
import { IdentifyDto } from './dto/identify.dto';
import { ContextDto } from './dto/context.dto';
import { SpeakDto } from './dto/speak.dto';
import { TtsService } from '../tts/tts.service';
import { GeohashCacheService } from './geohash-cache.service';
import { geohashEncode } from './geohash.util';

interface OverpassElement {
  type: string;
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}

interface OverpassResponse {
  elements: OverpassElement[];
}

interface NominatimAddress {
  road?: string;
  suburb?: string;
  neighbourhood?: string;
  city_district?: string;
  quarter?: string;
  city?: string;
  town?: string;
  village?: string;
  country?: string;
}

interface NominatimResponse {
  address?: NominatimAddress;
}

interface PoiWithContext {
  name: string;
  distanceM: number;
  bearing: number;
  directionLabel: string;
  walkTime: string;
  inHeadingDirection: boolean;
}

export interface ExploreResult {
  text: string;
  audioUrl: string;
  pois: string[];
  direction: string;
}

export interface LocationContextResult {
  address: NominatimAddress;
  directPois: PoiWithContext[];
  nearbyPois: PoiWithContext[];
  direction: string;
  heading: number;
}

/**
 * Exploration Service
 *
 * Receives GPS position + compass heading, queries Overpass API (500m radius, all
 * directions) and Nominatim reverse geocoding in parallel, builds a rich structured
 * context (direct view + nearby attractions + neighbourhood info), then asks Hawkins AI
 * to narrate what the user sees like a real tour guide.
 */
@Injectable()
export class ExplorationService {
  private readonly logger = new Logger(ExplorationService.name);
  private readonly OVERPASS_URL = 'https://overpass-api.de/api/interpreter';
  private readonly NOMINATIM_URL = 'https://nominatim.openstreetmap.org/reverse';
  // Cono "delante" ±35°: modo "apunta y descubre" — el usuario apunta el móvil
  // a algo concreto, así que el cono es estrecho para narrar lo que apunta, no
  // toda la zona vagamente en esa dirección.
  private readonly HEADING_TOLERANCE_DEG = 35;

  // Cache tuning
  private readonly NOMINATIM_GEOHASH_PRECISION = 7; // ~150 m
  private readonly OVERPASS_GEOHASH_PRECISION = 6; // ~1.2 km
  private readonly NOMINATIM_TTL_MS = 24 * 60 * 60 * 1000; // 24 h
  private readonly OVERPASS_TTL_MS = 12 * 60 * 60 * 1000; // 12 h
  // Overpass query uses around:500 — we only expose POIs within this radius
  // even if the cached blob happens to contain POIs slightly outside of it.
  private readonly POI_RADIUS_M = 500;

  constructor(
    private ttsService: TtsService,
    private readonly cache: GeohashCacheService,
  ) {}

  // ========================================
  // PUBLIC API
  // ========================================

  async identify(dto: IdentifyDto): Promise<ExploreResult> {
    const { latitude, longitude, heading, language, experienceType, previousDirection } = dto;
    const direction = this.headingToDirection(heading, language);

    this.logger.log(
      `Exploration identify: lat=${latitude}, lon=${longitude}, heading=${heading}° (${direction}), lang=${language}`,
    );

    // 1. Fetch Overpass POIs + Nominatim context in parallel.
    // Both helpers are resilient: on failure they return [] / {} instead of
    // throwing, so we can safely await them in parallel with Promise.all.
    const [elements, address] = await Promise.all([
      this.getOverpassPOIsCached(latitude, longitude).catch((err) => {
        this.logger.warn(`Overpass unexpected error: ${err.message}`);
        return [] as OverpassElement[];
      }),
      this.getNominatimContextCached(latitude, longitude, language).catch((err) => {
        this.logger.warn(`Nominatim unexpected error: ${err.message}`);
        return {} as NominatimAddress;
      }),
    ]);

    const allPois = this.enrichPois(elements, latitude, longitude, heading, language);
    this.logger.log(`${allPois.length} enriched POIs total`);
    this.logger.log(
      `Nominatim: ${address.suburb || address.city_district || 'no suburb'}, ${address.city || address.town || 'no city'}`,
    );

    // 2. Separate: direct view vs. nearby in other directions
    const directPois = allPois
      .filter((p) => p.inHeadingDirection)
      .sort((a, b) => a.distanceM - b.distanceM);

    const nearbyPois = allPois
      .filter((p) => !p.inHeadingDirection)
      .sort((a, b) => a.distanceM - b.distanceM);

    this.logger.log(`Direct: ${directPois.length}, Nearby: ${nearbyPois.length}`);

    // 3. Generate narration
    const narrationText = await this.generateNarration(
      latitude, longitude, heading, direction,
      directPois, nearbyPois, address,
      language, experienceType, previousDirection,
    ).catch((err) => {
      this.logger.error(`Narration error: ${err.message}`);
      return language === 'es'
        ? 'Estás explorando una zona interesante. No se pudo obtener información detallada en este momento.'
        : 'You are exploring an interesting area. Detailed information is not available right now.';
    });

    // 4. Generate audio. The TTS provider writes an unguessable UUID-named
    // file and returns its /audio/... URL directly (no rename step).
    let finalAudioUrl = '';
    try {
      finalAudioUrl = await this.ttsService.generateSpeechAudio(narrationText, language);
    } catch (err) {
      this.logger.error(`TTS error: ${err.message}`);
    }

    return {
      text: narrationText,
      audioUrl: finalAudioUrl,
      pois: directPois.map((p) => p.name),
      direction,
    };
  }

  // ========================================
  // OVERPASS API
  // ========================================

  private buildOverpassQuery(lat: number, lon: number): string {
    // Every filter requires ["name"] — Overpass otherwise times out (504) on
    // dense historic centres because unfiltered way/historic queries are huge.
    // Restricting to named elements is ~50x faster and matches enrichPois,
    // which discards unnamed POIs anyway. `nwr` = node + way + relation.
    return `[out:json][timeout:25];
(
  nwr["name"]["tourism"~"attraction|museum|gallery|viewpoint|artwork|monument|information"](around:500,${lat},${lon});
  nwr["name"]["historic"](around:500,${lat},${lon});
  nwr["name"]["amenity"~"place_of_worship|theatre|cinema|arts_centre|marketplace|library|university|college|townhall"](around:500,${lat},${lon});
  nwr["name"]["leisure"~"park|garden|nature_reserve|stadium"](around:500,${lat},${lon});
  nwr["name"]["place"~"square"](around:500,${lat},${lon});
  nwr["name"]["man_made"~"tower|lighthouse|windmill|water_tower|obelisk"](around:500,${lat},${lon});
  nwr["name"]["natural"~"peak|volcano|cliff|beach|spring|cave_entrance"](around:500,${lat},${lon});
  nwr["name"]["building"~"cathedral|church|castle|palace|monument"](around:500,${lat},${lon});
);
out tags center 50;`;
  }

  private async fetchOverpassPOIs(lat: number, lon: number): Promise<OverpassElement[]> {
    const query = this.buildOverpassQuery(lat, lon);

    const response = await fetch(this.OVERPASS_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        // Overpass rejects requests with no/blank User-Agent with HTTP 406.
        'User-Agent': 'FreetourIA/1.0 (tour-guide-app)',
        Accept: 'application/json',
      },
      body: `data=${encodeURIComponent(query)}`,
      signal: AbortSignal.timeout(20000),
    });

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      throw new Error(`Overpass HTTP ${response.status}: ${body.slice(0, 200)}`);
    }

    const data: OverpassResponse = await response.json();
    return data.elements ?? [];
  }

  /**
   * Cache-aware Overpass fetch.
   *
   * The cached payload is the **raw** Overpass element list keyed by a
   * geohash-6 cell (~1.2 km). On a hit we still re-run haversine against the
   * caller's exact lat/lon so the POIs returned are always filtered to the
   * current 500 m radius — the cache never returns a pre-filtered blob.
   *
   * Failures of the external service are never cached: on error we return an
   * empty list so the caller degrades gracefully.
   */
  private async getOverpassPOIsCached(lat: number, lon: number): Promise<OverpassElement[]> {
    const geohash = geohashEncode(lat, lon, this.OVERPASS_GEOHASH_PRECISION);
    const key = `overpass:${geohash}`;

    const cached = this.cache.get<OverpassElement[]>(key);
    if (cached) {
      console.log(`[GeohashCache] HIT overpass ${geohash}`);
      return this.filterElementsByRadius(cached, lat, lon, this.POI_RADIUS_M);
    }

    console.log(`[GeohashCache] MISS overpass ${geohash}`);
    try {
      // fetchOverpassPOIs already aborts via AbortSignal.timeout(20000) — no
      // redundant Promise.race wrapper needed.
      const elements = await this.fetchOverpassPOIs(lat, lon);
      // Only cache on success.
      this.cache.set(key, elements, this.OVERPASS_TTL_MS);
      return this.filterElementsByRadius(elements, lat, lon, this.POI_RADIUS_M);
    } catch (err) {
      this.logger.warn(`Overpass failed (no cache): ${(err as Error).message}`);
      return [];
    }
  }

  /**
   * Filters Overpass elements to only those within `radiusM` of (lat, lon).
   * Elements without usable coordinates are dropped.
   */
  private filterElementsByRadius(
    elements: OverpassElement[],
    lat: number,
    lon: number,
    radiusM: number,
  ): OverpassElement[] {
    const out: OverpassElement[] = [];
    for (const el of elements) {
      const coords = this.getElementCoords(el);
      if (!coords) continue;
      if (this.haversineDistance(lat, lon, coords.lat, coords.lon) <= radiusM) {
        out.push(el);
      }
    }
    return out;
  }

  // ========================================
  // NOMINATIM REVERSE GEOCODING
  // ========================================

  private async fetchNominatimContext(lat: number, lon: number, language: string): Promise<NominatimAddress> {
    const url = `${this.NOMINATIM_URL}?lat=${lat}&lon=${lon}&format=json&zoom=16&addressdetails=1`;

    // Forward the user's language so Nominatim localises names. The raw
    // Accept-Language still keeps `es,en` as a fallback — if the caller asks
    // for something else (e.g. `fr`), we prepend it.
    const acceptLanguage = language && language !== 'es' && language !== 'en'
      ? `${language},es,en`
      : 'es,en';

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'FreetourIA/1.0 (educational-tour-guide-app)',
        'Accept-Language': acceptLanguage,
      },
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) throw new Error(`Nominatim HTTP ${response.status}`);

    const data: NominatimResponse = await response.json();
    return data.address ?? {};
  }

  /**
   * Cache-aware Nominatim fetch.
   *
   * Keyed by geohash-7 (~150 m) + language because Nominatim localises
   * address fields via Accept-Language. Failures are never cached; on error
   * we return `{}` so callers can degrade to "unknown location".
   */
  private async getNominatimContextCached(
    lat: number,
    lon: number,
    language: string,
  ): Promise<NominatimAddress> {
    const geohash = geohashEncode(lat, lon, this.NOMINATIM_GEOHASH_PRECISION);
    const lang = (language || 'es').toLowerCase();
    const key = `nominatim:${geohash}:${lang}`;

    const cached = this.cache.get<NominatimAddress>(key);
    if (cached) {
      console.log(`[GeohashCache] HIT nominatim ${geohash}`);
      return cached;
    }

    console.log(`[GeohashCache] MISS nominatim ${geohash}`);
    try {
      // fetchNominatimContext already aborts via AbortSignal.timeout(5000) — no
      // redundant (and previously inconsistent 4s) Promise.race wrapper needed.
      const address = await this.fetchNominatimContext(lat, lon, lang);
      // Only cache on success.
      this.cache.set(key, address, this.NOMINATIM_TTL_MS);
      return address;
    } catch (err) {
      this.logger.warn(`Nominatim failed (no cache): ${(err as Error).message}`);
      return {};
    }
  }

  // ========================================
  // POI ENRICHMENT
  // ========================================

  /**
   * Attaches distance, bearing, direction label and walk time to each Overpass element.
   * Filters out elements without a name.
   */
  private enrichPois(
    elements: OverpassElement[],
    userLat: number,
    userLon: number,
    heading: number,
    lang: string,
  ): PoiWithContext[] {
    const seen = new Set<string>();
    const result: PoiWithContext[] = [];

    for (const el of elements) {
      const coords = this.getElementCoords(el);
      if (!coords) continue;

      const name =
        el.tags?.name ||
        el.tags?.['name:es'] ||
        el.tags?.['name:en'] ||
        null;
      if (!name) continue;
      if (seen.has(name)) continue;
      seen.add(name);

      const distanceM = this.haversineDistance(userLat, userLon, coords.lat, coords.lon);
      const bearing = this.calculateBearing(userLat, userLon, coords.lat, coords.lon);
      const diff = this.angleDiff(bearing, heading);

      result.push({
        name,
        distanceM,
        bearing,
        directionLabel: this.bearingToDirectionWord(bearing, lang),
        walkTime: this.walkTimeLabel(distanceM, lang),
        inHeadingDirection: diff <= this.HEADING_TOLERANCE_DEG,
      });
    }

    return result;
  }

  // ========================================
  // HEADING / BEARING GEOMETRY
  // ========================================

  private calculateBearing(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const lat1R = (lat1 * Math.PI) / 180;
    const lat2R = (lat2 * Math.PI) / 180;
    const y = Math.sin(dLon) * Math.cos(lat2R);
    const x =
      Math.cos(lat1R) * Math.sin(lat2R) -
      Math.sin(lat1R) * Math.cos(lat2R) * Math.cos(dLon);
    return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
  }

  private angleDiff(a: number, b: number): number {
    const diff = Math.abs(a - b) % 360;
    return diff > 180 ? 360 - diff : diff;
  }

  /**
   * Haversine distance between two GPS points, in metres.
   */
  private haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371000;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  private getElementCoords(el: OverpassElement): { lat: number; lon: number } | null {
    if (el.lat !== undefined && el.lon !== undefined) return { lat: el.lat, lon: el.lon };
    if (el.center) return { lat: el.center.lat, lon: el.center.lon };
    return null;
  }

  // ========================================
  // DIRECTION LABELS
  // ========================================

  private headingToDirection(heading: number, lang: string): string {
    const dirs =
      lang === 'es'
        ? ['Norte', 'Noreste', 'Este', 'Sureste', 'Sur', 'Suroeste', 'Oeste', 'Noroeste']
        : ['North', 'Northeast', 'East', 'Southeast', 'South', 'Southwest', 'West', 'Northwest'];
    return dirs[Math.round(heading / 45) % 8];
  }

  private bearingToDirectionWord(bearing: number, lang: string): string {
    const dirs =
      lang === 'es'
        ? ['norte', 'noreste', 'este', 'sureste', 'sur', 'suroeste', 'oeste', 'noroeste']
        : ['north', 'northeast', 'east', 'southeast', 'south', 'southwest', 'west', 'northwest'];
    return dirs[Math.round(bearing / 45) % 8];
  }

  private walkTimeLabel(distanceM: number, lang: string): string {
    if (lang === 'es') {
      if (distanceM < 80) return 'menos de 1 minuto';
      if (distanceM < 200) return '1-2 minutos';
      if (distanceM < 350) return '3-4 minutos';
      if (distanceM < 500) return '5-6 minutos';
      return 'unos 7 minutos';
    }
    if (distanceM < 80) return 'less than 1 minute';
    if (distanceM < 200) return '1-2 minutes';
    if (distanceM < 350) return '3-4 minutes';
    if (distanceM < 500) return '5-6 minutes';
    return 'about 7 minutes';
  }

  // ========================================
  // PROMPT BUILDER — "LLAVE MAESTRA"
  // ========================================

  private buildPrompt(
    lat: number,
    lon: number,
    heading: number,
    direction: string,
    directPois: PoiWithContext[],
    nearbyPois: PoiWithContext[],
    address: NominatimAddress,
    language: string,
    experienceType?: string,
    previousDirection?: string,
  ): string {
    const isEs = language === 'es';

    // Sanitise free-text user fields before they touch the LLM prompt: strip
    // control chars / newlines and truncate, so a crafted value can't inject
    // fake instructions into the narration prompt.
    const safeExperienceType = this.sanitizeUserField(experienceType, 40);
    const safePreviousDirection = this.sanitizeUserField(previousDirection, 40);

    // ── Location context ──────────────────────────────────────────
    const neighborhood =
      address.suburb ||
      address.neighbourhood ||
      address.quarter ||
      address.city_district ||
      '';
    const street = address.road || '';
    const city = address.city || address.town || address.village || '';

    const locationCtx = isEs
      ? [
          neighborhood && `Barrio: ${neighborhood}`,
          street && `Calle: ${street}`,
          city && `Ciudad: ${city}`,
        ]
          .filter(Boolean)
          .join(' | ') || `Coordenadas: ${lat.toFixed(4)}, ${lon.toFixed(4)}`
      : [
          neighborhood && `Neighbourhood: ${neighborhood}`,
          street && `Street: ${street}`,
          city && `City: ${city}`,
        ]
          .filter(Boolean)
          .join(' | ') || `Coordinates: ${lat.toFixed(4)}, ${lon.toFixed(4)}`;

    // ── Direct view section ───────────────────────────────────────
    const directLines =
      directPois.length > 0
        ? directPois
            .slice(0, 4)
            .map((p) => `  • ${p.name} (${Math.round(p.distanceM)}m)`)
            .join('\n')
        : isEs
          ? '  Sin monumentos catalogados directamente en esta dirección.'
          : '  No catalogued landmarks directly in this direction.';

    // ── Nearby section ────────────────────────────────────────────
    const nearbyLines =
      nearbyPois.length > 0
        ? nearbyPois
            .slice(0, 6)
            .map((p) =>
              isEs
                ? `  • ${p.name} — ${Math.round(p.distanceM)}m al ${p.directionLabel} (~${p.walkTime})`
                : `  • ${p.name} — ${Math.round(p.distanceM)}m to the ${p.directionLabel} (~${p.walkTime})`,
            )
            .join('\n')
        : isEs
          ? '  Sin puntos de interés destacados en un radio de 500m.'
          : '  No notable points of interest within 500m.';

    // ── Optional modifiers ────────────────────────────────────────
    const expHint = safeExperienceType
      ? isEs
        ? ` Presta especial atención a los aspectos ${safeExperienceType}.`
        : ` Pay special attention to ${safeExperienceType} aspects.`
      : '';

    const prevIntro = safePreviousDirection
      ? isEs
        ? `Empieza diciendo "Antes mirabas hacia el ${safePreviousDirection}." y luego describe lo que ven ahora. `
        : `Start with "You were just looking towards ${safePreviousDirection}." then describe what they see now. `
      : '';

    // ── Final prompt ──────────────────────────────────────────────
    if (isEs) {
      return `Eres un guía turístico experto, apasionado y humano. El usuario está aquí:

UBICACIÓN: ${locationCtx}
MIRANDO HACIA: ${heading}° (${direction})

VISTA DIRECTA (en tu dirección ±50°):
${directLines}

LUGARES CERCANOS EN TU ENTORNO (hasta 500m):
${nearbyLines}

${prevIntro}INSTRUCCIONES PARA LA NARRACIÓN:
- Escribe 3-4 frases en español, tono ameno y cercano como un guía real.
- Si hay algo directamente frente al usuario, descríbelo con entusiasmo y datos concretos (historia, curiosidades, función).
- Si no hay monumentos enfrente, describe el barrio: su carácter, la arquitectura típica que probablemente ve, su historia o ambiente urbano. Usa el nombre del barrio y la ciudad.
- Si hay lugares interesantes cercanos, menciona 1-2 indicando dirección y tiempo a pie ("a 3 minutos al noroeste...").
- NUNCA digas "no hay monumentos" ni "no hay puntos de interés". Siempre hay algo interesante que contar.${expHint}`;
    }

    return `You are an expert, passionate and human tour guide. The user is here:

LOCATION: ${locationCtx}
FACING: ${heading}° (${direction})

DIRECT VIEW (your direction ±50°):
${directLines}

NEARBY PLACES (within 500m):
${nearbyLines}

${prevIntro}NARRATION INSTRUCTIONS:
- Write 3-4 sentences in ${language}, friendly and natural like a real guide.
- If there's something directly ahead, describe it enthusiastically with concrete details (history, curiosities, function).
- If no landmarks are ahead, describe the neighbourhood: its character, the typical architecture the user probably sees, its history or urban atmosphere. Use the neighbourhood and city name.
- If there are interesting nearby places, mention 1-2 with direction and walking time ("3 minutes to the northwest...").
- NEVER say "there are no monuments" or "there are no points of interest". There's always something interesting to say.${expHint}`;
  }

  // ========================================
  // HAWKINS AI NARRATION
  // ========================================

  private async generateNarration(
    lat: number,
    lon: number,
    heading: number,
    direction: string,
    directPois: PoiWithContext[],
    nearbyPois: PoiWithContext[],
    address: NominatimAddress,
    language: string,
    experienceType?: string,
    previousDirection?: string,
  ): Promise<string> {
    const apiKey = process.env.HAWKINS_AI_KEY;
    const apiUrl = process.env.HAWKINS_AI_URL || 'https://aiapi.hawkins.es/chat/chat';
    const model = process.env.HAWKINS_AI_MODEL || 'qwen2.5vl:latest';

    if (!apiKey) throw new Error('HAWKINS_AI_KEY is not configured');

    const prompt = this.buildPrompt(
      lat, lon, heading, direction,
      directPois, nearbyPois, address,
      language, experienceType, previousDirection,
    );

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'X-API-Key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ model, prompt, stream: false }),
      signal: AbortSignal.timeout(20000),
    });

    if (!response.ok) {
      const errorBody = await response.text().catch(() => '');
      throw new Error(`Hawkins AI error ${response.status}: ${errorBody.slice(0, 300)}`);
    }

    const data: { respuesta?: string; success?: boolean } = await response.json();
    if (!data.respuesta) throw new Error('Hawkins AI returned empty response');
    return data.respuesta.trim();
  }

  // ========================================
  // CONTEXT ENDPOINT (for ElevenLabs agent injection)
  // ========================================

  async getContext(dto: ContextDto): Promise<LocationContextResult> {
    const { latitude, longitude, heading, language } = dto;
    const direction = this.headingToDirection(heading, language);

    // Both helpers are resilient: on failure they return [] / {} instead of
    // throwing, so this endpoint NEVER surfaces a 500 for external outages.
    const [elements, address] = await Promise.all([
      this.getOverpassPOIsCached(latitude, longitude).catch((err) => {
        this.logger.warn(`Overpass unexpected error: ${err.message}`);
        return [] as OverpassElement[];
      }),
      this.getNominatimContextCached(latitude, longitude, language).catch((err) => {
        this.logger.warn(`Nominatim unexpected error: ${err.message}`);
        return {} as NominatimAddress;
      }),
    ]);

    const allPois = this.enrichPois(elements, latitude, longitude, heading, language);

    const directPois = allPois
      .filter((p) => p.inHeadingDirection)
      .sort((a, b) => a.distanceM - b.distanceM)
      .slice(0, 5);

    const nearbyPois = allPois
      .filter((p) => !p.inHeadingDirection)
      .sort((a, b) => a.distanceM - b.distanceM)
      .slice(0, 8);

    this.logger.log(
      `Context ready — direct:${directPois.length}, nearby:${nearbyPois.length}, addr:${address.suburb || address.city || 'unknown'}`,
    );

    return { address, directPois, nearbyPois, direction, heading };
  }

  // ========================================
  // SPEAK ENDPOINT (TTS only, for conversational agent audio)
  // ========================================

  async speak(dto: SpeakDto): Promise<{ audioUrl: string }> {
    // If TTS (ElevenLabs) fails or times out, degrade gracefully: the mobile
    // app already handles an empty audioUrl. Never surface a 500 here.
    try {
      const audioUrl = await this.ttsService.generateSpeechAudio(dto.text, dto.language);
      return { audioUrl };
    } catch (err) {
      this.logger.warn(`speak() TTS failed, returning empty audioUrl: ${(err as Error).message}`);
      return { audioUrl: '' };
    }
  }

  // ========================================
  // ELEVENLABS SIGNED CONVERSATION TOKEN
  // ========================================

  async getAgentToken(): Promise<{ wsUrl: string }> {
    const apiKey = process.env.ELEVENLABS_API_KEY;
    const agentId = process.env.ELEVENLABS_AGENT_ID || 'agent_6801kp1hvhpnf2aawt8a01jmw4b5';

    if (!apiKey) {
      // No API key — return unsigned URL (works for public agents)
      return { wsUrl: `wss://api.elevenlabs.io/v1/convai/conversation?agent_id=${agentId}` };
    }

    try {
      const res = await fetch(
        `https://api.elevenlabs.io/v1/convai/conversation/token?agent_id=${agentId}`,
        { headers: { 'xi-api-key': apiKey }, signal: AbortSignal.timeout(8000) },
      );
      if (res.ok) {
        const data: { signed_url?: string; token?: string } = await res.json();
        const wsUrl = data.signed_url
          || (data.token
            ? `wss://api.elevenlabs.io/v1/convai/conversation?token=${data.token}`
            : `wss://api.elevenlabs.io/v1/convai/conversation?agent_id=${agentId}`);
        this.logger.log('ElevenLabs signed URL obtained');
        return { wsUrl };
      }
      this.logger.warn(`ElevenLabs token endpoint ${res.status} — falling back to unsigned`);
    } catch (e) {
      this.logger.warn(`ElevenLabs token fetch failed: ${e.message} — falling back to unsigned`);
    }

    return { wsUrl: `wss://api.elevenlabs.io/v1/convai/conversation?agent_id=${agentId}` };
  }

  // ========================================
  // USER-INPUT SANITISATION (prompt-injection defence)
  // ========================================

  /**
   * Sanitises a free-text user field before it is interpolated into an LLM
   * prompt. Strips newlines and control characters (which could be used to
   * inject fake instructions) and truncates to `maxLen`.
   */
  private sanitizeUserField(s: string | undefined, maxLen = 40): string {
    if (!s) return '';
    return s
      // Strip ASCII control chars (0x00-0x1F incl. \n \r \t) and DEL (0x7F),
      // which could smuggle fake instructions into the prompt.
      // eslint-disable-next-line no-control-regex
      .replace(/[\x00-\x1F\x7F]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, maxLen);
  }
}
