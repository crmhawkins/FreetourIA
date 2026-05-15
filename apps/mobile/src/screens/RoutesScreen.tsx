import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    ActivityIndicator,
    Animated,
    TextInput,
    RefreshControl,
    Alert,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useStore } from '../store/useStore';
import { useTheme } from '../theme/theme';
import apiClient from '../services/apiClient';
import offlineService from '../services/offlineService';
import shareService from '../services/shareService';

interface Route {
    id: string;
    name: string;
    description: string;
    city: string;
    difficulty: string;
    estimatedDuration: number;
    distance: number;
    tags: string[];
    averageRating?: number | null;
    _count?: { ratings: number };
}

const DIFFICULTY_COLORS: Record<string, string> = {
    EASY: '#4CAF50',
    MEDIUM: '#FF9800',
    HARD: '#F44336',
};

const DIFFICULTY_LABELS: Record<string, Record<string, string>> = {
    EASY: { es: 'Fácil', en: 'Easy', fr: 'Facile', de: 'Leicht', it: 'Facile' },
    MEDIUM: { es: 'Media', en: 'Medium', fr: 'Moyen', de: 'Mittel', it: 'Media' },
    HARD: { es: 'Difícil', en: 'Hard', fr: 'Difficile', de: 'Schwer', it: 'Difficile' },
};

type DifficultyFilter = 'ALL' | 'EASY' | 'MEDIUM' | 'HARD';

export default function RoutesScreen({ navigation }: any) {
    const { t } = useTranslation();
    const { currentCity, setSelectedRoute, language, isRouteDownloaded } = useStore();
    const theme = useTheme();
    const c = theme.colors;

    const [routes, setRoutes] = useState<Route[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [difficultyFilter, setDifficultyFilter] = useState<DifficultyFilter>('ALL');

    useEffect(() => {
        loadRoutes();
    }, [currentCity]);

    const loadRoutes = async (isRefresh = false) => {
        if (isRefresh) setRefreshing(true);
        else setLoading(true);
        setError(false);
        try {
            const params = currentCity ? `?city=${encodeURIComponent(currentCity)}&limit=50` : '?limit=50';
            const response = await apiClient.get(`/routes${params}`);
            const data = response.data.data || response.data;
            setRoutes(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error('Error loading routes:', err);
            setError(true);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const onRefresh = useCallback(() => loadRoutes(true), [currentCity]);

    const filteredRoutes = useMemo(() => {
        let result = routes;
        if (difficultyFilter !== 'ALL') {
            result = result.filter((r) => r.difficulty === difficultyFilter);
        }
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase().trim();
            result = result.filter(
                (r) =>
                    r.name.toLowerCase().includes(q) ||
                    r.description.toLowerCase().includes(q) ||
                    r.tags?.some((tag) => tag.toLowerCase().includes(q))
            );
        }
        return result;
    }, [routes, difficultyFilter, searchQuery]);

    const handleSelectRoute = (route: Route) => {
        setSelectedRoute(route);
        navigation.navigate('Guidance');
    };

    const getDifficultyLabel = (diff: string) => {
        return DIFFICULTY_LABELS[diff]?.[language] || diff;
    };

    if (loading) {
        return (
            <View style={[styles.centerContainer, { backgroundColor: c.background }]}>
                <ActivityIndicator size="large" color={c.primary} />
                <Text style={[styles.loadingText, { color: c.textSecondary }]}>
                    {t('loadingRoutes', 'Cargando rutas...')}
                </Text>
            </View>
        );
    }

    if (error) {
        return (
            <View style={[styles.centerContainer, { backgroundColor: c.background }]}>
                <Text style={styles.errorEmoji}>⚠️</Text>
                <Text style={[styles.errorText, { color: c.error }]}>
                    {t('routesError', 'Error al cargar las rutas')}
                </Text>
                <TouchableOpacity
                    style={[styles.retryButton, { backgroundColor: c.primary }]}
                    onPress={() => loadRoutes()}
                >
                    <Text style={styles.retryText}>{t('retry', 'Reintentar')}</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <View style={[styles.container, { backgroundColor: c.background }]}>
            {/* Search bar */}
            <View style={[styles.searchContainer, { backgroundColor: c.surface, borderColor: c.border }]}>
                <Text style={styles.searchIcon}>🔍</Text>
                <TextInput
                    style={[styles.searchInput, { color: c.text }]}
                    placeholder={t('searchRoutes', 'Buscar rutas...')}
                    placeholderTextColor={c.textTertiary}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    clearButtonMode="while-editing"
                    returnKeyType="search"
                />
                {searchQuery.length > 0 && (
                    <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearButton}>
                        <Text style={[styles.clearButtonText, { color: c.textTertiary }]}>✕</Text>
                    </TouchableOpacity>
                )}
            </View>

            {/* Difficulty filters */}
            <View style={styles.filtersRow}>
                {(['ALL', 'EASY', 'MEDIUM', 'HARD'] as DifficultyFilter[]).map((value) => {
                    const label = value === 'ALL'
                        ? t('all', 'Todas')
                        : getDifficultyLabel(value);
                    const diffColor = DIFFICULTY_COLORS[value];
                    const isActive = difficultyFilter === value;
                    return (
                        <TouchableOpacity
                            key={value}
                            style={[
                                styles.filterChip,
                                { backgroundColor: c.surface, borderColor: c.border },
                                isActive && { backgroundColor: diffColor || c.primary, borderColor: diffColor || c.primary },
                            ]}
                            onPress={() => setDifficultyFilter(value)}
                        >
                            <Text style={[
                                styles.filterChipText,
                                { color: c.textSecondary },
                                isActive && { color: '#FFF' },
                            ]}>
                                {label}
                            </Text>
                        </TouchableOpacity>
                    );
                })}
            </View>

            {/* No city hint */}
            {!currentCity && routes.length > 0 && (
                <View style={[styles.noCityHint, { backgroundColor: '#FFF9E6', borderColor: '#FFE082' }]}>
                    <Text style={styles.noCityHintText}>
                        💡 {t('noCityHint', 'Ve a Inicio para detectar tu ciudad y ver rutas locales')}
                    </Text>
                </View>
            )}

            {/* Results count */}
            <View style={styles.resultsRow}>
                <Text style={[styles.resultsCount, { color: c.textTertiary }]}>
                    {filteredRoutes.length === 0
                        ? t('noResults', 'Sin resultados')
                        : t('routesFound', '{{count}} rutas', { count: filteredRoutes.length })}
                    {currentCity ? ` · 📍 ${currentCity}` : ''}
                </Text>
            </View>

            <FlatList
                data={filteredRoutes}
                keyExtractor={(item) => item.id}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={filteredRoutes.length === 0 ? styles.emptyList : { paddingBottom: 20 }}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.primary} />
                }
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Text style={styles.emptyEmoji}>🗺️</Text>
                        <Text style={[styles.emptyTitle, { color: c.textSecondary }]}>
                            {searchQuery
                                ? t('noSearchResults', 'Sin resultados para "{{query}}"', { query: searchQuery })
                                : t('noRoutes', 'No hay rutas disponibles')}
                        </Text>
                        {searchQuery ? (
                            <TouchableOpacity onPress={() => setSearchQuery('')}>
                                <Text style={[styles.clearSearch, { color: c.primary }]}>
                                    {t('clearSearch', 'Limpiar búsqueda')}
                                </Text>
                            </TouchableOpacity>
                        ) : null}
                    </View>
                }
                renderItem={({ item, index }) => (
                    <RouteCard
                        route={item}
                        index={index}
                        onPress={() => handleSelectRoute(item)}
                        difficultyLabel={getDifficultyLabel(item.difficulty)}
                        isDownloaded={isRouteDownloaded(item.id)}
                        t={t}
                    />
                )}
            />
        </View>
    );
}

// ─────────────────────────────────────────────────────────────
// RouteCard — fully themed
// ─────────────────────────────────────────────────────────────
function RouteCard({
    route,
    index,
    onPress,
    difficultyLabel,
    isDownloaded,
    t,
}: {
    route: Route;
    index: number;
    onPress: () => void;
    difficultyLabel: string;
    isDownloaded: boolean;
    t: any;
}) {
    const { experienceType, language, addDownloadedRoute, removeDownloadedRoute } = useStore();
    const theme = useTheme();
    const c = theme.colors;

    const fadeAnim = React.useRef(new Animated.Value(0)).current;
    const [downloading, setDownloading] = React.useState(false);
    const [downloadProgress, setDownloadProgress] = React.useState('');

    React.useEffect(() => {
        Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 400,
            delay: Math.min(index * 80, 400),
            useNativeDriver: true,
        }).start();
    }, []);

    const handleDownload = async () => {
        setDownloading(true);
        try {
            const data = await offlineService.downloadRoute(
                route.id,
                experienceType || 'CLASSIC',
                language || 'es',
                (current: number, total: number) => {
                    setDownloadProgress(`${current}/${total}`);
                },
            );
            addDownloadedRoute(route.id, data);
            Alert.alert(
                t('downloadComplete', 'Descarga completada'),
                t('routeAvailableOffline', 'La ruta está disponible sin conexión')
            );
        } catch (error) {
            Alert.alert(t('downloadError', 'Error'), t('downloadFailed', 'No se pudo descargar la ruta'));
        } finally {
            setDownloading(false);
            setDownloadProgress('');
        }
    };

    const handleDeleteDownload = () => {
        Alert.alert(
            t('deleteDownload', 'Eliminar descarga'),
            t('deleteDownloadConfirm', '¿Eliminar la ruta offline? Podrás volver a descargarla después.'),
            [
                { text: t('cancel', 'Cancelar'), style: 'cancel' },
                {
                    text: t('delete', 'Eliminar'),
                    style: 'destructive',
                    onPress: () => {
                        removeDownloadedRoute(route.id);
                        offlineService.removeDownloaded(route.id).catch(console.error);
                    },
                },
            ]
        );
    };

    const diffColor = DIFFICULTY_COLORS[route.difficulty] || c.textTertiary;
    const hasRating = route.averageRating != null;

    return (
        <Animated.View
            style={{
                opacity: fadeAnim,
                transform: [{ translateY: fadeAnim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }],
            }}
        >
            <TouchableOpacity
                style={[
                    styles.routeCard,
                    {
                        backgroundColor: c.surface,
                        borderLeftColor: diffColor,
                        shadowColor: theme.dark ? '#000' : diffColor,
                    },
                ]}
                onPress={onPress}
                activeOpacity={0.85}
            >
                {/* Top row */}
                <View style={styles.cardTopRow}>
                    <View style={styles.cardTopLeft}>
                        <View style={[styles.difficultyBadge, { backgroundColor: diffColor + '20', borderColor: diffColor }]}>
                            <Text style={[styles.difficultyText, { color: diffColor }]}>{difficultyLabel}</Text>
                        </View>
                        {isDownloaded && (
                            <View style={[styles.offlineBadge, { backgroundColor: c.primaryLight }]}>
                                <Text style={[styles.offlineBadgeText, { color: c.primary }]}>📥 offline</Text>
                            </View>
                        )}
                    </View>
                    <View style={styles.topRowRight}>
                        {hasRating && (
                            <View style={styles.ratingBadge}>
                                <Text style={styles.ratingText}>⭐ {route.averageRating?.toFixed(1)}</Text>
                            </View>
                        )}
                        <TouchableOpacity
                            style={[styles.shareButton, { backgroundColor: c.card }]}
                            onPress={() => shareService.shareRoute({
                                id: route.id,
                                name: route.name,
                                description: route.description,
                                city: route.city,
                            })}
                        >
                            <Text style={styles.shareButtonText}>📤</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* City label */}
                <Text style={[styles.routeCity, { color: c.textTertiary }]}>
                    📍 {route.city}
                </Text>

                <Text style={[styles.routeName, { color: c.text }]}>{route.name}</Text>
                <Text style={[styles.routeDescription, { color: c.textSecondary }]} numberOfLines={2}>
                    {route.description}
                </Text>

                {/* Stats row */}
                <View style={[styles.routeStats, { backgroundColor: c.card }]}>
                    <View style={styles.statItem}>
                        <Text style={[styles.statValue, { color: c.text }]}>{route.estimatedDuration}'</Text>
                        <Text style={[styles.statLabel, { color: c.textTertiary }]}>{t('min', 'min')}</Text>
                    </View>
                    <View style={[styles.statDivider, { backgroundColor: c.border }]} />
                    <View style={styles.statItem}>
                        <Text style={[styles.statValue, { color: c.text }]}>{route.distance} km</Text>
                        <Text style={[styles.statLabel, { color: c.textTertiary }]}>{t('distance', 'dist.')}</Text>
                    </View>
                    {route._count?.ratings ? (
                        <>
                            <View style={[styles.statDivider, { backgroundColor: c.border }]} />
                            <View style={styles.statItem}>
                                <Text style={[styles.statValue, { color: c.text }]}>{route._count.ratings}</Text>
                                <Text style={[styles.statLabel, { color: c.textTertiary }]}>{t('reviews', 'reseñas')}</Text>
                            </View>
                        </>
                    ) : null}
                </View>

                {/* Tags */}
                {route.tags && route.tags.length > 0 && (
                    <View style={styles.tagsContainer}>
                        {route.tags.slice(0, 4).map((tag, idx) => (
                            <View key={idx} style={[styles.tag, { backgroundColor: c.primaryLight }]}>
                                <Text style={[styles.tagText, { color: c.primary }]}>{tag}</Text>
                            </View>
                        ))}
                    </View>
                )}

                {/* Bottom action row */}
                <View style={styles.cardBottom}>
                    {isDownloaded ? (
                        <TouchableOpacity
                            style={[styles.deleteOfflineButton, { backgroundColor: c.error + '15', borderColor: c.error + '40' }]}
                            onPress={handleDeleteDownload}
                        >
                            <Text style={[styles.deleteOfflineText, { color: c.error }]}>
                                🗑️ {t('removeOffline', 'Eliminar offline')}
                            </Text>
                        </TouchableOpacity>
                    ) : (
                        <TouchableOpacity
                            style={[
                                styles.downloadButton,
                                { backgroundColor: c.primaryLight, borderColor: c.primary + '60' },
                                downloading && styles.downloadingButton,
                            ]}
                            onPress={handleDownload}
                            disabled={downloading}
                        >
                            <Text style={[styles.downloadButtonText, { color: c.primary }]}>
                                {downloading
                                    ? `⬇️ ${t('downloading', 'Descargando...')} ${downloadProgress}`
                                    : `📥 ${t('downloadRoute', 'Guardar offline')}`}
                            </Text>
                        </TouchableOpacity>
                    )}
                    <TouchableOpacity
                        style={[styles.startTourButton, { backgroundColor: c.primary }]}
                        onPress={onPress}
                        activeOpacity={0.85}
                    >
                        <Text style={styles.startTourText}>{t('start', 'Iniciar')} →</Text>
                    </TouchableOpacity>
                </View>
            </TouchableOpacity>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 30,
    },
    loadingText: {
        marginTop: 12,
        fontSize: 15,
    },
    // Search
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginHorizontal: 16,
        marginTop: 12,
        marginBottom: 8,
        borderRadius: 14,
        paddingHorizontal: 14,
        paddingVertical: 4,
        borderWidth: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    searchIcon: {
        fontSize: 16,
        marginRight: 8,
    },
    searchInput: {
        flex: 1,
        fontSize: 16,
        paddingVertical: 12,
    },
    clearButton: {
        padding: 6,
    },
    clearButtonText: {
        fontSize: 14,
        fontWeight: '600',
    },
    // Filters
    filtersRow: {
        flexDirection: 'row',
        paddingHorizontal: 16,
        paddingBottom: 8,
        gap: 8,
    },
    filterChip: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        borderWidth: 1.5,
    },
    filterChipText: {
        fontSize: 13,
        fontWeight: '600',
    },
    // Results row
    resultsRow: {
        paddingHorizontal: 20,
        paddingBottom: 6,
    },
    resultsCount: {
        fontSize: 13,
    },
    noCityHint: {
        marginHorizontal: 16,
        marginBottom: 6,
        borderRadius: 10,
        padding: 10,
        borderWidth: 1,
    },
    noCityHintText: {
        fontSize: 13,
        color: '#7B6000',
    },
    // Empty states
    emptyList: {
        flexGrow: 1,
    },
    emptyContainer: {
        alignItems: 'center',
        paddingTop: 60,
    },
    emptyEmoji: {
        fontSize: 60,
        marginBottom: 16,
    },
    emptyTitle: {
        fontSize: 16,
        textAlign: 'center',
        marginBottom: 12,
    },
    clearSearch: {
        fontSize: 15,
        fontWeight: '600',
    },
    errorEmoji: {
        fontSize: 48,
        marginBottom: 12,
    },
    errorText: {
        fontSize: 16,
        marginBottom: 16,
        textAlign: 'center',
    },
    retryButton: {
        paddingHorizontal: 30,
        paddingVertical: 14,
        borderRadius: 14,
    },
    retryText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: '600',
    },
    // Route card — left accent border
    routeCard: {
        marginHorizontal: 16,
        marginBottom: 14,
        borderRadius: 18,
        padding: 16,
        borderLeftWidth: 4,
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
        elevation: 4,
    },
    cardTopRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
    },
    cardTopLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        flex: 1,
    },
    topRowRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    difficultyBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
        borderWidth: 1,
    },
    difficultyText: {
        fontSize: 11,
        fontWeight: '700',
        textTransform: 'uppercase',
    },
    ratingBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        backgroundColor: '#FFF9E6',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#FFD700',
    },
    ratingText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#B8860B',
    },
    offlineBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
    },
    offlineBadgeText: {
        fontSize: 10,
        fontWeight: '700',
    },
    shareButton: {
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
    },
    shareButtonText: {
        fontSize: 14,
    },
    routeCity: {
        fontSize: 12,
        fontWeight: '500',
        marginBottom: 4,
        letterSpacing: 0.2,
    },
    routeName: {
        fontSize: 19,
        fontWeight: '700',
        marginBottom: 5,
        letterSpacing: -0.2,
    },
    routeDescription: {
        fontSize: 14,
        lineHeight: 20,
        marginBottom: 12,
    },
    routeStats: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 12,
        paddingVertical: 10,
        paddingHorizontal: 4,
        marginBottom: 10,
    },
    statItem: {
        flex: 1,
        alignItems: 'center',
    },
    statValue: {
        fontSize: 16,
        fontWeight: '700',
    },
    statLabel: {
        fontSize: 11,
        marginTop: 2,
    },
    statDivider: {
        width: 1,
        height: 28,
    },
    tagsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 6,
        marginBottom: 12,
    },
    tag: {
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 20,
    },
    tagText: {
        fontSize: 12,
        fontWeight: '500',
    },
    // Bottom action row
    cardBottom: {
        flexDirection: 'row',
        gap: 8,
        marginTop: 4,
    },
    downloadButton: {
        flex: 1,
        padding: 11,
        borderRadius: 12,
        alignItems: 'center',
        borderWidth: 1.5,
        borderStyle: 'dashed',
    },
    downloadingButton: {
        opacity: 0.7,
        borderStyle: 'solid',
    },
    downloadButtonText: {
        fontSize: 13,
        fontWeight: '600',
    },
    deleteOfflineButton: {
        flex: 1,
        padding: 11,
        borderRadius: 12,
        alignItems: 'center',
        borderWidth: 1,
    },
    deleteOfflineText: {
        fontSize: 13,
        fontWeight: '500',
    },
    startTourButton: {
        paddingHorizontal: 20,
        paddingVertical: 11,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    startTourText: {
        color: '#FFF',
        fontSize: 14,
        fontWeight: '700',
    },
});
