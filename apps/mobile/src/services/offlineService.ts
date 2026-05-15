import AsyncStorage from '@react-native-async-storage/async-storage';
import apiClient from './apiClient';

interface OfflineRoute {
    route: any;
    speeches: Record<string, string>; // pointId -> speech text
    downloadedAt: number;
}

class OfflineService {
    private readonly STORAGE_KEY = 'offline_routes';

    async downloadRoute(
        routeId: string,
        experienceType: string = 'CLASSIC',
        language: string = 'es',
        onProgress?: (current: number, total: number) => void,
    ): Promise<OfflineRoute> {
        // Get full route with points
        const routeResponse = await apiClient.get(`/routes/${routeId}`);
        const route = routeResponse.data;

        const speeches: Record<string, string> = {};
        const points = route.points || [];

        // Download speech for each point
        for (let i = 0; i < points.length; i++) {
            const point = points[i];
            onProgress?.(i + 1, points.length);

            try {
                const speechResponse = await apiClient.post('/ai/speech', {
                    pointId: point.id,
                    pointName: point.name,
                    pointDescription: point.description || '',
                    city: route.city,
                    experienceType: experienceType.toUpperCase(),
                    language,
                });

                if (speechResponse.data.text) {
                    speeches[point.id] = speechResponse.data.text;
                }
            } catch (error) {
                console.error(`Error downloading speech for ${point.name}:`, error);
                // Continue with remaining points even if one fails
            }
        }

        const offlineData: OfflineRoute = {
            route,
            speeches,
            downloadedAt: Date.now(),
        };

        // Save to local storage
        const existing = await this.getAllDownloaded();
        existing[routeId] = offlineData;
        await AsyncStorage.setItem(this.STORAGE_KEY, JSON.stringify(existing));

        return offlineData;
    }

    async getAllDownloaded(): Promise<Record<string, OfflineRoute>> {
        try {
            const data = await AsyncStorage.getItem(this.STORAGE_KEY);
            return data ? JSON.parse(data) : {};
        } catch {
            return {};
        }
    }

    async getDownloadedRoute(routeId: string): Promise<OfflineRoute | null> {
        const all = await this.getAllDownloaded();
        return all[routeId] || null;
    }

    async isDownloaded(routeId: string): Promise<boolean> {
        const route = await this.getDownloadedRoute(routeId);
        return route !== null;
    }

    async removeDownloaded(routeId: string): Promise<void> {
        const all = await this.getAllDownloaded();
        delete all[routeId];
        await AsyncStorage.setItem(this.STORAGE_KEY, JSON.stringify(all));
    }

    async getSpeechForPoint(routeId: string, pointId: string): Promise<string | null> {
        const route = await this.getDownloadedRoute(routeId);
        return route?.speeches[pointId] || null;
    }
}

export default new OfflineService();
