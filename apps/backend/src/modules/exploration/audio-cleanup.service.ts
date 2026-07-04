import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { AiConfigService } from '../../config/ai-config.service';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Audio Cleanup Service
 *
 * Generated TTS mp3 files accumulate in AUDIO_STORAGE_PATH and are never
 * consumed again after the client has played them. Left unchecked they fill the
 * disk. This service deletes any `.mp3` older than MAX_AGE_MS on a fixed
 * interval (and once at startup), with per-file error isolation so a single
 * unreadable/locked file never aborts the sweep.
 */
@Injectable()
export class AudioCleanupService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AudioCleanupService.name);
  private timer: NodeJS.Timeout | null = null;

  private static readonly SWEEP_INTERVAL_MS = 60 * 60 * 1000; // 1 hour
  private static readonly MAX_AGE_MS = 6 * 60 * 60 * 1000; // 6 hours

  constructor(private readonly aiConfig: AiConfigService) {}

  onModuleInit(): void {
    // Sweep once at startup to clear anything left over from a previous run.
    this.cleanup();

    this.timer = setInterval(
      () => this.cleanup(),
      AudioCleanupService.SWEEP_INTERVAL_MS,
    );
    // Don't keep the process alive just for this timer.
    if (typeof this.timer.unref === 'function') {
      this.timer.unref();
    }
    this.logger.log('AudioCleanupService initialised (sweep every 1h, TTL 6h)');
  }

  onModuleDestroy(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  /**
   * Deletes every `.mp3` in the audio storage directory whose mtime is older
   * than MAX_AGE_MS. Safe to call on startup and on the interval. Never throws.
   */
  cleanup(): void {
    const dir = path.resolve(this.aiConfig.getAudioStoragePath());
    let files: string[];
    try {
      files = fs.readdirSync(dir);
    } catch (err) {
      // Directory may not exist yet on a cold start — nothing to clean.
      this.logger.debug(`Audio cleanup skipped (cannot read ${dir}): ${(err as Error).message}`);
      return;
    }

    const now = Date.now();
    let removed = 0;
    for (const file of files) {
      if (!file.toLowerCase().endsWith('.mp3')) continue;
      const filepath = path.join(dir, file);
      try {
        const stat = fs.statSync(filepath);
        if (now - stat.mtimeMs > AudioCleanupService.MAX_AGE_MS) {
          fs.unlinkSync(filepath);
          removed++;
        }
      } catch (err) {
        // Per-file isolation: skip locked/already-removed files.
        this.logger.debug(`Could not remove ${file}: ${(err as Error).message}`);
      }
    }

    if (removed > 0) {
      this.logger.log(`Audio cleanup removed ${removed} old mp3 file(s) from ${dir}`);
    }
  }
}
