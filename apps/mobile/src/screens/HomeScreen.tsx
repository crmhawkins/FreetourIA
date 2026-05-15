import React, { useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ActivityIndicator,
    Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useStore } from '../store/useStore';
import { useTheme } from '../theme/theme';
import locationService from '../services/locationService';
import { useFocusEffect } from '@react-navigation/native';

export default function HomeScreen({ navigation }: any) {
    const { t } = useTranslation();
    const { currentCity, setCurrentCity, user } = useStore();
    const theme = useTheme();
    const c = theme.colors;
    const [loading, setLoading] = React.useState(false);
    const [error, setError] = React.useState(false);

    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(40)).current;
    const scaleAnim = useRef(new Animated.Value(0.92)).current;
    const pulseAnim = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.timing(fadeAnim, { toValue: 1, duration: 700, useNativeDriver: true }),
            Animated.spring(slideAnim, { toValue: 0, tension: 80, friction: 10, useNativeDriver: true }),
            Animated.spring(scaleAnim, { toValue: 1, tension: 80, friction: 10, useNativeDriver: true }),
        ]).start();
    }, []);

    // Pulse animation for location dot
    useEffect(() => {
        if (loading) {
            Animated.loop(
                Animated.sequence([
                    Animated.timing(pulseAnim, { toValue: 1.3, duration: 700, useNativeDriver: true }),
                    Animated.timing(pulseAnim, { toValue: 1, duration: 700, useNativeDriver: true }),
                ])
            ).start();
        } else {
            pulseAnim.setValue(1);
        }
    }, [loading]);

    useFocusEffect(
        React.useCallback(() => {
            if (!currentCity) {
                detectCurrentCity();
            }
        }, [currentCity])
    );

    const detectCurrentCity = async () => {
        setLoading(true);
        setError(false);
        const location = await locationService.getCurrentLocation();
        if (location) {
            const city = await locationService.detectCity(location.latitude, location.longitude);
            if (city) {
                setCurrentCity(city);
                setLoading(false);
                return;
            }
        }
        setError(true);
        setLoading(false);
    };

    const greeting = user?.name
        ? t('welcomeBack', 'Bienvenido') + ', ' + user.name.split(' ')[0]
        : t('welcomeGuest', 'Bienvenido');

    return (
        <View style={[styles.root, { backgroundColor: c.primary }]}>
            <SafeAreaView style={styles.safeTop} edges={['top']}>
                {/* ── HERO HEADER ── */}
                <Animated.View style={[styles.hero, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
                    {/* Decorative circles */}
                    <View style={[styles.decorCircle1, { backgroundColor: 'rgba(255,255,255,0.08)' }]} />
                    <View style={[styles.decorCircle2, { backgroundColor: 'rgba(255,255,255,0.06)' }]} />

                    <Text style={styles.greeting}>{greeting}</Text>

                    <View style={styles.titleRow}>
                        <Text style={styles.titleEmoji}>🌍</Text>
                        <Text style={styles.title}>FreeTour IA</Text>
                    </View>

                    <Text style={styles.subtitle}>
                        {t('appSubtitle', 'Tu guía turístico personal con IA')}
                    </Text>
                </Animated.View>
            </SafeAreaView>

            {/* ── BOTTOM CARD ── */}
            <Animated.View
                style={[
                    styles.card,
                    { backgroundColor: c.background, opacity: fadeAnim, transform: [{ scale: scaleAnim }] },
                ]}
            >
                {loading ? (
                    <View style={styles.stateContainer}>
                        <Animated.View style={[styles.locationPulse, { transform: [{ scale: pulseAnim }], backgroundColor: c.primaryLight }]}>
                            <Text style={styles.locationEmoji}>📡</Text>
                        </Animated.View>
                        <Text style={[styles.stateTitle, { color: c.text }]}>
                            {t('detectingCity', 'Detectando tu ubicación...')}
                        </Text>
                        <Text style={[styles.stateSubtitle, { color: c.textTertiary }]}>
                            {t('detectingCityHint', 'Esto solo tarda un momento')}
                        </Text>
                        <ActivityIndicator size="small" color={c.primary} style={{ marginTop: 8 }} />
                    </View>
                ) : error ? (
                    <View style={styles.stateContainer}>
                        <View style={[styles.errorIconWrap, { backgroundColor: '#FFF0EF' }]}>
                            <Text style={styles.locationEmoji}>⚠️</Text>
                        </View>
                        <Text style={[styles.stateTitle, { color: c.text }]}>
                            {t('locationError', 'No se detectó la ubicación')}
                        </Text>
                        <Text style={[styles.stateSubtitle, { color: c.textTertiary }]}>
                            {t('locationErrorHint', 'Comprueba los permisos de localización')}
                        </Text>
                        <TouchableOpacity
                            style={[styles.retryButton, { backgroundColor: c.primary }]}
                            onPress={detectCurrentCity}
                            activeOpacity={0.85}
                        >
                            <Text style={styles.retryButtonText}>{t('retry', 'Reintentar')}</Text>
                        </TouchableOpacity>
                    </View>
                ) : currentCity ? (
                    <View style={styles.cityContainer}>
                        {/* City Badge */}
                        <View style={[styles.cityBadge, { backgroundColor: c.primaryLight }]}>
                            <Text style={styles.cityBadgePin}>📍</Text>
                            <Text style={[styles.cityName, { color: c.primary }]}>{currentCity}</Text>
                        </View>

                        <Text style={[styles.cardHint, { color: c.textSecondary }]}>
                            {t('cityDetectedHint', '¡Hay rutas disponibles en tu ciudad!')}
                        </Text>

                        {/* Primary CTA */}
                        <TouchableOpacity
                            style={[styles.exploreButton, { backgroundColor: c.primary }]}
                            onPress={() => navigation.navigate('Preferences')}
                            activeOpacity={0.85}
                        >
                            <Text style={styles.exploreButtonText}>
                                {t('start', 'Explorar rutas')} →
                            </Text>
                        </TouchableOpacity>

                        {/* Secondary CTA */}
                        <TouchableOpacity
                            style={[styles.secondaryButton, { borderColor: c.primary }]}
                            onPress={() => navigation.navigate('MainTabs', { screen: 'Routes' })}
                            activeOpacity={0.7}
                        >
                            <Text style={[styles.secondaryButtonText, { color: c.primary }]}>
                                {t('browseRoutes', 'Ver todas las rutas')}
                            </Text>
                        </TouchableOpacity>

                        {/* Modo libre */}
                        <TouchableOpacity
                            style={[styles.freeButton, { borderColor: '#FF6B35' }]}
                            onPress={() => navigation.navigate('Explore')}
                            activeOpacity={0.7}
                        >
                            <Text style={[styles.freeButtonText, { color: '#FF6B35' }]}>
                                🧭 Explorar libremente
                            </Text>
                        </TouchableOpacity>

                        {/* Feature pills */}
                        <View style={styles.featurePills}>
                            {[
                                { icon: '🎙️', label: t('featureAudio', 'Audio IA') },
                                { icon: '📶', label: t('featureOffline', 'Offline') },
                                { icon: '👥', label: t('featureGroup', 'Grupos') },
                            ].map((f) => (
                                <View key={f.label} style={[styles.pill, { backgroundColor: c.surface, borderColor: c.border }]}>
                                    <Text style={styles.pillIcon}>{f.icon}</Text>
                                    <Text style={[styles.pillLabel, { color: c.textSecondary }]}>{f.label}</Text>
                                </View>
                            ))}
                        </View>
                    </View>
                ) : (
                    // Initial state - no city yet, show prompt
                    <View style={styles.stateContainer}>
                        <View style={[styles.locationPulse, { backgroundColor: c.primaryLight }]}>
                            <Text style={styles.locationEmoji}>🧭</Text>
                        </View>
                        <Text style={[styles.stateTitle, { color: c.text }]}>
                            {t('readyToExplore', 'Listo para explorar')}
                        </Text>
                        <Text style={[styles.stateSubtitle, { color: c.textTertiary }]}>
                            {t('grantLocation', 'Activa la localización para descubrir rutas en tu ciudad')}
                        </Text>
                        <TouchableOpacity
                            style={[styles.retryButton, { backgroundColor: c.primary }]}
                            onPress={detectCurrentCity}
                            activeOpacity={0.85}
                        >
                            <Text style={styles.retryButtonText}>{t('detectLocation', 'Detectar ubicación')}</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </Animated.View>
        </View>
    );
}

const CARD_BORDER_RADIUS = 28;

const styles = StyleSheet.create({
    root: {
        flex: 1,
    },
    safeTop: {
        flex: 0,
    },
    hero: {
        paddingHorizontal: 28,
        paddingTop: 16,
        paddingBottom: 36,
        overflow: 'hidden',
    },
    decorCircle1: {
        position: 'absolute',
        width: 200,
        height: 200,
        borderRadius: 100,
        top: -60,
        right: -60,
    },
    decorCircle2: {
        position: 'absolute',
        width: 140,
        height: 140,
        borderRadius: 70,
        bottom: 10,
        left: -40,
    },
    greeting: {
        fontSize: 14,
        fontWeight: '500',
        color: 'rgba(255,255,255,0.75)',
        marginBottom: 10,
        letterSpacing: 0.3,
    },
    titleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    titleEmoji: {
        fontSize: 32,
        marginRight: 10,
    },
    title: {
        fontSize: 36,
        fontWeight: '800',
        color: '#FFFFFF',
        letterSpacing: -0.5,
    },
    subtitle: {
        fontSize: 15,
        color: 'rgba(255,255,255,0.7)',
        lineHeight: 22,
        marginTop: 4,
    },
    card: {
        flex: 1,
        borderTopLeftRadius: CARD_BORDER_RADIUS,
        borderTopRightRadius: CARD_BORDER_RADIUS,
        paddingHorizontal: 24,
        paddingTop: 32,
        paddingBottom: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 10,
    },
    // ── States ──
    stateContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 16,
    },
    locationPulse: {
        width: 80,
        height: 80,
        borderRadius: 40,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 20,
    },
    errorIconWrap: {
        width: 80,
        height: 80,
        borderRadius: 40,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 20,
    },
    locationEmoji: {
        fontSize: 36,
    },
    stateTitle: {
        fontSize: 20,
        fontWeight: '700',
        textAlign: 'center',
        marginBottom: 8,
    },
    stateSubtitle: {
        fontSize: 15,
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: 24,
    },
    retryButton: {
        paddingHorizontal: 32,
        paddingVertical: 14,
        borderRadius: 14,
    },
    retryButtonText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: '600',
    },
    // ── City detected ──
    cityContainer: {
        flex: 1,
        alignItems: 'center',
    },
    cityBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 24,
        marginBottom: 10,
    },
    cityBadgePin: {
        fontSize: 18,
        marginRight: 8,
    },
    cityName: {
        fontSize: 22,
        fontWeight: '800',
        letterSpacing: -0.3,
    },
    cardHint: {
        fontSize: 14,
        marginBottom: 28,
        textAlign: 'center',
    },
    exploreButton: {
        width: '100%',
        paddingVertical: 18,
        borderRadius: 16,
        alignItems: 'center',
        marginBottom: 12,
        shadowColor: '#007AFF',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
        elevation: 8,
    },
    exploreButtonText: {
        color: '#FFF',
        fontSize: 18,
        fontWeight: '700',
        letterSpacing: 0.2,
    },
    secondaryButton: {
        width: '100%',
        paddingVertical: 16,
        borderRadius: 16,
        alignItems: 'center',
        borderWidth: 1.5,
        marginBottom: 12,
    },
    secondaryButtonText: {
        fontSize: 16,
        fontWeight: '600',
    },
    freeButton: {
        width: '100%',
        paddingVertical: 16,
        borderRadius: 16,
        alignItems: 'center',
        borderWidth: 1.5,
        marginBottom: 28,
    },
    freeButtonText: {
        fontSize: 16,
        fontWeight: '600',
    },
    featurePills: {
        flexDirection: 'row',
        gap: 10,
    },
    pill: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 10,
        paddingHorizontal: 8,
        borderRadius: 12,
        borderWidth: 1,
        gap: 4,
    },
    pillIcon: {
        fontSize: 14,
    },
    pillLabel: {
        fontSize: 12,
        fontWeight: '500',
    },
});
