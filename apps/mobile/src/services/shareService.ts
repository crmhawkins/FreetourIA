import { Share } from 'react-native';
import * as Linking from 'expo-linking';

interface RouteShareData {
    id: string;
    name: string;
    description: string;
    city: string;
}

class ShareService {
    private createDeepLink(path: string): string {
        return Linking.createURL(path);
    }

    async shareRoute(route: RouteShareData): Promise<void> {
        const deepLink = this.createDeepLink(`/route/${route.id}`);

        const message = [
            `🌍 ${route.name}`,
            `📍 ${route.city}`,
            '',
            route.description,
            '',
            `👉 Descubre esta ruta gratis con FreeTour IA`,
            deepLink,
        ].join('\n');

        await this.share(route.name, message);
    }

    async shareCompletion(routeName: string, city: string, pointsCount: number): Promise<void> {
        const deepLink = this.createDeepLink('/');

        const message = [
            `🎉 ¡He completado el tour "${routeName}"!`,
            '',
            `📍 ${city}`,
            `📸 ${pointsCount} puntos visitados`,
            '',
            `⭐ Una experiencia increíble con FreeTour IA`,
            `👉 Descarga la app gratis: ${deepLink}`,
        ].join('\n');

        await this.share(`Tour completado: ${routeName}`, message);
    }

    async shareRating(routeName: string, city: string, rating: number): Promise<void> {
        const stars = '⭐'.repeat(rating);
        const deepLink = this.createDeepLink('/');

        const message = [
            `${stars}`,
            `He valorado "${routeName}" en ${city} con ${rating}/5 estrellas`,
            '',
            `🌍 Descubre rutas turísticas gratuitas con FreeTour IA`,
            `👉 ${deepLink}`,
        ].join('\n');

        await this.share(`Mi valoración de ${routeName}`, message);
    }

    private async share(title: string, message: string): Promise<void> {
        try {
            await Share.share(
                { message, title },
                { dialogTitle: title }
            );
        } catch (error: any) {
            // User cancelled or share failed — not an error
            if (error?.message !== 'User did not share') {
                console.error('Share error:', error);
            }
        }
    }
}

const shareService = new ShareService();
export default shareService;
