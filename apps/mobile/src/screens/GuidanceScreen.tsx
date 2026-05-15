import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ActivityIndicator,
    ScrollView,
    Dimensions,
    Animated,
    TextInput,
    Keyboard,
} from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import * as Location from 'expo-location';
import { useStore } from '../store/useStore';
import { useTheme } from '../theme/theme';
import apiClient, { SERVER_BASE_URL } from '../services/apiClient';
import audioService from '../services/audioService';
import offlineService from '../services/offlineService';
import shareService from '../services/shareService';
import RatingModal from '../components/RatingModal';
import { useTranslation } from 'react-i18next';
import { useKeepAwake } from 'expo-keep-awake';

const { width, height } = Dimensions.get('window');

interface PointOfInterest {
    id: string;
    name: string;
    description?: string;
    latitude: number;
    longitude: number;
    orderIndex: number;
    stableId?: string;
}

interface RouteWithPoints {
    id: string;
    name: string;
    description: string;
    city: string;
    difficulty: string;
    estimatedDuration: number;
    distance: number;
    tags: string[];
    points: PointOfInterest[];
}

export default function GuidanceScreen({ navigation }: any) {
    const { selectedRoute, experienceType, language, addCompletedTour } = useStore();
    const { t } = useTranslation();
    const theme = useTheme();
    const c = theme.colors;

    const [routeData, setRouteData] = useState<RouteWithPoints | null>(null);
    const [currentPointIndex, setCurrentPointIndex] = useState(0);
    const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
    const [loading, setLoading] = useState(true);
    const [audioPlaying, setAudioPlaying] = useState(false);
    const [speechText, setSpeechText] = useState<string | null>(null);
    const [loadingSpeech, setLoadingSpeech] = useState(false);
    const [tourStarted, setTourStarted] = useState(false);
    const [tourFinished, setTourFinished] = useState(false);
    const [aiAnswer, setAiAnswer] = useState<string | null>(null);
    const [askingAI, setAskingAI] = useState(false);
    const [ratingModalVisible, setRatingModalVisible] = useState(false);
    const [customQuestion, setCustomQuestion] = useState('');

    // Keep screen awake during active tour
    useKeepAwake();

    const mapRef = useRef<MapView>(null);
    const locationSubscription = useRef<Location.LocationSubscription | null>(null);
    const slideAnim = useRef(new Animated.Value(0)).current;

    // Load route with points
    useEffect(() => {
        if (selectedRoute) {
            loadRouteDetails();
        }
    }, [selectedRoute]);

    // Track user location
    useEffect(() => {
        startLocationTracking();
        audioService.initialize();

        return () => {
            if (locationSubscription.current) {
                locationSubscription.current.remove();
            }
            audioService.cleanup();
        };
    }, []);

    // Animate card when point changes
    useEffect(() => {
        slideAnim.setValue(0);
        Animated.spring(slideAnim, {
            toValue: 1,
            useNativeDriver: true,
            tension: 50,
            friction: 7,
        }).start();
    }, [currentPointIndex]);

    const loadRouteDetails = async () => {
        try {
            const response = await apiClient.get(`/routes/${selectedRoute!.id}`);
            setRouteData(response.data);
        } catch (error) {
            console.error('Error loading route details:', error);
        } finally {
            setLoading(false);
        }
    };

    const startLocationTracking = async () => {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') return;

        const location = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
        });
        setUserLocation({
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
        });

        locationSubscription.current = await Location.watchPositionAsync(
            {
                accuracy: Location.Accuracy.Balanced,
                distanceInterval: 10,
                timeInterval: 5000,
            },
            (loc) => {
                setUserLocation({
                    latitude: loc.coords.latitude,
                    longitude: loc.coords.longitude,
                });
            }
        );
    };

    const currentPoint = routeData?.points[currentPointIndex] || null;

    const getDistanceToPoint = useCallback(
        (point: PointOfInterest) => {
            if (!userLocation) return null;
            const R = 6371e3;
            const toRad = (n: number) => (n * Math.PI) / 180;
            const dLat = toRad(point.latitude - userLocation.latitude);
            const dLon = toRad(point.longitude - userLocation.longitude);
            const a =
                Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                Math.cos(toRad(userLocation.latitude)) *
                    Math.cos(toRad(point.latitude)) *
                    Math.sin(dLon / 2) *
                    Math.sin(dLon / 2);
            const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
            return Math.round(R * c);
        },
        [userLocation]
    );

    const formatDistance = (meters: number | null) => {
        if (meters === null) return '...';
        if (meters < 1000) return `${meters} m`;
        return `${(meters / 1000).toFixed(1)} km`;
    };

    const loadSpeechForPoint = async (point: PointOfInterest) => {
        setLoadingSpeech(true);
        setSpeechText(null);

        // Try offline first
        if (selectedRoute) {
            const offlineSpeech = await offlineService.getSpeechForPoint(selectedRoute.id, point.id);
            if (offlineSpeech) {
                setSpeechText(offlineSpeech);
                setLoadingSpeech(false);
                return;
            }
        }

        try {
            const response = await apiClient.post('/ai/speech', {
                pointId: point.id,
                pointName: point.name,
                pointDescription: point.description || '',
                city: routeData?.city || '',
                experienceType: (experienceType || 'classic').toUpperCase(),
                language: language || 'es',
            });
            setSpeechText(response.data.text);

            // Try to generate and play audio
            if (response.data.text) {
                try {
                    const audioResponse = await apiClient.post('/ai/audio', {
                        text: response.data.text,
                        language: language || 'es',
                    });
                    if (audioResponse.data.audioUrl) {
                        const rawUrl: string = audioResponse.data.audioUrl;
                        const fullAudioUrl = rawUrl.startsWith('http')
                            ? rawUrl
                            : `${SERVER_BASE_URL}${rawUrl}`;
                        await audioService.playAudio(fullAudioUrl);
                        setAudioPlaying(true);
                    }
                } catch (audioError) {
                    console.log('Audio not available, showing text only');
                }
            }
        } catch (error) {
            console.error('Error loading speech:', error);
            setSpeechText(t('speechError', 'No se pudo generar la narración para este punto.'));
        } finally {
            setLoadingSpeech(false);
        }
    };

    const handleStartTour = () => {
        setTourStarted(true);
        if (routeData && routeData.points.length > 0) {
            const firstPoint = routeData.points[0];
            mapRef.current?.animateToRegion(
                {
                    latitude: firstPoint.latitude,
                    longitude: firstPoint.longitude,
                    latitudeDelta: 0.005,
                    longitudeDelta: 0.005,
                },
                1000
            );
            loadSpeechForPoint(firstPoint);
        }
    };

    const handleNextPoint = () => {
        if (!routeData) return;
        audioService.stopAudio();
        setAudioPlaying(false);
        setAiAnswer(null);

        if (currentPointIndex < routeData.points.length - 1) {
            const nextIndex = currentPointIndex + 1;
            setCurrentPointIndex(nextIndex);
            const nextPoint = routeData.points[nextIndex];
            mapRef.current?.animateToRegion(
                {
                    latitude: nextPoint.latitude,
                    longitude: nextPoint.longitude,
                    latitudeDelta: 0.005,
                    longitudeDelta: 0.005,
                },
                1000
            );
            loadSpeechForPoint(nextPoint);
        } else {
            setTourFinished(true);
            if (routeData) {
                addCompletedTour({
                    routeId: routeData.id,
                    routeName: routeData.name,
                    city: routeData.city,
                    pointsCount: routeData.points.length,
                    distanceKm: routeData.distance,
                    completedAt: Date.now(),
                });
            }
        }
    };

    const handlePreviousPoint = () => {
        if (currentPointIndex > 0) {
            audioService.stopAudio();
            setAudioPlaying(false);
            setAiAnswer(null);
            const prevIndex = currentPointIndex - 1;
            setCurrentPointIndex(prevIndex);
            const prevPoint = routeData!.points[prevIndex];
            mapRef.current?.animateToRegion(
                {
                    latitude: prevPoint.latitude,
                    longitude: prevPoint.longitude,
                    latitudeDelta: 0.005,
                    longitudeDelta: 0.005,
                },
                1000
            );
            loadSpeechForPoint(prevPoint);
        }
    };

    const toggleAudio = async () => {
        if (audioPlaying) {
            await audioService.pauseAudio();
            setAudioPlaying(false);
        } else {
            await audioService.resumeAudio();
            setAudioPlaying(true);
        }
    };

    const handleAskAI = async (questionText: string) => {
        if (!questionText.trim() || !currentPoint) return;
        setAskingAI(true);
        setAiAnswer(null);
        try {
            const response = await apiClient.post('/ai/question', {
                question: questionText,
                pointName: currentPoint.name,
                city: routeData?.city || '',
                language: language || 'es',
            });
            setAiAnswer(response.data.answer);
            setCustomQuestion('');
        } catch (error) {
            setAiAnswer(t('aiError', 'No se pudo obtener respuesta de la IA.'));
        } finally {
            setAskingAI(false);
        }
    };

    const handleFinishTour = () => {
        audioService.stopAudio();
        (navigation as any).navigate('MainTabs', { screen: 'Home' });
    };

    // No route selected
    if (!selectedRoute) {
        return (
            <View style={[styles.centerContainer, { backgroundColor: c.background }]}>
                <Text style={[styles.emptyText, { color: c.textSecondary }]}>
                    {t('noRouteSelected', 'No hay ruta seleccionada')}
                </Text>
            </View>
        );
    }

    // Loading
    if (loading) {
        return (
            <View style={[styles.centerContainer, { backgroundColor: c.background }]}>
                <ActivityIndicator size="large" color={c.primary} />
                <Text style={[styles.loadingText, { color: c.textSecondary }]}>
                    {t('loadingRoute', 'Cargando ruta...')}
                </Text>
            </View>
        );
    }

    // No route data
    if (!routeData || routeData.points.length === 0) {
        return (
            <View style={[styles.centerContainer, { backgroundColor: c.background }]}>
                <Text style={[styles.emptyText, { color: c.textSecondary }]}>
                    {t('noPoints', 'Esta ruta no tiene puntos de interés')}
                </Text>
            </View>
        );
    }

    // Tour finished
    if (tourFinished) {
        return (
            <View style={[styles.finishedContainer, { backgroundColor: c.background }]}>
                <View style={[styles.finishedCircle1, { backgroundColor: c.primary + '0A' }]} />
                <View style={[styles.finishedCircle2, { backgroundColor: c.primary + '07' }]} />

                <Text style={styles.finishedEmoji}>🎉</Text>

                <View style={[styles.finishedBadge, { backgroundColor: c.primaryLight }]}>
                    <Text style={[styles.finishedBadgeText, { color: c.primary }]}>
                        ✦ {t('tourDone', 'Tour completado')}
                    </Text>
                </View>

                <Text style={[styles.finishedTitle, { color: c.text }]}>{routeData.name}</Text>
                <Text style={[styles.finishedSubtitle, { color: c.textSecondary }]}>
                    {t('tourCompleteMsg', 'Has visitado {{count}} puntos de interés en {{city}}', {
                        count: routeData.points.length,
                        city: routeData.city,
                    })}
                </Text>

                <View style={[styles.finishedStats, { backgroundColor: c.card }]}>
                    <View style={styles.finishedStat}>
                        <Text style={[styles.finishedStatValue, { color: c.primary }]}>{routeData.points.length}</Text>
                        <Text style={[styles.finishedStatLabel, { color: c.textTertiary }]}>{t('stops', 'Paradas')}</Text>
                    </View>
                    <View style={[styles.finishedStatDivider, { backgroundColor: c.border }]} />
                    <View style={styles.finishedStat}>
                        <Text style={[styles.finishedStatValue, { color: c.primary }]}>{routeData.distance} km</Text>
                        <Text style={[styles.finishedStatLabel, { color: c.textTertiary }]}>{t('distance', 'Distancia')}</Text>
                    </View>
                    <View style={[styles.finishedStatDivider, { backgroundColor: c.border }]} />
                    <View style={styles.finishedStat}>
                        <Text style={[styles.finishedStatValue, { color: c.primary }]}>{routeData.estimatedDuration}'</Text>
                        <Text style={[styles.finishedStatLabel, { color: c.textTertiary }]}>{t('duration', 'Duración')}</Text>
                    </View>
                </View>

                <TouchableOpacity style={styles.rateButton} onPress={() => setRatingModalVisible(true)} activeOpacity={0.85}>
                    <Text style={styles.rateButtonText}>⭐ {t('rateRoute', 'Valorar ruta')}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.shareCompletionButton, { backgroundColor: c.primaryLight, borderColor: c.primary + '40' }]}
                    onPress={() => shareService.shareCompletion(routeData.name, routeData.city, routeData.points.length)}
                    activeOpacity={0.85}
                >
                    <Text style={[styles.shareCompletionButtonText, { color: c.primary }]}>
                        📤 {t('shareTour', 'Compartir logro')}
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.finishButton, { backgroundColor: c.primary }]}
                    onPress={handleFinishTour}
                    activeOpacity={0.85}
                >
                    <Text style={styles.finishButtonText}>{t('backHome', 'Volver al inicio')}</Text>
                </TouchableOpacity>

                <RatingModal
                    visible={ratingModalVisible}
                    routeId={routeData.id}
                    routeName={routeData.name}
                    city={routeData.city}
                    onClose={() => setRatingModalVisible(false)}
                />
            </View>
        );
    }

    const polylineCoords = routeData.points.map((p) => ({
        latitude: p.latitude,
        longitude: p.longitude,
    }));

    const initialRegion = {
        latitude: routeData.points[0].latitude,
        longitude: routeData.points[0].longitude,
        latitudeDelta: 0.02,
        longitudeDelta: 0.02,
    };

    return (
        <View style={styles.container}>
            {/* Map */}
            <MapView
                ref={mapRef}
                style={styles.map}
                initialRegion={initialRegion}
                showsUserLocation
                showsMyLocationButton
                showsCompass
            >
                <Polyline
                    coordinates={polylineCoords}
                    strokeColor={c.primary}
                    strokeWidth={4}
                    lineDashPattern={[0]}
                />
                {routeData.points.map((point, index) => (
                    <Marker
                        key={point.id}
                        coordinate={{ latitude: point.latitude, longitude: point.longitude }}
                        title={point.name}
                        description={point.description}
                        pinColor={
                            index === currentPointIndex
                                ? c.primary
                                : index < currentPointIndex
                                ? '#4CAF50'
                                : '#9E9E9E'
                        }
                    />
                ))}
            </MapView>

            {/* Bottom panel */}
            {!tourStarted ? (
                /* Pre-tour overview */
                <View style={[styles.overviewPanel, { backgroundColor: c.surface }]}>
                    <View style={[styles.dragHandle, { backgroundColor: c.border }]} />

                    <Text style={[styles.routeTitle, { color: c.text }]}>{routeData.name}</Text>
                    <Text style={[styles.routeDescription, { color: c.textSecondary }]}>{routeData.description}</Text>

                    <View style={[styles.routeStats, { backgroundColor: c.card }]}>
                        <View style={styles.stat}>
                            <Text style={styles.statIcon}>📍</Text>
                            <Text style={[styles.statValue, { color: c.primary }]}>{routeData.points.length}</Text>
                            <Text style={[styles.statLabel, { color: c.textTertiary }]}>{t('stops', 'Paradas')}</Text>
                        </View>
                        <View style={[styles.statDivider, { backgroundColor: c.border }]} />
                        <View style={styles.stat}>
                            <Text style={styles.statIcon}>⏱️</Text>
                            <Text style={[styles.statValue, { color: c.primary }]}>{routeData.estimatedDuration}'</Text>
                            <Text style={[styles.statLabel, { color: c.textTertiary }]}>{t('duration', 'Duración')}</Text>
                        </View>
                        <View style={[styles.statDivider, { backgroundColor: c.border }]} />
                        <View style={styles.stat}>
                            <Text style={styles.statIcon}>🚶</Text>
                            <Text style={[styles.statValue, { color: c.primary }]}>{routeData.distance} km</Text>
                            <Text style={[styles.statLabel, { color: c.textTertiary }]}>{t('distance', 'Distancia')}</Text>
                        </View>
                    </View>

                    <TouchableOpacity
                        style={[styles.startButton, { backgroundColor: c.primary, shadowColor: c.primary }]}
                        onPress={handleStartTour}
                        activeOpacity={0.85}
                    >
                        <Text style={styles.startButtonText}>▶  {t('startTour', 'Comenzar tour')}</Text>
                    </TouchableOpacity>
                </View>
            ) : (
                /* Active tour guidance */
                <Animated.View
                    style={[
                        styles.guidancePanel,
                        { backgroundColor: c.surface },
                        {
                            transform: [{
                                translateY: slideAnim.interpolate({
                                    inputRange: [0, 1],
                                    outputRange: [100, 0],
                                }),
                            }],
                            opacity: slideAnim,
                        },
                    ]}
                >
                    <View style={[styles.dragHandle, { backgroundColor: c.border }]} />

                    {/* Progress bar */}
                    <View style={styles.tourProgressContainer}>
                        <View style={[styles.tourProgressTrack, { backgroundColor: c.border }]}>
                            <View
                                style={[
                                    styles.tourProgressFill,
                                    {
                                        width: `${((currentPointIndex + 1) / routeData.points.length) * 100}%`,
                                        backgroundColor: c.primary,
                                    },
                                ]}
                            />
                        </View>
                        <Text style={[styles.tourProgressLabel, { color: c.primary }]}>
                            {currentPointIndex + 1} / {routeData.points.length}
                        </Text>
                    </View>

                    <ScrollView style={styles.guidanceScroll} showsVerticalScrollIndicator={false}>
                        {/* Point header */}
                        <View style={styles.pointHeader}>
                            <View style={[styles.pointBadge, { backgroundColor: c.primary }]}>
                                <Text style={styles.pointBadgeText}>{currentPointIndex + 1}</Text>
                            </View>
                            <Text style={[styles.pointName, { color: c.text }]}>{currentPoint?.name}</Text>
                            {userLocation && currentPoint && (
                                <View style={[styles.distanceBadge, { backgroundColor: c.primaryLight }]}>
                                    <Text style={[styles.distanceText, { color: c.primary }]}>
                                        📍 {formatDistance(getDistanceToPoint(currentPoint))}
                                    </Text>
                                </View>
                            )}
                        </View>

                        {/* Description */}
                        {currentPoint?.description && (
                            <Text style={[styles.pointDescription, { color: c.textSecondary }]}>
                                {currentPoint.description}
                            </Text>
                        )}

                        {/* AI Speech */}
                        {loadingSpeech ? (
                            <View style={[styles.speechLoading, { backgroundColor: c.primaryLight }]}>
                                <ActivityIndicator size="small" color={c.primary} />
                                <Text style={[styles.speechLoadingText, { color: c.primary }]}>
                                    {t('generatingNarration', 'Generando narración...')}
                                </Text>
                            </View>
                        ) : speechText ? (
                            <View style={[styles.speechCard, { backgroundColor: c.primaryLight, borderLeftColor: c.primary }]}>
                                <View style={styles.speechHeader}>
                                    <Text style={[styles.speechTitle, { color: c.primary }]}>
                                        {t('aiNarration', 'Narración IA')}
                                    </Text>
                                    <TouchableOpacity
                                        onPress={toggleAudio}
                                        style={[styles.audioButton, { backgroundColor: c.primary }]}
                                    >
                                        <Text style={styles.audioButtonText}>
                                            {audioPlaying ? '⏸️' : '▶️'}
                                        </Text>
                                    </TouchableOpacity>
                                </View>
                                <Text style={[styles.speechText, { color: c.text }]}>{speechText}</Text>
                            </View>
                        ) : null}

                        {/* AI Answer */}
                        {aiAnswer && (
                            <View style={styles.aiAnswerCard}>
                                <Text style={styles.aiAnswerTitle}>{t('aiAnswer', 'Respuesta IA')}</Text>
                                <Text style={[styles.aiAnswerText, { color: c.text }]}>{aiAnswer}</Text>
                            </View>
                        )}

                        {/* Q&A with AI */}
                        <View style={styles.quickQuestions}>
                            <Text style={[styles.quickTitle, { color: c.textSecondary }]}>
                                {t('askAI', 'Pregunta a la IA')}
                            </Text>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.suggestionsScroll}>
                                {[
                                    t('q1', '¿Historia del lugar?'),
                                    t('q2', '¿Comer cerca?'),
                                    t('q3', '¿Dato curioso?'),
                                    t('q4', '¿Horario de visita?'),
                                    t('q5', '¿Cuánto cuesta entrar?'),
                                ].map((q, i) => (
                                    <TouchableOpacity
                                        key={i}
                                        style={[
                                            styles.suggestionChip,
                                            { backgroundColor: c.primaryLight, borderColor: c.border },
                                            askingAI && styles.disabledChip,
                                        ]}
                                        onPress={() => {
                                            setCustomQuestion(q);
                                            handleAskAI(q);
                                        }}
                                        disabled={askingAI}
                                    >
                                        <Text style={[styles.suggestionChipText, { color: c.primary }]}>{q}</Text>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                            {/* Custom question input */}
                            <View style={styles.questionInputRow}>
                                <TextInput
                                    style={[
                                        styles.questionInput,
                                        {
                                            backgroundColor: c.card,
                                            color: c.text,
                                            borderColor: c.border,
                                        },
                                    ]}
                                    placeholder={t('typeQuestion', 'Escribe tu pregunta...')}
                                    placeholderTextColor={c.textTertiary}
                                    value={customQuestion}
                                    onChangeText={setCustomQuestion}
                                    multiline={false}
                                    returnKeyType="send"
                                    onSubmitEditing={() => {
                                        if (customQuestion.trim()) {
                                            handleAskAI(customQuestion);
                                            Keyboard.dismiss();
                                        }
                                    }}
                                    editable={!askingAI}
                                />
                                <TouchableOpacity
                                    style={[
                                        styles.sendButton,
                                        { backgroundColor: c.primary, shadowColor: c.primary },
                                        (!customQuestion.trim() || askingAI) && styles.sendButtonDisabled,
                                    ]}
                                    onPress={() => {
                                        if (customQuestion.trim()) {
                                            handleAskAI(customQuestion);
                                            Keyboard.dismiss();
                                        }
                                    }}
                                    disabled={!customQuestion.trim() || askingAI}
                                >
                                    {askingAI ? (
                                        <ActivityIndicator size="small" color="#FFF" />
                                    ) : (
                                        <Text style={styles.sendButtonText}>→</Text>
                                    )}
                                </TouchableOpacity>
                            </View>
                        </View>
                    </ScrollView>

                    {/* Navigation buttons */}
                    <View style={[styles.navButtons, { borderTopColor: c.border }]}>
                        <TouchableOpacity
                            style={[styles.navButton, styles.prevButton, { backgroundColor: c.card }]}
                            onPress={handlePreviousPoint}
                            disabled={currentPointIndex === 0}
                        >
                            <Text style={[
                                styles.navButtonText,
                                { color: c.textSecondary },
                                currentPointIndex === 0 && { color: c.border },
                            ]}>
                                {t('previous', 'Anterior')}
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.navButton, styles.nextButton, { backgroundColor: c.primary, shadowColor: c.primary }]}
                            onPress={handleNextPoint}
                        >
                            <Text style={styles.nextButtonText}>
                                {currentPointIndex < routeData.points.length - 1
                                    ? t('next', 'Siguiente')
                                    : t('finish', 'Finalizar')}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </Animated.View>
            )}
        </View>
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
    },
    map: {
        width,
        height: height * 0.5,
    },
    loadingText: {
        marginTop: 12,
        fontSize: 16,
    },
    emptyText: {
        fontSize: 16,
    },

    // Drag handle
    dragHandle: {
        width: 40,
        height: 4,
        borderRadius: 2,
        alignSelf: 'center',
        marginBottom: 16,
        marginTop: 8,
    },

    // Tour progress bar (active tour)
    tourProgressContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        marginBottom: 4,
        gap: 10,
    },
    tourProgressTrack: {
        flex: 1,
        height: 4,
        borderRadius: 2,
        overflow: 'hidden',
    },
    tourProgressFill: {
        height: '100%',
        borderRadius: 2,
    },
    tourProgressLabel: {
        fontSize: 13,
        fontWeight: '700',
        minWidth: 36,
        textAlign: 'right',
    },

    // Distance badge
    distanceBadge: {
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 10,
    },

    // Overview panel (pre-tour)
    overviewPanel: {
        flex: 1,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        marginTop: -20,
        paddingHorizontal: 24,
        paddingBottom: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -3 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 10,
    },
    routeTitle: {
        fontSize: 24,
        fontWeight: '700',
        marginBottom: 8,
    },
    routeDescription: {
        fontSize: 15,
        lineHeight: 22,
        marginBottom: 20,
    },
    routeStats: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 24,
        paddingVertical: 16,
        paddingHorizontal: 8,
        borderRadius: 16,
    },
    stat: {
        flex: 1,
        alignItems: 'center',
    },
    statIcon: {
        fontSize: 18,
        marginBottom: 4,
    },
    statDivider: {
        width: 1,
        height: 40,
    },
    statValue: {
        fontSize: 20,
        fontWeight: '700',
    },
    statLabel: {
        fontSize: 12,
        marginTop: 2,
    },
    startButton: {
        padding: 18,
        borderRadius: 16,
        alignItems: 'center',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 5,
    },
    startButtonText: {
        color: '#FFF',
        fontSize: 18,
        fontWeight: '700',
    },

    // Guidance panel (active tour)
    guidancePanel: {
        flex: 1,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        marginTop: -20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -3 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 10,
    },
    guidanceScroll: {
        flex: 1,
        padding: 20,
    },
    pointHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    pointBadge: {
        borderRadius: 12,
        paddingHorizontal: 10,
        paddingVertical: 4,
        marginRight: 10,
    },
    pointBadgeText: {
        color: '#FFF',
        fontSize: 13,
        fontWeight: '700',
    },
    pointName: {
        fontSize: 20,
        fontWeight: '700',
        flex: 1,
    },
    distanceText: {
        fontSize: 12,
        fontWeight: '600',
    },
    pointDescription: {
        fontSize: 14,
        lineHeight: 20,
        marginBottom: 16,
    },

    // Speech
    speechLoading: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderRadius: 12,
        marginBottom: 12,
    },
    speechLoadingText: {
        marginLeft: 10,
        fontSize: 14,
    },
    speechCard: {
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
        borderLeftWidth: 4,
    },
    speechHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
    },
    speechTitle: {
        fontSize: 14,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    audioButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    audioButtonText: {
        fontSize: 18,
    },
    speechText: {
        fontSize: 15,
        lineHeight: 23,
    },

    // AI Answer — intentionally green (semantic color, not theme)
    aiAnswerCard: {
        backgroundColor: '#F0FFF0',
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
        borderLeftWidth: 4,
        borderLeftColor: '#4CAF50',
    },
    aiAnswerTitle: {
        fontSize: 14,
        fontWeight: '700',
        color: '#4CAF50',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginBottom: 8,
    },
    aiAnswerText: {
        fontSize: 15,
        lineHeight: 23,
    },

    // Quick questions
    quickQuestions: {
        marginTop: 8,
        marginBottom: 16,
    },
    quickTitle: {
        fontSize: 14,
        fontWeight: '700',
        marginBottom: 10,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },

    // Navigation buttons
    navButtons: {
        flexDirection: 'row',
        padding: 16,
        paddingBottom: 30,
        borderTopWidth: 1,
    },
    navButton: {
        flex: 1,
        padding: 16,
        borderRadius: 14,
        alignItems: 'center',
    },
    prevButton: {
        marginRight: 8,
    },
    nextButton: {
        marginLeft: 8,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 5,
    },
    navButtonText: {
        fontSize: 16,
        fontWeight: '600',
    },
    nextButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#FFF',
    },

    // Finished screen
    finishedContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 30,
        overflow: 'hidden',
    },
    finishedCircle1: {
        position: 'absolute',
        width: 300,
        height: 300,
        borderRadius: 150,
        top: -80,
        right: -80,
    },
    finishedCircle2: {
        position: 'absolute',
        width: 200,
        height: 200,
        borderRadius: 100,
        bottom: 60,
        left: -60,
    },
    finishedBadge: {
        paddingHorizontal: 16,
        paddingVertical: 6,
        borderRadius: 20,
        marginBottom: 16,
    },
    finishedBadgeText: {
        fontSize: 13,
        fontWeight: '700',
        letterSpacing: 0.3,
    },
    finishedEmoji: {
        fontSize: 72,
        marginBottom: 12,
    },
    finishedTitle: {
        fontSize: 26,
        fontWeight: '700',
        marginBottom: 8,
        textAlign: 'center',
    },
    finishedSubtitle: {
        fontSize: 15,
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: 24,
    },
    finishedStats: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 16,
        paddingVertical: 16,
        paddingHorizontal: 8,
        width: '100%',
        marginBottom: 28,
    },
    finishedStat: {
        flex: 1,
        alignItems: 'center',
    },
    finishedStatValue: {
        fontSize: 20,
        fontWeight: '700',
    },
    finishedStatLabel: {
        fontSize: 12,
        marginTop: 2,
    },
    finishedStatDivider: {
        width: 1,
        height: 36,
    },
    // Rate button — intentionally gold (semantic)
    rateButton: {
        backgroundColor: '#FFD700',
        paddingHorizontal: 40,
        paddingVertical: 16,
        borderRadius: 16,
        marginBottom: 12,
        width: '100%',
        alignItems: 'center',
        shadowColor: '#FFD700',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },
    rateButtonText: {
        fontSize: 17,
        fontWeight: '700',
        color: '#5A4000',
    },
    shareCompletionButton: {
        paddingHorizontal: 40,
        paddingVertical: 16,
        borderRadius: 16,
        marginBottom: 12,
        width: '100%',
        alignItems: 'center',
        borderWidth: 1.5,
    },
    shareCompletionButtonText: {
        fontSize: 17,
        fontWeight: '700',
    },
    finishButton: {
        paddingHorizontal: 40,
        paddingVertical: 16,
        borderRadius: 16,
        width: '100%',
        alignItems: 'center',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 8,
        elevation: 4,
    },
    finishButtonText: {
        fontSize: 17,
        fontWeight: '700',
        color: '#FFF',
    },
    suggestionsScroll: {
        marginBottom: 10,
    },
    suggestionChip: {
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 20,
        marginRight: 8,
        borderWidth: 1,
    },
    disabledChip: {
        opacity: 0.5,
    },
    suggestionChipText: {
        fontSize: 13,
        fontWeight: '500',
    },
    questionInputRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginTop: 4,
    },
    questionInput: {
        flex: 1,
        borderRadius: 12,
        paddingHorizontal: 14,
        paddingVertical: 12,
        fontSize: 15,
        borderWidth: 1,
    },
    sendButton: {
        width: 46,
        height: 46,
        borderRadius: 23,
        justifyContent: 'center',
        alignItems: 'center',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 3,
    },
    sendButtonDisabled: {
        backgroundColor: '#C7C7CC',
        shadowOpacity: 0,
        elevation: 0,
    },
    sendButtonText: {
        color: '#FFF',
        fontSize: 20,
        fontWeight: '700',
    },
});
