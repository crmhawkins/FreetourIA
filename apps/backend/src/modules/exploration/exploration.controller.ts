import { Controller, Post, Body, HttpCode, Logger } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { ExplorationService } from './exploration.service';
import { IdentifyDto } from './dto/identify.dto';
import { ContextDto } from './dto/context.dto';
import { SpeakDto } from './dto/speak.dto';

@SkipThrottle()
@Controller('exploration')
export class ExplorationController {
  private readonly logger = new Logger(ExplorationController.name);

  constructor(private readonly explorationService: ExplorationService) {}

  /** POST /exploration/identify — legacy single-shot narration */
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
  @Post('agent-token')
  @HttpCode(200)
  async getAgentToken() {
    return this.explorationService.getAgentToken();
  }
}
