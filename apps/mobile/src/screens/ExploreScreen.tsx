import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ActivityIndicator,
    ScrollView,
    Animated,
    Dimensions,
    TextInput,
    KeyboardAvoidingView,
    Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MapView, { Marker } from 'react-native-maps';
import * as Location from 'expo-location';
import {
    useAudioPlayer,
    useAudioPlayerStatus,
    useAudioRecorder,
    AudioModule,
    setAudioModeAsync,
    IOSOutputFormat,
    AudioQuality,
} from 'expo-audio';
import * as FileSystem from 'expo-file-system/legacy';
import { useKeepAwake } from 'expo-keep-awake';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useStore } from '../store/useStore';
import { useTheme } from '../theme/theme';
import apiClient, { SERVER_BASE_URL } from '../services/apiClient';

const { height } = Dimensions.get('window');

const CAROLINA_VOICE = 'h2cd3gvcqTp3m65Dysk7';

type Mode = 'voice' | 'text';
type WSStatus = 'idle' | 'connecting' | 'connected' | 'disconnected' | 'error';
type AgentState = 'idle' | 'listening' | 'thinking' | 'speaking';

interface Message {
    id: string;
    role: 'user' | 'agent';
    text: string;
}

interface LocationContext {
    address: {
        suburb?: string; neighbourhood?: string; quarter?: string;
        city_district?: string; road?: string; city?: string; town?: string;
    };
    directPois: Array<{ name: string; distanceM: number; directionLabel: string; walkTime: string }>;
    nearbyPois: Array<{ name: string; distanceM: number; directionLabel: string; walkTime: string }>;
    direction: string;
    heading: number;
}

// ── Find start of PCM data in WAV file (skip variable-length header) ─────
function findPcmDataOffset(bytes: Uint8Array): number {
    let offset = 12; // skip "RIFF" (4) + file size (4) + "WAVE" (4)
    while (offset + 8 < bytes.length) {
        const id = String.fromCharCode(bytes[offset], bytes[offset + 1], bytes[offset + 2], bytes[offset + 3]);
        const size = bytes[offset + 4] | (bytes[offset + 5] << 8) | (bytes[offset + 6] << 16) | (bytes[offset + 7] << 24);
        if (id === 'data') return offset + 8;
        offset += 8 + (size % 2 === 0 ? size : size + 1); // word-aligned chunks
    }
    return 44; // fallback for standard 44-byte header
}

// ── PCM chunks → WAV base64 (for playing ElevenLabs WS audio) ────────────
function createWavFromPcmChunks(chunks: string[]): string {
    // Decode base64 PCM chunks
    const arrays: Uint8Array[] = chunks.map(b64 => {
        const bin = atob(b64);
        const bytes = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
        return bytes;
    });
    const pcmLen = arrays.reduce((s, a) => s + a.length, 0);
    const wav = new Uint8Array(44 + pcmLen);
    const v = new DataView(wav.buffer);
    // RIFF header
    [82,73,70,70].forEach((b,i) => wav[i]=b);       // "RIFF"
    v.setUint32(4, 36 + pcmLen, true);
    [87,65,86,69].forEach((b,i) => wav[8+i]=b);     // "WAVE"
    [102,109,116,32].forEach((b,i) => wav[12+i]=b); // "fmt "
    v.setUint32(16, 16, true);   // subchunk size
    v.setUint16(20, 1, true);    // PCM format
    v.setUint16(22, 1, true);    // mono
    v.setUint32(24, 16000, true);// sample rate
    v.setUint32(28, 32000, true);// byte rate (16000*1*2)
    v.setUint16(32, 2, true);    // block align
    v.setUint16(34, 16, true);   // bits per sample
    [100,97,116,97].forEach((b,i) => wav[36+i]=b);  // "data"
    v.setUint32(40, pcmLen, true);
    let off = 44;
    for (const arr of arrays) { wav.set(arr, off); off += arr.length; }
    // Convert to base64
    let bin = '';
    for (let i = 0; i < wav.length; i++) bin += String.fromCharCode(wav[i]);
    return btoa(bin);
}

// ── Haversine distance in meters ─────────────────────────────────────────
function haversineM(a: {latitude:number;longitude:number}, b: {latitude:number;longitude:number}): number {
    const R = 6371000, toR = Math.PI/180;
    const dLat = (b.latitude - a.latitude) * toR;
    const dLon = (b.longitude - a.longitude) * toR;
    const s = Math.sin(dLat/2)**2 + Math.cos(a.latitude*toR)*Math.cos(b.latitude*toR)*Math.sin(dLon/2)**2;
    return R * 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1-s));
}

function headingToCardinal(deg: number): string {
    return ['N', 'NE', 'E', 'SE', 'S', 'SO', 'O', 'NO'][Math.round(deg / 45) % 8];
}
function headingToArrow(deg: number): string {
    return ['↑', '↗', '→', '↘', '↓', '↙', '←', '↖'][Math.round(deg / 45) % 8];
}

// ── Diferencia angular más corta entre dos ángulos (mod 360), en [-180, 180]
// Permite promediar/suavizar sin saltos por wrap-around de 359→0.
function angleDiff(delta: number): number {
    let d = ((delta + 180) % 360 + 360) % 360 - 180;
    return d;
}

// ── Cooldown dinámico para re-narrar por movimiento ──────────────────────
// Si el contexto tiene POIs directos delante → reaccionar rápido (25s).
// Si hay POIs cercanos (no delante) → ritmo medio (45s).
// Si no hay POIs → ritmo lento (90s) para evitar saturar.
function dynamicMovementCooldown(ctx: LocationContext | null): number {
    if (!ctx) return 90000;
    if (ctx.directPois?.length > 0) return 25000;
    if (ctx.nearbyPois?.length > 0) return 45000;
    return 90000;
}

// ── Bearing relativo: prefiere POI ancla sobre cardinal ──────────────────
// Si hay un POI directo muy cercano (<400m) o un POI cercano muy cercano
// (<200m), devolvemos "hacia {nombre}" en lugar del cardinal puro. Hace que
// Carolina diga "mirando hacia la Gran Vía" en lugar de "mirando al NE".
function bearingToRelative(ctx: LocationContext, language: string): string {
    const isEs = language === 'es';
    const direct = ctx.directPois?.[0];
    if (direct && direct.distanceM < 400) {
        return isEs ? `hacia ${direct.name}` : `towards ${direct.name}`;
    }
    const nearby = ctx.nearbyPois?.[0];
    if (nearby && nearby.distanceM < 200) {
        return isEs ? `hacia ${nearby.name}` : `towards ${nearby.name}`;
    }
    return ctx.direction;
}

function buildSystemPrompt(
    ctx: LocationContext,
    language: string,
    narratedPois: string[],
): string {
    const isEs = language === 'es';
    const { address, directPois, nearbyPois } = ctx;
    const neighborhood = address.suburb || address.neighbourhood || address.quarter || address.city_district || '';
    const city = address.city || address.town || '';
    const street = address.road || '';
    const locationLine = [neighborhood, city].filter(Boolean).join(', ')
        || (isEs ? 'ubicación desconocida' : 'unknown location');

    const narratedLower = new Set(narratedPois.map(n => n.toLowerCase()));
    const mentionedSuffix = (name: string) => narratedLower.has(name.toLowerCase())
        ? (isEs ? ' (ya mencionado)' : ' (already mentioned)')
        : '';

    const emptyLine = isEs ? '  • (nada catalogado)' : '  • (nothing catalogued)';

    const directLines = directPois.length > 0
        ? directPois.map(p => `  • ${p.name}${mentionedSuffix(p.name)} — ${Math.round(p.distanceM)}m`).join('\n')
        : emptyLine;

    const nearbyLines = nearbyPois.length > 0
        ? nearbyPois.map(p => isEs
            ? `  • ${p.name}${mentionedSuffix(p.name)} — ${Math.round(p.distanceM)}m al ${p.directionLabel}, ~${p.walkTime}`
            : `  • ${p.name}${mentionedSuffix(p.name)} — ${Math.round(p.distanceM)}m to the ${p.directionLabel}, ~${p.walkTime}`
          ).join('\n')
        : emptyLine;

    const facing = bearingToRelative(ctx, language);

    const mentionedList = narratedPois.length > 0 ? narratedPois.join(', ') : (isEs ? '(ninguno aún)' : '(none yet)');

    if (isEs) {
        return `Eres Carolina, guía turística experta, apasionada y cercana. Hablas como persona real: natural, vívida, frases cortas. REGLAS: responde en español, máximo 3-4 frases, tono cercano. Si hay algo "Delante", empieza por ello con un dato concreto. Si no, describe el barrio y sugiere 1-2 lugares cercanos con dirección y tiempo. NUNCA digas "no hay monumentos". No repitas POIs "(ya mencionado)" salvo que te lo pidan. Cuando "Mirando: hacia {X}" úsalo como referencia viva ("tienes {X} delante"). No leas listas literalmente, intégralas. Sin emojis ni markdown.

Contexto actualizado del usuario:
- Ubicación: ${locationLine}${street ? `\n- Calle: ${street}` : ''}
- Mirando: ${facing}
- Delante (cono 50°, 500m):
${directLines}
- Cerca (500m):
${nearbyLines}
- Ya mencionados recientemente: ${mentionedList}`;
    }
    return `You are Carolina, an expert passionate tour guide. Natural, vivid, short sentences. RULES: reply in English, max 3-4 sentences, warm tone. If something is "Ahead", lead with it using a concrete fact. Otherwise describe the neighbourhood and suggest 1-2 nearby places with direction and walk time. NEVER say "no monuments". Do not repeat POIs marked "(already mentioned)" unless asked. When "Facing: towards {X}" use it as live reference ("you have {X} in front of you"). Weave the lists in, don't recite. No emojis, no markdown.

Updated user context:
- Location: ${locationLine}${street ? `\n- Street: ${street}` : ''}
- Facing: ${facing}
- Ahead (50° cone, 500m):
${directLines}
- Nearby (500m):
${nearbyLines}
- Recently mentioned: ${mentionedList}`;
}

const CONNECTING_MESSAGES = [
    '🔭 Fijándome en tu vista...',
    '📍 Localizándote en el mapa...',
    '🗺️ Buscando puntos de interés...',
    '🧠 Preparando a Carolina...',
    '🏛️ Consultando la historia del lugar...',
    '🥚 Tomando clara de huevo...',
    '📡 Conectando con la guía...',
    '☕ Tomando un café rápido...',
    '🌍 Situándome en el mundo...',
    '🎙️ Preparando la narración...',
];

export default function ExploreScreen({ navigation }: any) {
    const { language, userLocation, userHeading, userSpeed } = useStore();
    const theme = useTheme();
    const c = theme.colors;
    const lang = language || 'es';

    useKeepAwake();

    // ── Audio hooks (must be at top level) ───────────────────────────────
    const player = useAudioPlayer(null);
    const playerStatus = useAudioPlayerStatus(player);
    // iOS: LINEARPCM (.wav) so we can strip header and send raw PCM to ElevenLabs
    // Android: AAC fallback (ElevenLabs won't transcribe it — text mode works on Android)
    const recorder = useAudioRecorder({
        extension: Platform.OS === 'ios' ? '.wav' : '.m4a',
        sampleRate: 16000,
        numberOfChannels: 1,
        bitRate: 64000,
        android: { outputFormat: 'mpeg4', audioEncoder: 'aac' },
        ios: {
            outputFormat: IOSOutputFormat.LINEARPCM,
            audioQuality: AudioQuality.HIGH,
            sampleRate: 16000,
            linearPCMBitDepth: 16,
            linearPCMIsBigEndian: false,
            linearPCMIsFloat: false,
        },
    });

    // ── UI state ──────────────────────────────────────────────────────────
    const [mode, setMode] = useState<Mode>('voice');
    const [wsStatus, setWsStatus] = useState<WSStatus>('idle');
    const [agentState, setAgentState] = useState<AgentState>('idle');
    const [messages, setMessages] = useState<Message[]>([]);
    const [lastAgentText, setLastAgentText] = useState('');
    const [inputText, setInputText] = useState('');
    const [isRecording, setIsRecording] = useState(false);
    const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
    const [heading, setHeading] = useState(0);
    const [mapHeading, setMapHeading] = useState(0);
    const [headingAccuracy, setHeadingAccuracy] = useState<number | null>(null);
    const [locationReady, setLocationReady] = useState(false);
    const [permissionError, setPermissionError] = useState(false);
    const [locationContext, setLocationContext] = useState<LocationContext | null>(null);
    const [connectingMessage, setConnectingMessage] = useState('');
    // Modo de cámara del mapa: 'north' = fijo al norte (cámara heading 0, marker rota),
    // 'compass' = gira siguiendo el heading del usuario (cámara rota, marker fijo).
    const [mapMode, setMapMode] = useState<'north' | 'compass'>('north');

    // ── Refs ──────────────────────────────────────────────────────────────
    const locationRef = useRef<{ latitude: number; longitude: number } | null>(null);
    const headingRef = useRef(0);
    const languageRef = useRef(lang);
    const locationContextRef = useRef<LocationContext | null>(null);
    const lastReportedHeadingRef = useRef<number | null>(null);
    const wsRef = useRef<WebSocket | null>(null);
    const mapRef = useRef<MapView>(null);
    const locationSub = useRef<Location.LocationSubscription | null>(null);
    const headingSub = useRef<Location.LocationSubscription | null>(null);
    const messagesEndRef = useRef<ScrollView>(null);
    const connectionAttempted = useRef(false);
    const connectingMsgTimer = useRef<ReturnType<typeof setInterval> | null>(null);
    const connectingMsgIndex = useRef(0);
    // Map compass heading (debounced to avoid jitter)
    const mapHeadingRef = useRef(0);
    const mapHeadingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    // Audio: WS PCM chunks → WAV file
    const wsAudioChunks = useRef<string[]>([]);
    const wsAudioFlushTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const currentAudioFileRef = useRef<string | null>(null);
    // Narration timing
    const lastNarrationTimeRef = useRef<number>(0);
    const stableHeadingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const pendingHeadingRef = useRef<number>(0);
    const lastNarratedLocationRef = useRef<{ latitude: number; longitude: number } | null>(null);
    // Sensores: velocidad GPS (m/s), course-over-ground GPS (grados, -1 si no válido)
    const speedRef = useRef<number>(0);
    const gpsCourseRef = useRef<number | null>(null);
    // isMoving derivado de speed > 1.5 m/s
    const isMovingRef = useRef<boolean>(false);
    // Última vez que se detectó movimiento real (para la regla "parado >20s")
    const lastMovementTimeRef = useRef<number>(Date.now());
    // Última posición observada en el watchPositionAsync fino (para detectar micro-movimientos)
    const lastSeenLocationRef = useRef<{ latitude: number; longitude: number } | null>(null);
    // Heading suavizado (exponencial) — separado del heading crudo del sensor
    const smoothedHeadingRef = useRef<number>(0);
    // Memoria de POIs ya narrados (name → timestamp ms). TTL 15 min.
    const narratedPoisRef = useRef<Map<string, number>>(new Map());
    // Contexto de la última narración automática (para calcular trigger variable)
    const previousNarrationContextRef = useRef<{ direction: string; heading: number; locLat: number; locLon: number } | null>(null);

    // ── Animations ────────────────────────────────────────────────────────
    const mapHeightAnim = useRef(new Animated.Value(height * 0.52)).current;
    const agentPulseAnim = useRef(new Animated.Value(1)).current;
    const fadeAnim = useRef(new Animated.Value(0)).current;

    // ── Sync refs ─────────────────────────────────────────────────────────
    useEffect(() => { locationRef.current = location; }, [location]);
    useEffect(() => { headingRef.current = heading; }, [heading]);
    useEffect(() => { languageRef.current = lang; }, [lang]);
    useEffect(() => { locationContextRef.current = locationContext; }, [locationContext]);

    // ── Entrance animation ────────────────────────────────────────────────
    useEffect(() => {
        Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
    }, []);

    // ── Agent state pulse ─────────────────────────────────────────────────
    useEffect(() => {
        if (agentState === 'speaking' || agentState === 'listening') {
            Animated.loop(Animated.sequence([
                Animated.timing(agentPulseAnim, { toValue: 1.25, duration: 700, useNativeDriver: true }),
                Animated.timing(agentPulseAnim, { toValue: 1, duration: 700, useNativeDriver: true }),
            ])).start();
        } else {
            agentPulseAnim.stopAnimation();
            agentPulseAnim.setValue(1);
        }
    }, [agentState]);

    // ── Connecting messages cycle ─────────────────────────────────────────
    useEffect(() => {
        if (wsStatus === 'connecting') {
            connectingMsgIndex.current = 0;
            setConnectingMessage(CONNECTING_MESSAGES[0]);
            connectingMsgTimer.current = setInterval(() => {
                connectingMsgIndex.current = (connectingMsgIndex.current + 1) % CONNECTING_MESSAGES.length;
                setConnectingMessage(CONNECTING_MESSAGES[connectingMsgIndex.current]);
            }, 1800);
        } else {
            if (connectingMsgTimer.current) { clearInterval(connectingMsgTimer.current); connectingMsgTimer.current = null; }
            setConnectingMessage('');
        }
        return () => { if (connectingMsgTimer.current) clearInterval(connectingMsgTimer.current); };
    }, [wsStatus]);

    // ── Auto-scroll messages ──────────────────────────────────────────────
    useEffect(() => {
        if (messages.length > 0) setTimeout(() => messagesEndRef.current?.scrollToEnd({ animated: true }), 100);
    }, [messages]);

    // ── Audio finished — clean up temp file ──────────────────────────────
    useEffect(() => {
        if (playerStatus.didJustFinish) {
            if (currentAudioFileRef.current) {
                FileSystem.deleteAsync(currentAudioFileRef.current, { idempotent: true }).catch(() => {});
                currentAudioFileRef.current = null;
            }
            setAgentState(wsRef.current?.readyState === WebSocket.OPEN ? 'listening' : 'idle');
        }
    }, [playerStatus.didJustFinish]);

    // ── Track playing state ───────────────────────────────────────────────
    useEffect(() => {
        if (playerStatus.playing) setAgentState('speaking');
    }, [playerStatus.playing]);

    // ── Seed location from global store (camera prop handles map position)
    useEffect(() => {
        if (userLocation) {
            setLocation(userLocation);
            setLocationReady(true);
        }
    }, [userLocation]);

    // Seed heading from global store (before fine tracking starts)
    useEffect(() => {
        if (userHeading) {
            setHeading(userHeading);
            setMapHeading(userHeading);
            mapHeadingRef.current = userHeading;
        }
    }, [userHeading]);

    // ── Cargar modo mapa persistido ──────────────────────────────────────
    useEffect(() => {
        AsyncStorage.getItem('@mapMode').then((v) => {
            if (v === 'north' || v === 'compass') setMapMode(v);
        }).catch(() => {});
    }, []);

    // ── GPS tracking (fine-grained updates for map + heading) ───────────
    useEffect(() => {
        setAudioModeAsync({ playsInSilentMode: true });
        connectToAgent();
        startFineTracking();

        // Cada 5s, si el usuario lleva >20s parado y la última narración fue
        // hace >45s y se ha desplazado >15m desde la última narrada, re-narramos.
        const idleCheckInterval = setInterval(() => {
            const now = Date.now();
            if (now - lastMovementTimeRef.current <= 20000) return;
            if (now - lastNarrationTimeRef.current <= 45000) return;
            if (wsRef.current?.readyState !== WebSocket.OPEN) return;
            const loc = locationRef.current;
            if (!loc) return;
            const lastNarrated = lastNarratedLocationRef.current;
            if (!lastNarrated) return;
            if (haversineM(loc, lastNarrated) <= 15) return;
            updateContextAndNarrate(headingRef.current);
        }, 5000);

        return () => {
            locationSub.current?.remove();
            headingSub.current?.remove();
            wsRef.current?.close();
            if (mapHeadingTimerRef.current) clearTimeout(mapHeadingTimerRef.current);
            if (stableHeadingTimerRef.current) clearTimeout(stableHeadingTimerRef.current);
            if (wsAudioFlushTimer.current) clearTimeout(wsAudioFlushTimer.current);
            clearInterval(idleCheckInterval);
        };
    }, []);

    const startFineTracking = async () => {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') { setPermissionError(true); return; }

        locationSub.current = await Location.watchPositionAsync(
            { accuracy: Location.Accuracy.High, distanceInterval: 8, timeInterval: 4000 },
            (loc) => {
                const coords = { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
                setLocation(coords);
                setLocationReady(true);
                locationRef.current = coords;

                // ── Sensores GPS: speed (m/s) y course-over-ground (grados) ──
                // Expo devuelve -1 cuando el dato no es válido, así que ignoramos.
                const spd = loc.coords.speed;
                if (typeof spd === 'number' && spd >= 0) {
                    speedRef.current = spd;
                    isMovingRef.current = spd > 1.5;
                }
                const crs = loc.coords.heading;
                if (typeof crs === 'number' && crs >= 0) {
                    gpsCourseRef.current = crs;
                } else {
                    // Si el GPS no tiene course válido (parado o señal débil), lo
                    // marcamos como null para que el heading use magnetómetro.
                    gpsCourseRef.current = null;
                }

                // Detección de movimiento real para la regla "parado >20s":
                // considera "se movió" si speed > 0.3 m/s o si recorrió >5m
                // desde la última posición observada.
                const prevSeen = lastSeenLocationRef.current;
                const movedMeters = prevSeen ? haversineM(coords, prevSeen) : 0;
                if ((typeof spd === 'number' && spd > 0.3) || movedMeters > 5) {
                    lastMovementTimeRef.current = Date.now();
                }
                lastSeenLocationRef.current = coords;

                // Re-narrar por movimiento: umbral 20m + cooldown dinámico
                // según riqueza del contexto (POIs delante → reaccionar rápido).
                const now = Date.now();
                const cooldown = dynamicMovementCooldown(locationContextRef.current);
                if (
                    wsRef.current?.readyState === WebSocket.OPEN &&
                    now - lastNarrationTimeRef.current > cooldown &&
                    lastNarratedLocationRef.current &&
                    haversineM(coords, lastNarratedLocationRef.current) > 20
                ) {
                    lastNarratedLocationRef.current = coords;
                    updateContextAndNarrate(headingRef.current);
                }
            }
        );

        headingSub.current = await Location.watchHeadingAsync((hd) => {
            // ── Filtrado por accuracy ────────────────────────────────────
            // iOS: entero 1 (mejor) → 3 (peor). Android: grados.
            const acc = hd.accuracy ?? null;
            if (acc !== null) {
                if (Platform.OS === 'ios') {
                    if (acc > 2) return; // descartar evento entero
                } else {
                    if (acc > 25) return;
                }
            }
            setHeadingAccuracy(acc);

            // ── Fusión course-over-ground + magnetómetro ────────────────
            // Si el usuario se mueve y hay course GPS, usar course (mucho más
            // estable y no depende de orientación del teléfono). Si está
            // parado, usar trueHeading/magHeading del sensor. Si no hay
            // ninguna fuente fiable, descartar.
            let rawHeading: number;
            if (isMovingRef.current && gpsCourseRef.current !== null) {
                rawHeading = gpsCourseRef.current;
            } else if (hd.trueHeading >= 0) {
                rawHeading = hd.trueHeading;
            } else if (hd.magHeading >= 0) {
                rawHeading = hd.magHeading;
            } else if (gpsCourseRef.current !== null) {
                rawHeading = gpsCourseRef.current;
            } else {
                return; // nada fiable, descartamos evento
            }

            // ── Suavizado exponencial con wrap-around (diff en [-180,180])
            const prev = smoothedHeadingRef.current;
            const smoothed = prev + 0.15 * angleDiff(rawHeading - prev);
            // Normalizar a [0, 360)
            const normalized = ((smoothed % 360) + 360) % 360;
            smoothedHeadingRef.current = normalized;

            const rounded = Math.round(normalized);
            setHeading(rounded); // actualización inmediata del badge brújula
            headingRef.current = rounded;
            pendingHeadingRef.current = rounded;

            // Mapa brújula: actualización inmediata si giró ≥12°, si no
            // debounce 1.5s. Evita jitter por micro-movimientos del móvil.
            const prevMapH = mapHeadingRef.current;
            const mapDiff = Math.abs(rounded - prevMapH);
            const mapAngle = mapDiff > 180 ? 360 - mapDiff : mapDiff;
            if (mapAngle >= 12) {
                if (mapHeadingTimerRef.current) clearTimeout(mapHeadingTimerRef.current);
                mapHeadingRef.current = rounded;
                setMapHeading(rounded);
            } else {
                if (mapHeadingTimerRef.current) clearTimeout(mapHeadingTimerRef.current);
                mapHeadingTimerRef.current = setTimeout(() => {
                    mapHeadingRef.current = pendingHeadingRef.current;
                    setMapHeading(pendingHeadingRef.current);
                }, 1500);
            }

            // ── Re-narración por giro ───────────────────────────────────
            // Solo tiene sentido si el usuario está PARADO: cuando camina,
            // el course GPS ya refleja su dirección real y la narración se
            // dispara por movimiento, no por giro del teléfono.
            if (stableHeadingTimerRef.current) clearTimeout(stableHeadingTimerRef.current);
            if (isMovingRef.current) return;
            stableHeadingTimerRef.current = setTimeout(() => {
                const now = Date.now();
                if (now - lastNarrationTimeRef.current < 60000) return; // 60s cooldown
                if (wsRef.current?.readyState !== WebSocket.OPEN) return;
                if (isMovingRef.current) return; // doble check tras el debounce
                const last = lastReportedHeadingRef.current;
                if (last === null) return;
                const diff = Math.abs(pendingHeadingRef.current - last);
                const angle = diff > 180 ? 360 - diff : diff;
                if (angle < 60) return; // solo re-narrar si giró ≥60°
                lastReportedHeadingRef.current = pendingHeadingRef.current;
                updateContextAndNarrate(pendingHeadingRef.current);
            }, 8000);
        }) as any;
    };

    // ── Lista de POIs mencionados recientemente (últimos 15 min) ─────────
    // Alimenta buildSystemPrompt para que Carolina no repita lo ya contado.
    // También limpia entradas caducadas para evitar crecer indefinidamente.
    const getRecentlyNarrated = useCallback((): string[] => {
        const now = Date.now();
        const TTL = 15 * 60 * 1000; // 15 min
        const result: string[] = [];
        narratedPoisRef.current.forEach((ts, name) => {
            if (now - ts < TTL) result.push(name);
            else narratedPoisRef.current.delete(name);
        });
        return result;
    }, []);

    // ── Play ElevenLabs WS audio (PCM chunks → WAV → play) ──────────────────
    // Replaces the backend TTS round-trip — ElevenLabs already streams audio via 'audio' events
    const flushWsAudio = useCallback(async () => {
        const chunks = wsAudioChunks.current;
        if (chunks.length === 0) return;
        wsAudioChunks.current = [];
        try {
            const wavB64 = createWavFromPcmChunks(chunks);
            const wavUri = `${FileSystem.cacheDirectory}ws_agent_${Date.now()}.wav`;
            await FileSystem.writeAsStringAsync(wavUri, wavB64, { encoding: 'base64' });
            if (currentAudioFileRef.current) {
                FileSystem.deleteAsync(currentAudioFileRef.current, { idempotent: true }).catch(() => {});
            }
            currentAudioFileRef.current = wavUri;
            player.replace({ uri: wavUri });
            player.play();
            setAgentState('speaking');
        } catch (e) {
            console.warn('[ExploreScreen] WS audio flush error:', e);
            setAgentState('idle');
        }
    }, [player]);

    // ── Send context + trigger narration via user_message ─────────────────
    // contextual_update is SILENT — must follow with user_message to get response
    const sendContextAndTrigger = useCallback(async (prompt: string, trigger: string) => {
        if (wsRef.current?.readyState !== WebSocket.OPEN) return;
        wsRef.current.send(JSON.stringify({ type: 'contextual_update', text: prompt }));
        await new Promise(r => setTimeout(r, 300));
        if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({ type: 'user_message', text: trigger }));
        }
    }, []);

    // ── Update context + narrate (heading change or position change) ──────
    const updateContextAndNarrate = useCallback(async (currentHeading: number) => {
        const loc = locationRef.current;
        if (!loc || wsRef.current?.readyState !== WebSocket.OPEN) return;
        lastNarrationTimeRef.current = Date.now();
        lastNarratedLocationRef.current = loc;
        try {
            const res = await apiClient.post('/exploration/context', {
                latitude: loc.latitude,
                longitude: loc.longitude,
                heading: currentHeading,
                language: languageRef.current,
            });
            const ctx: LocationContext = res.data;
            setLocationContext(ctx);
            locationContextRef.current = ctx;
            const prompt = buildSystemPrompt(ctx, languageRef.current, getRecentlyNarrated());
            const isEs = languageRef.current === 'es';

            // ── Trigger variable según qué cambió desde la última narración ─
            const prev = previousNarrationContextRef.current;
            let trigger: string;
            if (!prev) {
                trigger = isEs
                    ? 'Preséntate brevemente y dime dónde estoy y qué tengo delante.'
                    : 'Briefly introduce yourself and tell me where I am and what is in front of me.';
            } else {
                const headingDelta = Math.abs(angleDiff(currentHeading - prev.heading));
                const distMoved = haversineM(
                    { latitude: loc.latitude, longitude: loc.longitude },
                    { latitude: prev.locLat, longitude: prev.locLon },
                );
                if (headingDelta > 30) {
                    trigger = isEs
                        ? `Acabo de girar hacia el ${ctx.direction}, ¿qué hay por esta zona ahora?`
                        : `I just turned towards ${ctx.direction}, what is around here now?`;
                } else if (distMoved > 15) {
                    trigger = isEs
                        ? 'He caminado un poco, ¿qué cambia desde lo anterior? Evita repetir lo que ya me contaste.'
                        : 'I walked a bit, what changes from before? Avoid repeating what you already told me.';
                } else {
                    trigger = isEs
                        ? 'Me paré aquí, cuéntame algo interesante del punto concreto donde estoy.'
                        : 'I stopped here, tell me something interesting about this exact spot.';
                }
            }

            await sendContextAndTrigger(prompt, trigger);
            previousNarrationContextRef.current = {
                direction: ctx.direction,
                heading: currentHeading,
                locLat: loc.latitude,
                locLon: loc.longitude,
            };
        } catch (e) {
            console.warn('[ExploreScreen] Context update error:', e);
        }
    }, [sendContextAndTrigger, getRecentlyNarrated]);

    // ── Send initial location context (first time: location + WS ready) ──
    const contextSentRef = useRef(false);

    const sendLocationContext = useCallback(async () => {
        if (contextSentRef.current) return;
        const loc = locationRef.current;
        if (!loc || wsRef.current?.readyState !== WebSocket.OPEN) return;
        contextSentRef.current = true;
        lastNarrationTimeRef.current = Date.now();
        lastNarratedLocationRef.current = loc;
        lastReportedHeadingRef.current = headingRef.current;
        const isEs = languageRef.current === 'es';

        // ── Teaser inmediato: saludo breve antes de calcular contexto ──────
        // El backend /exploration/context puede tardar (reverse-geocoding +
        // Overpass). Mientras, mandamos un user_message muy corto para que
        // Carolina salude y diga "dame un momento" — así el usuario no ve
        // silencio los primeros 1-2 s tras abrir la pantalla.
        if (wsRef.current?.readyState === WebSocket.OPEN) {
            const teaser = isEs
                ? "Acabo de abrir la experiencia. Salúdame en una frase y dime 'dame un momento que veo dónde estás'. Sé breve."
                : "I just opened the experience. Greet me in one sentence and say 'give me a moment while I check where you are'. Keep it brief.";
            wsRef.current.send(JSON.stringify({ type: 'user_message', text: teaser }));
            await new Promise(r => setTimeout(r, 1500));
        }

        try {
            const res = await apiClient.post('/exploration/context', {
                latitude: loc.latitude,
                longitude: loc.longitude,
                heading: headingRef.current,
                language: languageRef.current,
            });
            const ctx: LocationContext = res.data;
            setLocationContext(ctx);
            locationContextRef.current = ctx;
            const prompt = buildSystemPrompt(ctx, languageRef.current, getRecentlyNarrated());
            const trigger = isEs
                ? 'Preséntate brevemente y dime dónde estoy y qué tengo delante.'
                : 'Briefly introduce yourself and tell me where I am and what is in front of me.';
            await sendContextAndTrigger(prompt, trigger);
            previousNarrationContextRef.current = {
                direction: ctx.direction,
                heading: headingRef.current,
                locLat: loc.latitude,
                locLon: loc.longitude,
            };
        } catch (e) {
            console.warn('[ExploreScreen] Context fetch failed:', e);
            contextSentRef.current = false;
        }
    }, [sendContextAndTrigger, getRecentlyNarrated]);

    // Fire context once location is ready AND WS is connected
    useEffect(() => {
        if (locationReady && wsStatus === 'connected') {
            sendLocationContext();
        }
    }, [locationReady, wsStatus]);

    // ── ElevenLabs WebSocket ──────────────────────────────────────────────
    const connectToAgent = useCallback(async () => {
        if (connectionAttempted.current) return;
        connectionAttempted.current = true;
        setWsStatus('connecting');

        // Get WS URL from backend
        let wsUrl = `wss://api.elevenlabs.io/v1/convai/conversation?agent_id=agent_6801kp1hvhpnf2aawt8a01jmw4b5`;
        try {
            const tokenRes = await apiClient.post('/exploration/agent-token', {});
            if (tokenRes.data?.wsUrl) wsUrl = tokenRes.data.wsUrl;
        } catch (e) {
            console.warn('[ExploreScreen] Could not get signed URL');
        }

        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
            setWsStatus('connected');
            lastReportedHeadingRef.current = headingRef.current;
            // Send bare initiation — no overrides (dashboard blocks them)
            ws.send(JSON.stringify({ type: 'conversation_initiation_client_data' }));
        };

        ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                switch (data.type) {
                    case 'audio': {
                        // Accumulate PCM chunks from ElevenLabs, flush to WAV after 300ms silence
                        const chunk: string = data.audio_event?.audio_base_64;
                        if (chunk) {
                            wsAudioChunks.current.push(chunk);
                            if (wsAudioFlushTimer.current) clearTimeout(wsAudioFlushTimer.current);
                            wsAudioFlushTimer.current = setTimeout(() => flushWsAudio(), 300);
                        }
                        break;
                    }
                    case 'agent_response': {
                        const text: string = data.agent_response_event?.agent_response;
                        if (text?.trim()) {
                            setLastAgentText(text);
                            addMessage('agent', text);
                            setAgentState('thinking');
                            // Cualquier respuesta cuenta como narración reciente:
                            // así una conversación en curso no se atropella con
                            // otra narración automática por movimiento o giro.
                            lastNarrationTimeRef.current = Date.now();
                            // Registrar POIs mencionados en el texto para futura
                            // memoria "ya mencionado" en buildSystemPrompt.
                            const ctx = locationContextRef.current;
                            if (ctx) {
                                const allPois = [...ctx.directPois, ...ctx.nearbyPois];
                                const textLower = text.toLowerCase();
                                for (const p of allPois) {
                                    if (textLower.includes(p.name.toLowerCase())) {
                                        narratedPoisRef.current.set(p.name, Date.now());
                                    }
                                }
                            }
                            // Audio arrives via 'audio' events above — no backend TTS call
                        }
                        break;
                    }
                    case 'user_transcript': {
                        const text: string = data.user_transcription_event?.user_transcript;
                        if (text?.trim()) addMessage('user', text);
                        break;
                    }
                    case 'internal_tentative_agent_response':
                        setAgentState('thinking');
                        break;
                    case 'ping':
                        ws.send(JSON.stringify({ type: 'pong', event_id: data.ping_event?.event_id }));
                        break;
                    case 'interruption':
                        if (wsAudioFlushTimer.current) clearTimeout(wsAudioFlushTimer.current);
                        wsAudioChunks.current = [];
                        try { player.pause(); } catch (_) {}
                        setAgentState('idle');
                        break;
                }
            } catch (e) {
                console.warn('[ExploreScreen] WS parse error:', e);
            }
        };

        ws.onerror = (e) => { console.error('[ExploreScreen] WS error:', e); setWsStatus('error'); };
        ws.onclose = (e) => {
            console.log('[ExploreScreen] WS closed:', e.code, e.reason);
            setWsStatus('disconnected');
            setAgentState('idle');
        };
    }, []);

    const addMessage = (role: 'user' | 'agent', text: string) => {
        setMessages(prev => [...prev, { id: `${Date.now()}-${Math.random()}`, role, text }]);
    };

    // ── Voice recording ───────────────────────────────────────────────────
    const startRecording = async () => {
        if (isRecording) return;
        try {
            const perm = await AudioModule.requestRecordingPermissionsAsync();
            if (!perm.granted) {
                console.warn('[ExploreScreen] Mic permission denied');
                return;
            }
            await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });

            // Stop agent audio while user speaks
            if (wsAudioFlushTimer.current) clearTimeout(wsAudioFlushTimer.current);
            wsAudioChunks.current = [];
            try { player.pause(); } catch (_) {}

            await recorder.prepareToRecordAsync();
            recorder.record();
            setIsRecording(true);
            setAgentState('listening');
        } catch (e) {
            console.error('[ExploreScreen] Recording start error:', e);
        }
    };

    const stopRecordingAndSend = async () => {
        if (!isRecording) return;
        setIsRecording(false);
        setAgentState('thinking');
        try {
            await recorder.stop();
            await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true });

            const uri = recorder.uri;
            if (!uri || wsRef.current?.readyState !== WebSocket.OPEN) {
                setAgentState('idle');
                return;
            }

            // Read audio file as base64 and send in chunks
            const b64 = await FileSystem.readAsStringAsync(uri, { encoding: 'base64' });

            let audioB64 = b64;
            if (Platform.OS === 'ios') {
                // WAV file produced by LINEARPCM recorder: strip header to get raw PCM
                // ElevenLabs user_audio_chunk expects raw 16kHz 16-bit mono PCM (pcm_16000)
                const binStr = atob(b64);
                const bytes = new Uint8Array(binStr.length);
                for (let i = 0; i < binStr.length; i++) bytes[i] = binStr.charCodeAt(i);
                const dataStart = findPcmDataOffset(bytes);
                const pcm = bytes.slice(dataStart);
                let pcmBin = '';
                for (let i = 0; i < pcm.length; i++) pcmBin += String.fromCharCode(pcm[i]);
                audioB64 = btoa(pcmBin);
            }

            const WS_CHUNK = 32768;
            for (let i = 0; i < audioB64.length; i += WS_CHUNK) {
                if (wsRef.current?.readyState === WebSocket.OPEN) {
                    wsRef.current.send(JSON.stringify({ user_audio_chunk: audioB64.slice(i, i + WS_CHUNK) }));
                }
            }

            // Append 1.2s of PCM silence so ElevenLabs VAD detects end-of-speech
            if (Platform.OS === 'ios' && wsRef.current?.readyState === WebSocket.OPEN) {
                const silenceBytes = new Uint8Array(38400); // 1.2s × 16000Hz × 2bytes
                let silenceBin = '';
                for (let i = 0; i < silenceBytes.length; i++) silenceBin += String.fromCharCode(silenceBytes[i]);
                wsRef.current.send(JSON.stringify({ user_audio_chunk: btoa(silenceBin) }));
            }

            FileSystem.deleteAsync(uri, { idempotent: true }).catch(() => {});
        } catch (e) {
            console.error('[ExploreScreen] Recording send error:', e);
            setAgentState('idle');
        }
    };

    // ── Text message send ─────────────────────────────────────────────────
    const sendTextMessage = () => {
        const text = inputText.trim();
        if (!text || wsRef.current?.readyState !== WebSocket.OPEN) return;
        addMessage('user', text);
        wsRef.current.send(JSON.stringify({ type: 'user_message', text }));
        setInputText('');
        setAgentState('thinking');
    };

    // ── Reconnect ─────────────────────────────────────────────────────────
    const reconnect = () => {
        connectionAttempted.current = false;
        // Reset first-narration guard so Carolina greets again after reconnect.
        contextSentRef.current = false;
        wsRef.current?.close();
        wsRef.current = null;
        setMessages([]);
        setLastAgentText('');
        setAgentState('idle');
        wsAudioChunks.current = [];
        connectToAgent();
    };

    // ── Mode switch ───────────────────────────────────────────────────────
    const switchMode = (newMode: Mode) => {
        setMode(newMode);
        Animated.spring(mapHeightAnim, {
            toValue: newMode === 'voice' ? height * 0.52 : height * 0.28,
            useNativeDriver: false, tension: 80, friction: 10,
        }).start();
    };

    // ── Derived UI ────────────────────────────────────────────────────────
    const cardinal = headingToCardinal(heading);
    const arrow = headingToArrow(heading);
    // iOS reporta accuracy como entero 1 (mejor) / 3 (peor); Android en grados.
    const lowAccuracy = headingAccuracy !== null &&
        (Platform.OS === 'ios' ? headingAccuracy > 1 : headingAccuracy > 15);
    const neighborhood = locationContext
        ? locationContext.address.suburb || locationContext.address.city_district || locationContext.address.city || ''
        : '';

    const wsColor = wsStatus === 'connected' ? '#4CAF50'
        : wsStatus === 'connecting' ? '#FF9800'
        : '#F44336';

    const agentLabel = isRecording ? '🎙️ Grabando...'
        : agentState === 'speaking' ? '🔊 Hablando...'
        : agentState === 'thinking' ? '💭 Procesando...'
        : wsStatus === 'connecting' ? '⏳ Conectando...'
        : wsStatus === 'connected' ? '🧭 Listo'
        : wsStatus === 'error' ? '❌ Error' : '🔌 Desconectado';

    const agentIcon = isRecording ? '🎙️'
        : agentState === 'speaking' ? '🔊'
        : agentState === 'thinking' ? '💭'
        : wsStatus === 'connecting' ? '⏳'
        : wsStatus === 'connected' ? '🧭' : '🔌';

    const initialRegion = location
        ? { latitude: location.latitude, longitude: location.longitude, latitudeDelta: 0.003, longitudeDelta: 0.003 }
        : { latitude: 40.4168, longitude: -3.7038, latitudeDelta: 0.05, longitudeDelta: 0.05 };

    // Cámara y marker según modo:
    //  - 'north'   → mapa fijo al norte, flecha del marker rota con heading.
    //  - 'compass' → mapa rota siguiendo al usuario, marker fijo apuntando arriba.
    const cameraHeading = mapMode === 'compass' ? mapHeading : 0;
    const markerRotation = mapMode === 'compass' ? 0 : heading;

    const toggleMapMode = () => {
        const next = mapMode === 'north' ? 'compass' : 'north';
        setMapMode(next);
        AsyncStorage.setItem('@mapMode', next).catch(() => {});
    };

    return (
        <KeyboardAvoidingView style={[styles.root, { backgroundColor: c.background }]}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>

            {/* ── MAP ── */}
            <Animated.View style={[styles.mapContainer, { height: mapHeightAnim }]}>
                <MapView ref={mapRef} style={styles.map} initialRegion={initialRegion}
                    showsUserLocation={false} showsCompass={false}
                    camera={location ? { center: location, heading: cameraHeading, pitch: 0, zoom: 17, altitude: 500 } : undefined}>
                    {location && (
                        <Marker coordinate={location} anchor={{ x: 0.5, y: 0.5 }} flat rotation={markerRotation}>
                            <View style={styles.userMarker}>
                                <View style={styles.userMarkerDot} />
                                <View style={styles.userMarkerArrow} />
                            </View>
                        </Marker>
                    )}
                </MapView>

                <SafeAreaView style={styles.mapOverlay} edges={['top']}>
                    <TouchableOpacity style={[styles.overlayBtn, { backgroundColor: c.surface }]}
                        onPress={() => navigation.goBack()}>
                        <Text style={[styles.overlayBtnText, { color: c.text }]}>← Volver</Text>
                    </TouchableOpacity>
                    <View style={[styles.modeToggle, { backgroundColor: c.surface }]}>
                        <TouchableOpacity style={[styles.modeBtn, mode === 'voice' && styles.modeBtnActive]}
                            onPress={() => switchMode('voice')}>
                            <Text style={styles.modeBtnText}>🎤</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.modeBtn, mode === 'text' && styles.modeBtnActive]}
                            onPress={() => switchMode('text')}>
                            <Text style={styles.modeBtnText}>💬</Text>
                        </TouchableOpacity>
                    </View>
                </SafeAreaView>

                {/* Toggle norte / brújula (flotante, esquina superior derecha) */}
                <SafeAreaView style={styles.mapModeToggleWrapper} edges={['top']} pointerEvents="box-none">
                    <TouchableOpacity
                        style={[styles.mapModeBtn, { backgroundColor: c.surface }]}
                        onPress={toggleMapMode}
                        activeOpacity={0.8}
                    >
                        <Text style={styles.mapModeBtnIcon}>
                            {mapMode === 'north' ? '🧭' : '⬆️'}
                        </Text>
                    </TouchableOpacity>
                </SafeAreaView>

                {!locationReady && (
                    <View style={styles.mapLoadingOverlay}>
                        <ActivityIndicator size="large" color="#fff" />
                        <Text style={styles.mapLoadingText}>Obteniendo GPS…</Text>
                    </View>
                )}
            </Animated.View>

            {/* ── BOTTOM PANEL ── */}
            <Animated.View style={[styles.panel, { backgroundColor: c.background, opacity: fadeAnim }]}>
                {permissionError ? (
                    <View style={styles.centerState}>
                        <Text style={styles.bigEmoji}>🔒</Text>
                        <Text style={[styles.stateTitle, { color: c.text }]}>Permiso de ubicación necesario</Text>
                    </View>
                ) : mode === 'voice' ? (
                    // ════ VOICE MODE ════
                    <View style={styles.voicePanel}>
                        {/* Status row */}
                        <View style={styles.statusRow}>
                            <View style={[styles.headingBadge, { backgroundColor: c.primaryLight, borderColor: c.primary }]}>
                                <Text style={[styles.headingArrow, { color: c.primary }]}>{arrow}</Text>
                                <Text style={[styles.headingLabel, { color: c.primary }]}>{cardinal} {heading}°</Text>
                            </View>
                            <View style={[styles.wsBadge, { backgroundColor: wsColor + '22' }]}>
                                <View style={[styles.wsDot, { backgroundColor: wsColor }]} />
                                <Text style={[styles.wsText, { color: wsColor }]}>
                                    {wsStatus === 'connected' ? (neighborhood || 'Conectado')
                                        : wsStatus === 'connecting' ? 'Conectando...'
                                        : wsStatus === 'error' ? 'Error' : 'Desconectado'}
                                </Text>
                            </View>
                            {(wsStatus === 'disconnected' || wsStatus === 'error') && (
                                <TouchableOpacity style={styles.reconnectBtn} onPress={reconnect}>
                                    <Text style={styles.reconnectText}>↺</Text>
                                </TouchableOpacity>
                            )}
                        </View>

                        {/* Agent circle */}
                        <View style={styles.agentStateContainer}>
                            <Animated.View style={[styles.agentCircle,
                                { transform: [{ scale: agentPulseAnim }] },
                                agentState === 'speaking' && { borderColor: '#FF6B35' },
                                agentState === 'listening' && { borderColor: '#4CAF50' },
                                agentState === 'thinking' && { borderColor: '#FF9800' },
                                (agentState === 'idle' || wsStatus !== 'connected') && { borderColor: c.border },
                            ]}>
                                <Text style={styles.agentCircleIcon}>{agentIcon}</Text>
                            </Animated.View>
                            <Text style={[styles.agentLabel, { color: c.textSecondary }]}>{agentLabel}</Text>
                        </View>

                        {/* Last message / connecting messages */}
                        <View style={[styles.speechBubble, { backgroundColor: c.surface, borderColor: c.border }]}>
                            {wsStatus === 'connecting' ? (
                                <>
                                    <ActivityIndicator size="small" color={c.primary} style={{ marginBottom: 6 }} />
                                    <Text style={[styles.speechText, { color: c.textSecondary, fontStyle: 'italic', textAlign: 'center' }]}>
                                        {connectingMessage}
                                    </Text>
                                </>
                            ) : lastAgentText ? (
                                <Text style={[styles.speechText, { color: c.text }]} numberOfLines={4}>
                                    {lastAgentText}
                                </Text>
                            ) : (
                                <Text style={[styles.speechText, { color: c.textTertiary, textAlign: 'center' }]}>
                                    {wsStatus === 'connected'
                                        ? 'Mantén pulsado el micrófono para hablar con Carolina…'
                                        : wsStatus === 'error' || wsStatus === 'disconnected'
                                        ? 'Pulsa ↺ para reconectar'
                                        : ''}
                                </Text>
                            )}
                        </View>

                        {/* Mic button */}
                        <TouchableOpacity
                            style={[styles.micButton,
                                isRecording && styles.micButtonActive,
                                wsStatus !== 'connected' && styles.micButtonDisabled,
                            ]}
                            onPressIn={startRecording}
                            onPressOut={stopRecordingAndSend}
                            disabled={wsStatus !== 'connected'}
                            activeOpacity={0.85}
                        >
                            <Text style={styles.micIcon}>{isRecording ? '🔴' : '🎤'}</Text>
                            <Text style={styles.micLabel}>
                                {isRecording ? 'Suelta para enviar' : 'Mantén para hablar'}
                            </Text>
                        </TouchableOpacity>
                    </View>

                ) : (
                    // ════ TEXT MODE ════
                    <View style={styles.textPanel}>
                        <View style={styles.textStatusBar}>
                            <View style={[styles.locationBadge, { backgroundColor: c.surface }]}>
                                <Text style={[styles.locationBadgeText, { color: c.text }]} numberOfLines={1}>
                                    📍 {neighborhood || (wsStatus === 'connecting' ? 'Localizando...' : 'Sin ubicación')}
                                </Text>
                            </View>
                            <View style={[styles.wsBadge, { backgroundColor: wsColor + '22' }]}>
                                <View style={[styles.wsDot, { backgroundColor: wsColor }]} />
                            </View>
                            {(wsStatus === 'disconnected' || wsStatus === 'error') && (
                                <TouchableOpacity style={styles.reconnectBtn} onPress={reconnect}>
                                    <Text style={styles.reconnectText}>↺</Text>
                                </TouchableOpacity>
                            )}
                        </View>

                        <ScrollView ref={messagesEndRef} style={styles.messagesScroll}
                            contentContainerStyle={styles.messagesContent} showsVerticalScrollIndicator={false}>
                            {messages.length === 0 && (
                                <View style={styles.emptyChatHint}>
                                    {wsStatus === 'connecting' ? (
                                        <>
                                            <ActivityIndicator size="small" color={c.primary} />
                                            <Text style={[styles.emptyChatText, { color: c.textSecondary, fontStyle: 'italic' }]}>
                                                {connectingMessage || 'Conectando con Carolina…'}
                                            </Text>
                                        </>
                                    ) : wsStatus === 'connected' ? (
                                        <Text style={[styles.emptyChatText, { color: c.textSecondary }]}>
                                            Escribe una pregunta para empezar…
                                        </Text>
                                    ) : (
                                        <Text style={[styles.emptyChatText, { color: '#F44336' }]}>
                                            Sin conexión. Pulsa ↺ para reconectar.
                                        </Text>
                                    )}
                                </View>
                            )}
                            {messages.map((msg) => (
                                <View key={msg.id} style={[styles.messageBubble,
                                    msg.role === 'user' ? styles.userBubble : styles.agentBubble]}>
                                    {msg.role === 'agent' && <Text style={styles.bubbleAvatar}>🧭</Text>}
                                    <View style={[styles.bubbleBody,
                                        msg.role === 'user'
                                            ? { backgroundColor: '#FF6B35' }
                                            : { backgroundColor: c.surface, borderColor: c.border, borderWidth: 1 }]}>
                                        <Text style={[styles.bubbleText,
                                            { color: msg.role === 'user' ? '#fff' : c.text }]}>
                                            {msg.text}
                                        </Text>
                                    </View>
                                </View>
                            ))}
                            {agentState === 'thinking' && (
                                <View style={[styles.messageBubble, styles.agentBubble]}>
                                    <Text style={styles.bubbleAvatar}>🧭</Text>
                                    <View style={[styles.bubbleBody, { backgroundColor: c.surface, borderColor: c.border, borderWidth: 1 }]}>
                                        <ActivityIndicator size="small" color={c.primary} />
                                    </View>
                                </View>
                            )}
                        </ScrollView>

                        <View style={[styles.inputRow, { borderTopColor: c.border, backgroundColor: c.background }]}>
                            <TextInput
                                style={[styles.textInput, { backgroundColor: c.surface, color: c.text, borderColor: c.border }]}
                                value={inputText}
                                onChangeText={setInputText}
                                placeholder={lang === 'es' ? 'Escribe tu pregunta…' : 'Type your question…'}
                                placeholderTextColor={c.textTertiary}
                                returnKeyType="send"
                                onSubmitEditing={sendTextMessage}
                                editable={wsStatus === 'connected'}
                            />
                            <TouchableOpacity
                                style={[styles.sendBtn,
                                    { backgroundColor: inputText.trim() && wsStatus === 'connected' ? '#FF6B35' : c.border }]}
                                onPress={sendTextMessage}
                                disabled={!inputText.trim() || wsStatus !== 'connected'}
                            >
                                <Text style={styles.sendBtnText}>→</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                )}
            </Animated.View>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1 },
    // Map
    mapContainer: { position: 'relative', overflow: 'hidden' },
    map: { ...StyleSheet.absoluteFillObject },
    mapOverlay: {
        position: 'absolute', top: 0, left: 0, right: 0,
        flexDirection: 'row', justifyContent: 'space-between',
        alignItems: 'center', paddingHorizontal: 16, paddingBottom: 8,
    },
    overlayBtn: {
        paddingHorizontal: 14, paddingVertical: 9, borderRadius: 20,
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 6, elevation: 4,
    },
    overlayBtnText: { fontSize: 14, fontWeight: '600' },
    modeToggle: { flexDirection: 'row', borderRadius: 20, padding: 3,
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 6, elevation: 4 },
    modeBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 17 },
    modeBtnActive: { backgroundColor: '#FF6B35' },
    modeBtnText: { fontSize: 16 },
    mapLoadingOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.45)',
        alignItems: 'center', justifyContent: 'center', gap: 12 },
    mapLoadingText: { color: '#fff', fontSize: 15, fontWeight: '600' },
    mapModeToggleWrapper: {
        position: 'absolute', top: 0, right: 0,
        paddingTop: 56, paddingRight: 16,
        zIndex: 10,
    },
    mapModeBtn: {
        width: 40, height: 40, borderRadius: 20,
        alignItems: 'center', justifyContent: 'center',
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15, shadowRadius: 6, elevation: 4,
    },
    mapModeBtnIcon: { fontSize: 18 },
    userMarker: { alignItems: 'center' },
    userMarkerDot: { width: 18, height: 18, borderRadius: 9, backgroundColor: '#007AFF',
        borderWidth: 3, borderColor: '#fff', shadowColor: '#007AFF',
        shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.6, shadowRadius: 6, elevation: 6 },
    userMarkerArrow: { width: 0, height: 0, borderLeftWidth: 5, borderRightWidth: 5,
        borderBottomWidth: 10, borderLeftColor: 'transparent', borderRightColor: 'transparent',
        borderBottomColor: '#007AFF', marginTop: -2 },
    // Panel
    panel: { flex: 1, borderTopLeftRadius: 22, borderTopRightRadius: 22, marginTop: -18,
        shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.08,
        shadowRadius: 12, elevation: 10, overflow: 'hidden' },
    // Voice panel
    voicePanel: { flex: 1, paddingHorizontal: 20, paddingTop: 18, paddingBottom: 12 },
    statusRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14, flexWrap: 'wrap' },
    headingBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12,
        paddingVertical: 7, borderRadius: 20, borderWidth: 1.5, gap: 5 },
    headingArrow: { fontSize: 16, fontWeight: '700' },
    headingLabel: { fontSize: 14, fontWeight: '700' },
    wsBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10,
        paddingVertical: 7, borderRadius: 20, gap: 5 },
    wsDot: { width: 8, height: 8, borderRadius: 4 },
    wsText: { fontSize: 13, fontWeight: '600' },
    reconnectBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#EEE',
        alignItems: 'center', justifyContent: 'center' },
    reconnectText: { fontSize: 18 },
    agentStateContainer: { alignItems: 'center', marginBottom: 14 },
    agentCircle: { width: 72, height: 72, borderRadius: 36, borderWidth: 3,
        alignItems: 'center', justifyContent: 'center',
        shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.12, shadowRadius: 8, elevation: 6 },
    agentCircleIcon: { fontSize: 32 },
    agentLabel: { fontSize: 13, fontWeight: '500', marginTop: 6 },
    speechBubble: { borderRadius: 16, borderWidth: 1, padding: 14, marginBottom: 14,
        minHeight: 64, justifyContent: 'center' },
    speechText: { fontSize: 14, lineHeight: 21 },
    micButton: { backgroundColor: '#FF6B35', borderRadius: 22, paddingVertical: 18,
        alignItems: 'center', justifyContent: 'center', gap: 4, marginTop: 'auto' as any,
        shadowColor: '#FF6B35', shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.4, shadowRadius: 14, elevation: 8 },
    micButtonActive: { backgroundColor: '#D32F2F', shadowColor: '#D32F2F' },
    micButtonDisabled: { backgroundColor: '#CCC', shadowColor: 'transparent' },
    micIcon: { fontSize: 28 },
    micLabel: { color: '#fff', fontSize: 14, fontWeight: '700' },
    // Text panel
    textPanel: { flex: 1, paddingTop: 12 },
    textStatusBar: { flexDirection: 'row', alignItems: 'center', gap: 8,
        paddingHorizontal: 16, marginBottom: 8, flexWrap: 'wrap' },
    locationBadge: { flex: 1, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 16, maxWidth: '75%' },
    locationBadgeText: { fontSize: 13, fontWeight: '600' },
    messagesScroll: { flex: 1, paddingHorizontal: 16 },
    messagesContent: { paddingTop: 4, paddingBottom: 12, gap: 10 },
    emptyChatHint: { alignItems: 'center', paddingTop: 32, gap: 10 },
    emptyChatText: { fontSize: 14, textAlign: 'center' },
    messageBubble: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
    userBubble: { justifyContent: 'flex-end' },
    agentBubble: { justifyContent: 'flex-start' },
    bubbleAvatar: { fontSize: 20, marginBottom: 2 },
    bubbleBody: { maxWidth: '78%', borderRadius: 18, paddingHorizontal: 14, paddingVertical: 10 },
    bubbleText: { fontSize: 15, lineHeight: 22 },
    inputRow: { flexDirection: 'row', alignItems: 'center', gap: 10,
        paddingHorizontal: 14, paddingVertical: 10, borderTopWidth: StyleSheet.hairlineWidth },
    textInput: { flex: 1, borderRadius: 22, borderWidth: 1, paddingHorizontal: 16,
        paddingVertical: 10, fontSize: 15, maxHeight: 80 },
    sendBtn: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
    sendBtnText: { color: '#fff', fontSize: 20, fontWeight: '700' },
    // States
    centerState: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24, gap: 12 },
    bigEmoji: { fontSize: 48 },
    stateTitle: { fontSize: 18, fontWeight: '700', textAlign: 'center' },
});
