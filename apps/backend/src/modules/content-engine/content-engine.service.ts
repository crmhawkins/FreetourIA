import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * ContentEngineService manages cached content for Points of Interest.
 * It retrieves existing speeches/audios and coordinates with AI service
 * when new content needs to be generated.
 */
@Injectable()
export class ContentEngineService {
    constructor(private prisma: PrismaService) { }

    /**
     * Get speech content for a specific POI
     * Returns cached content if available, otherwise returns null
     * (caller should trigger AI generation)
     */
    async getSpeech(
        pointId: string,
        language: string,
        experienceType: string,
    ) {
        const cached = await this.prisma.contentCache.findUnique({
            where: {
                pointId_language_experienceType: {
                    pointId,
                    language,
                    experienceType,
                },
            },
        });

        return cached;
    }

    /**
     * Store generated speech content
     */
    async cacheSpeech(
        pointId: string,
        language: string,
        experienceType: string,
        textContent: string,
        audioUrl?: string,
    ) {
        return this.prisma.contentCache.upsert({
            where: {
                pointId_language_experienceType: {
                    pointId,
                    language,
                    experienceType,
                },
            },
            update: {
                textContent,
                ...(audioUrl ? { audioUrl } : {}),
            },
            create: {
                pointId,
                language,
                experienceType,
                textContent,
                audioUrl,
            },
        });
    }

    /**
     * Get all cached languages for a POI and experience type
     */
    async getAvailableLanguages(pointId: string, experienceType: string) {
        const cached = await this.prisma.contentCache.findMany({
            where: { pointId, experienceType },
            select: { language: true },
        });
        return cached.map((c) => c.language);
    }

    /**
     * Update audio URL for existing cached content
     */
    async updateAudioUrl(cacheId: string, audioUrl: string) {
        return this.prisma.contentCache.update({
            where: { id: cacheId },
            data: { audioUrl },
        });
    }
}
