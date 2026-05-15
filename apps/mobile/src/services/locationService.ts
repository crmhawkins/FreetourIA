import * as Location from 'expo-location';

class LocationService {
    async requestPermissions(): Promise<boolean> {
        const { status } = await Location.requestForegroundPermissionsAsync();
        return status === 'granted';
    }

    async getCurrentLocation(): Promise<{ latitude: number; longitude: number } | null> {
        try {
            const hasPermission = await this.requestPermissions();
            if (!hasPermission) return null;

            const location = await Location.getCurrentPositionAsync({
                accuracy: Location.Accuracy.Balanced, // Saves battery vs High
            });

            return {
                latitude: location.coords.latitude,
                longitude: location.coords.longitude,
            };
        } catch (error) {
            // Try lower accuracy as fallback
            try {
                const location = await Location.getLastKnownPositionAsync();
                if (location) {
                    return {
                        latitude: location.coords.latitude,
                        longitude: location.coords.longitude,
                    };
                }
            } catch {}
            return null;
        }
    }

    async detectCity(lat: number, lon: number): Promise<string | null> {
        try {
            const result = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lon });
            if (result.length > 0) {
                return result[0].city || result[0].district || result[0].region || null;
            }
            return null;
        } catch (error) {
            console.error('Error detecting city:', error);
            return null;
        }
    }
}

export default new LocationService();
