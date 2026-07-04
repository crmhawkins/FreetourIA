import { Controller, Post, Body, HttpCode, Logger } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ExplorationService } from './exploration.service';
import { IdentifyDto } from './dto/identify.dto';
import { ContextDto } from './dto/context.dto';
import { SpeakDto } from './dto/speak.dto';

// The global ThrottlerModule registers three named throttlers (short/medium/long).
// A request must pass ALL of them, so to enforce a single per-endpoint budget we
// override every named throttler to the same limit/ttl. The endpoints are called
// without auth by the installed app, so rate-limiting per real client IP (see
// `trust proxy` in main.ts) is the abuse protection.
const CONTEXT_THROTTLE = {
  short: { limit: 40, ttl: 60000 },
  medium: { limit: 40, ttl: 60000 },
  long: { limit: 40, ttl: 60000 },
};
const STRICT_THROTTLE = {
  short: { limit: 10, ttl: 60000 },
  medium: { limit: 10, ttl: 60000 },
  long: { limit: 10, ttl: 60000 },
};

@Controller('exploration')
export class ExplorationController {
  private readonly logger = new Logger(ExplorationController.name);

  constructor(private readonly explorationService: ExplorationService) {}

  /** POST /exploration/identify — legacy single-shot narration */
  @Throttle(STRICT_THROTTLE)
  @Post('identify')
  @HttpCode(200)
  async identify(@Body() dto: IdentifyDto) {
    this.logger.log(`POST /exploration/identify — lat=${dto.latitude}, lon=${dto.longitude}`);
    return this.explorationService.identify(dto);
  }

  /**
   * POST /exploration/context
   * Returns enriched location context (Nominatim + Overpass) for ElevenLabs agent injection.
   * Body: { latitude, longitude, heading, language }
   */
  @Throttle(CONTEXT_THROTTLE)
  @Post('context')
  @HttpCode(200)
  async getContext(@Body() dto: ContextDto) {
    this.logger.log(`POST /exploration/context — lat=${dto.latitude}, lon=${dto.longitude}`);
    return this.explorationService.getContext(dto);
  }

  /**
   * POST /exploration/speak
   * Converts text to speech and returns an audio URL.
   * Body: { text, language }
   */
  @Throttle(STRICT_THROTTLE)
  @Post('speak')
  @HttpCode(200)
  async speak(@Body() dto: SpeakDto) {
    this.logger.log(`POST /exploration/speak — lang=${dto.language}, chars=${dto.text.length}`);
    return this.explorationService.speak(dto);
  }

  /**
   * GET /exploration/agent-token
   * Returns a signed ElevenLabs conversation URL for the mobile client.
   */
  @Throttle(STRICT_THROTTLE)
  @Post('agent-token')
  @HttpCode(200)
  async getAgentToken() {
    return this.explorationService.getAgentToken();
  }
}
