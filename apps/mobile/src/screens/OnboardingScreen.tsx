import React, { useRef, useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Dimensions,
    ScrollView,
    TouchableOpacity,
    Animated,
    NativeSyntheticEvent,
    NativeScrollEvent,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width, height } = Dimensions.get('window');

const ONBOARDING_KEY = '@hasSeenOnboarding';

interface Slide {
    emoji: string;
    title: string;
    description: string;
    bgColor: string;
    accentColor: string;
}

const slides: Slide[] = [
    {
        emoji: '\uD83C\uDF0D',
        title: 'Descubre ciudades con IA',
        description:
            'Explora los rincones más fascinantes de cada ciudad con rutas generadas por inteligencia artificial, adaptadas a tus gustos e intereses.',
        bgColor: '#0A1628',
        accentColor: '#007AFF',
    },
    {
        emoji: '\uD83C\uDFA7',
        title: 'Audio guías personalizadas',
        description:
            'Disfruta de narraciones únicas creadas especialmente para ti. Como tener un guía turístico personal que conoce tus preferencias.',
        bgColor: '#0F1B2D',
        accentColor: '#5856D6',
    },
    {
        emoji: '\uD83D\uDCE1',
        title: 'Funciona sin internet',
        description:
            'Descarga tus rutas y audio guías antes de salir. Navega y escucha sin preocuparte por la conexión de datos.',
        bgColor: '#0D1F2D',
        accentColor: '#34C759',
    },
];

export default function OnboardingScreen({ navigation }: any) {
    const scrollViewRef = useRef<ScrollView>(null);
    const [activeIndex, setActiveIndex] = useState(0);

    // Animated values for each slide
    const emojiScale = useRef(new Animated.Value(0)).current;
    const titleOpacity = useRef(new Animated.Value(0)).current;
    const titleTranslateY = useRef(new Animated.Value(30)).current;
    const descOpacity = useRef(new Animated.Value(0)).current;
    const descTranslateY = useRef(new Animated.Value(20)).current;
    const buttonOpacity = useRef(new Animated.Value(0)).current;

    const animateSlide = () => {
        // Reset
        emojiScale.setValue(0);
        titleOpacity.setValue(0);
        titleTranslateY.setValue(30);
        descOpacity.setValue(0);
        descTranslateY.setValue(20);
        buttonOpacity.setValue(0);

        Animated.stagger(150, [
            Animated.spring(emojiScale, {
                toValue: 1,
                tension: 50,
                friction: 6,
                useNativeDriver: true,
            }),
            Animated.parallel([
                Animated.timing(titleOpacity, {
                    toValue: 1,
                    duration: 500,
                    useNativeDriver: true,
                }),
                Animated.spring(titleTranslateY, {
                    toValue: 0,
                    tension: 60,
                    friction: 8,
                    useNativeDriver: true,
                }),
            ]),
            Animated.parallel([
                Animated.timing(descOpacity, {
                    toValue: 1,
                    duration: 400,
                    useNativeDriver: true,
                }),
                Animated.spring(descTranslateY, {
                    toValue: 0,
                    tension: 60,
                    friction: 8,
                    useNativeDriver: true,
                }),
            ]),
            Animated.timing(buttonOpacity, {
                toValue: 1,
                duration: 300,
                useNativeDriver: true,
            }),
        ]).start();
    };

    useEffect(() => {
        animateSlide();
    }, [activeIndex]);

    const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
        const offsetX = event.nativeEvent.contentOffset.x;
        const index = Math.round(offsetX / width);
        if (index !== activeIndex && index >= 0 && index < slides.length) {
            setActiveIndex(index);
        }
    };

    const goToNext = () => {
        if (activeIndex < slides.length - 1) {
            scrollViewRef.current?.scrollTo({
                x: (activeIndex + 1) * width,
                animated: true,
            });
        }
    };

    const completeOnboarding = async () => {
        try {
            await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
        } catch {}
        navigation.reset({
            index: 0,
            routes: [{ name: 'Login' }],
        });
    };

    const isLastSlide = activeIndex === slides.length - 1;
    const currentSlide = slides[activeIndex];

    return (
        <View style={[styles.container, { backgroundColor: currentSlide.bgColor }]}>
            {/* Background gradient circles */}
            <View
                style={[
                    styles.bgCircle,
                    styles.bgCircle1,
                    { backgroundColor: currentSlide.accentColor },
                ]}
            />
            <View
                style={[
                    styles.bgCircle,
                    styles.bgCircle2,
                    { backgroundColor: currentSlide.accentColor },
                ]}
            />

            {/* Skip button */}
            <TouchableOpacity style={styles.skipButton} onPress={completeOnboarding}>
                <Text style={styles.skipText}>Saltar</Text>
            </TouchableOpacity>

            {/* Slides */}
            <ScrollView
                ref={scrollViewRef}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onMomentumScrollEnd={handleScroll}
                scrollEventThrottle={16}
                bounces={false}
            >
                {slides.map((slide, index) => (
                    <View key={index} style={styles.slide}>
                        <View style={styles.slideContent}>
                            <Animated.Text
                                style={[
                                    styles.emoji,
                                    {
                                        transform: [
                                            {
                                                scale:
                                                    index === activeIndex ? emojiScale : 1,
                                            },
                                        ],
                                    },
                                ]}
                            >
                                {slide.emoji}
                            </Animated.Text>

                            <Animated.Text
                                style={[
                                    styles.title,
                                    index === activeIndex && {
                                        opacity: titleOpacity,
                                        transform: [{ translateY: titleTranslateY }],
                                    },
                                ]}
                            >
                                {slide.title}
                            </Animated.Text>

                            <Animated.Text
                                style={[
                                    styles.description,
                                    index === activeIndex && {
                                        opacity: descOpacity,
                                        transform: [{ translateY: descTranslateY }],
                                    },
                                ]}
                            >
                                {slide.description}
                            </Animated.Text>
                        </View>
                    </View>
                ))}
            </ScrollView>

            {/* Bottom section */}
            <View style={styles.bottomSection}>
                {/* Pagination dots */}
                <View style={styles.pagination}>
                    {slides.map((slide, index) => (
                        <View
                            key={index}
                            style={[
                                styles.dot,
                                index === activeIndex
                                    ? [styles.dotActive, { backgroundColor: slide.accentColor }]
                                    : styles.dotInactive,
                            ]}
                        />
                    ))}
                </View>

                {/* Action button */}
                <Animated.View style={{ opacity: buttonOpacity, width: '100%' }}>
                    <TouchableOpacity
                        style={[
                            styles.actionButton,
                            { backgroundColor: currentSlide.accentColor },
                        ]}
                        onPress={isLastSlide ? completeOnboarding : goToNext}
                        activeOpacity={0.8}
                    >
                        <Text style={styles.actionButtonText}>
                            {isLastSlide ? 'Comenzar' : 'Siguiente'}
                        </Text>
                    </TouchableOpacity>
                </Animated.View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    bgCircle: {
        position: 'absolute',
        borderRadius: 999,
        opacity: 0.08,
    },
    bgCircle1: {
        width: 400,
        height: 400,
        top: -100,
        right: -100,
    },
    bgCircle2: {
        width: 300,
        height: 300,
        bottom: -50,
        left: -80,
    },
    skipButton: {
        position: 'absolute',
        top: 56,
        right: 24,
        zIndex: 10,
        paddingVertical: 8,
        paddingHorizontal: 16,
    },
    skipText: {
        color: 'rgba(255,255,255,0.6)',
        fontSize: 16,
        fontWeight: '500',
    },
    slide: {
        width,
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    slideContent: {
        alignItems: 'center',
        paddingHorizontal: 40,
        paddingBottom: 120,
    },
    emoji: {
        fontSize: 100,
        marginBottom: 32,
    },
    title: {
        fontSize: 32,
        fontWeight: '800',
        color: '#FFFFFF',
        textAlign: 'center',
        marginBottom: 16,
        letterSpacing: -0.5,
    },
    description: {
        fontSize: 17,
        color: 'rgba(255,255,255,0.7)',
        textAlign: 'center',
        lineHeight: 26,
        paddingHorizontal: 8,
    },
    bottomSection: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        paddingBottom: 50,
        paddingHorizontal: 32,
        alignItems: 'center',
    },
    pagination: {
        flexDirection: 'row',
        marginBottom: 32,
    },
    dot: {
        height: 8,
        borderRadius: 4,
        marginHorizontal: 5,
    },
    dotActive: {
        width: 28,
    },
    dotInactive: {
        width: 8,
        backgroundColor: 'rgba(255,255,255,0.25)',
    },
    actionButton: {
        paddingVertical: 18,
        borderRadius: 16,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.25,
        shadowRadius: 12,
        elevation: 8,
    },
    actionButtonText: {
        color: '#FFFFFF',
        fontSize: 18,
        fontWeight: '700',
        letterSpacing: 0.3,
    },
});
