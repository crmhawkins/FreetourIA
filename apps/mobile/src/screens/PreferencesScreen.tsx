import React, { useState, useRef, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    Animated,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useStore } from '../store/useStore';
import { useTheme } from '../theme/theme';

export default function PreferencesScreen({ navigation }: any) {
    const { t } = useTranslation();
    const { setPreferences } = useStore();
    const theme = useTheme();
    const c = theme.colors;

    const [travelType, setTravelType] = useState<string | null>(null);
    const [experienceType, setExperienceType] = useState<string | null>(null);
    const [effortLevel, setEffortLevel] = useState<string | null>(null);

    const progressAnim = useRef(new Animated.Value(0)).current;
    const fadeAnim = useRef(new Animated.Value(0)).current;

    const selectedCount = [travelType, experienceType, effortLevel].filter(Boolean).length;
    const progressPercent = selectedCount / 3;

    useEffect(() => {
        Animated.parallel([
            Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
            Animated.spring(progressAnim, {
                toValue: progressPercent,
                tension: 60,
                friction: 10,
                useNativeDriver: false,
            }),
        ]).start();
    }, [progressPercent]);

    const TRAVEL_TYPES = [
        { id: 'solo', label: t('solo', 'Solo'), icon: '🧳', hint: t('soloHint', 'A tu ritmo') },
        { id: 'couple', label: t('couple', 'Pareja'), icon: '💑', hint: t('coupleHint', 'Romántico') },
        { id: 'kids', label: t('kids', 'Con niños'), icon: '👨‍👩‍👧‍👦', hint: t('kidsHint', 'Familiar') },
        { id: 'senior', label: t('senior', 'Senior'), icon: '👴', hint: t('seniorHint', 'Sin prisas') },
        { id: 'group', label: t('group', 'Grupo'), icon: '👥', hint: t('groupHint', 'En pandilla') },
    ];

    const EXPERIENCE_TYPES = [
        { id: 'classic', label: t('classic', 'Clásica'), icon: '🏛️', hint: t('classicHint', 'Monumentos') },
        { id: 'alternative', label: t('alternative', 'Alternativa'), icon: '🎨', hint: t('alternativeHint', 'Diferente') },
        { id: 'food', label: t('food', 'Gastronómica'), icon: '🍝', hint: t('foodHint', 'Sabores') },
        { id: 'photo', label: t('photo', 'Fotográfica'), icon: '📸', hint: t('photoHint', 'Shots') },
        { id: 'history', label: t('history', 'Historia'), icon: '📚', hint: t('historyHint', 'En profundidad') },
    ];

    const EFFORT_LEVELS = [
        { id: 'light', label: t('light', 'Suave'), icon: '🚶', desc: t('lightDesc', '1–2 km · sin cuestas') },
        { id: 'normal', label: t('normal', 'Normal'), icon: '🚶‍♂️', desc: t('normalDesc', '3–5 km · ligero') },
        { id: 'intense', label: t('intense', 'Potente'), icon: '🏃', desc: t('intenseDesc', '6+ km · completo') },
    ];

    const handleContinue = () => {
        if (travelType && experienceType && effortLevel) {
            setPreferences({ travelType, experienceType, effortLevel });
            (navigation as any).navigate('MainTabs', { screen: 'Routes' });
        }
    };

    const allSelected = travelType && experienceType && effortLevel;

    const progressWidth = progressAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ['0%', '100%'],
    });

    return (
        <View style={[styles.root, { backgroundColor: c.background }]}>
            {/* ── Progress bar header ── */}
            <View style={[styles.progressHeader, { backgroundColor: c.surface, borderBottomColor: c.border }]}>
                <View style={styles.progressLabels}>
                    <Text style={[styles.progressTitle, { color: c.text }]}>
                        {t('customizeExperience', 'Personaliza tu experiencia')}
                    </Text>
                    <Text style={[styles.progressCount, { color: c.primary }]}>
                        {selectedCount}/3
                    </Text>
                </View>
                <View style={[styles.progressTrack, { backgroundColor: c.border }]}>
                    <Animated.View
                        style={[styles.progressFill, { width: progressWidth, backgroundColor: c.primary }]}
                    />
                </View>
                <Text style={[styles.progressHint, { color: c.textTertiary }]}>
                    {selectedCount === 0
                        ? t('prefStep0', 'Elige tus preferencias para continuar')
                        : selectedCount === 1
                        ? t('prefStep1', '¡Buen comienzo! Dos más...')
                        : selectedCount === 2
                        ? t('prefStep2', '¡Ya casi! Solo falta uno')
                        : t('prefStepDone', '¡Perfecto! Ya puedes explorar')}
                </Text>
            </View>

            <Animated.ScrollView
                style={{ opacity: fadeAnim }}
                contentContainerStyle={styles.scroll}
                showsVerticalScrollIndicator={false}
            >
                {/* ── Section 1: Who travels ── */}
                <SectionHeader
                    step={1}
                    done={!!travelType}
                    title={t('whoTraveling', '¿Con quién viajas?')}
                    colors={{ primary: c.primary, text: c.text, textTertiary: c.textTertiary, surface: c.surface }}
                />
                <View style={styles.grid}>
                    {TRAVEL_TYPES.map((type) => (
                        <OptionCard
                            key={type.id}
                            icon={type.icon}
                            label={type.label}
                            hint={type.hint}
                            selected={travelType === type.id}
                            onPress={() => setTravelType(type.id)}
                            colors={{ primary: c.primary, primaryLight: c.primaryLight, surface: c.surface, text: c.text, textTertiary: c.textTertiary, border: c.border }}
                        />
                    ))}
                </View>

                {/* ── Section 2: Experience ── */}
                <SectionHeader
                    step={2}
                    done={!!experienceType}
                    title={t('whatExperience', '¿Qué tipo de experiencia?')}
                    colors={{ primary: c.primary, text: c.text, textTertiary: c.textTertiary, surface: c.surface }}
                />
                <View style={styles.grid}>
                    {EXPERIENCE_TYPES.map((type) => (
                        <OptionCard
                            key={type.id}
                            icon={type.icon}
                            label={type.label}
                            hint={type.hint}
                            selected={experienceType === type.id}
                            onPress={() => setExperienceType(type.id)}
                            colors={{ primary: c.primary, primaryLight: c.primaryLight, surface: c.surface, text: c.text, textTertiary: c.textTertiary, border: c.border }}
                        />
                    ))}
                </View>

                {/* ── Section 3: Effort ── */}
                <SectionHeader
                    step={3}
                    done={!!effortLevel}
                    title={t('effortLevel', '¿Cuánta caña le metemos?')}
                    colors={{ primary: c.primary, text: c.text, textTertiary: c.textTertiary, surface: c.surface }}
                />
                <View style={styles.effortRow}>
                    {EFFORT_LEVELS.map((level) => (
                        <TouchableOpacity
                            key={level.id}
                            style={[
                                styles.effortCard,
                                { backgroundColor: c.surface, borderColor: c.border },
                                effortLevel === level.id && { borderColor: c.primary, backgroundColor: c.primaryLight },
                            ]}
                            onPress={() => setEffortLevel(level.id)}
                            activeOpacity={0.75}
                        >
                            <Text style={styles.effortIcon}>{level.icon}</Text>
                            <Text style={[
                                styles.effortLabel,
                                { color: c.text },
                                effortLevel === level.id && { color: c.primary, fontWeight: '700' },
                            ]}>
                                {level.label}
                            </Text>
                            <Text style={[styles.effortDesc, { color: c.textTertiary }]}>
                                {level.desc}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* ── CTA ── */}
                <TouchableOpacity
                    style={[
                        styles.continueButton,
                        { backgroundColor: allSelected ? c.primary : c.border },
                    ]}
                    onPress={handleContinue}
                    disabled={!allSelected}
                    activeOpacity={0.85}
                >
                    <Text style={[
                        styles.continueButtonText,
                        { color: allSelected ? '#FFF' : c.textTertiary },
                    ]}>
                        {allSelected
                            ? t('viewRoutes', 'Ver rutas recomendadas') + ' →'
                            : t('selectAll', 'Completa las 3 secciones')}
                    </Text>
                </TouchableOpacity>

                <View style={{ height: 40 }} />
            </Animated.ScrollView>
        </View>
    );
}

// ── Sub-components ──

function SectionHeader({
    step,
    done,
    title,
    colors,
}: {
    step: number;
    done: boolean;
    title: string;
    colors: { primary: string; text: string; textTertiary: string; surface: string };
}) {
    return (
        <View style={sectionStyles.row}>
            <View style={[sectionStyles.stepBadge, { backgroundColor: done ? colors.primary : colors.surface }]}>
                <Text style={[sectionStyles.stepText, { color: done ? '#FFF' : colors.textTertiary }]}>
                    {done ? '✓' : step}
                </Text>
            </View>
            <Text style={[sectionStyles.title, { color: colors.text }]}>{title}</Text>
        </View>
    );
}

const sectionStyles = StyleSheet.create({
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 14,
        marginTop: 24,
    },
    stepBadge: {
        width: 28,
        height: 28,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 10,
    },
    stepText: {
        fontSize: 13,
        fontWeight: '700',
    },
    title: {
        fontSize: 17,
        fontWeight: '700',
    },
});

function OptionCard({
    icon,
    label,
    hint,
    selected,
    onPress,
    colors,
}: {
    icon: string;
    label: string;
    hint: string;
    selected: boolean;
    onPress: () => void;
    colors: { primary: string; primaryLight: string; surface: string; text: string; textTertiary: string; border: string };
}) {
    const scaleAnim = useRef(new Animated.Value(1)).current;

    const handlePress = () => {
        Animated.sequence([
            Animated.timing(scaleAnim, { toValue: 0.94, duration: 80, useNativeDriver: true }),
            Animated.spring(scaleAnim, { toValue: 1, tension: 200, friction: 10, useNativeDriver: true }),
        ]).start();
        onPress();
    };

    return (
        <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
            <TouchableOpacity
                style={[
                    optionStyles.card,
                    { backgroundColor: colors.surface, borderColor: colors.border },
                    selected && { borderColor: colors.primary, backgroundColor: colors.primaryLight },
                ]}
                onPress={handlePress}
                activeOpacity={0.8}
            >
                <Text style={optionStyles.icon}>{icon}</Text>
                <View style={{ flex: 1 }}>
                    <Text style={[optionStyles.label, { color: colors.text }, selected && { color: colors.primary }]}>
                        {label}
                    </Text>
                    <Text style={[optionStyles.hint, { color: colors.textTertiary }]}>{hint}</Text>
                </View>
                {selected && (
                    <View style={[optionStyles.checkmark, { backgroundColor: colors.primary }]}>
                        <Text style={optionStyles.checkmarkText}>✓</Text>
                    </View>
                )}
            </TouchableOpacity>
        </Animated.View>
    );
}

const optionStyles = StyleSheet.create({
    card: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 14,
        borderRadius: 14,
        borderWidth: 1.5,
        marginBottom: 8,
    },
    icon: {
        fontSize: 26,
        marginRight: 14,
    },
    label: {
        fontSize: 15,
        fontWeight: '600',
    },
    hint: {
        fontSize: 12,
        marginTop: 1,
    },
    checkmark: {
        width: 24,
        height: 24,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: 8,
    },
    checkmarkText: {
        color: '#FFF',
        fontSize: 13,
        fontWeight: '700',
    },
});

const styles = StyleSheet.create({
    root: {
        flex: 1,
    },
    progressHeader: {
        paddingHorizontal: 20,
        paddingTop: 16,
        paddingBottom: 16,
        borderBottomWidth: 1,
    },
    progressLabels: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    progressTitle: {
        fontSize: 17,
        fontWeight: '700',
    },
    progressCount: {
        fontSize: 16,
        fontWeight: '700',
    },
    progressTrack: {
        height: 5,
        borderRadius: 3,
        overflow: 'hidden',
        marginBottom: 8,
    },
    progressFill: {
        height: '100%',
        borderRadius: 3,
    },
    progressHint: {
        fontSize: 13,
    },
    scroll: {
        paddingHorizontal: 20,
        paddingTop: 4,
    },
    grid: {
        gap: 0,
    },
    effortRow: {
        flexDirection: 'row',
        gap: 10,
        marginBottom: 8,
    },
    effortCard: {
        flex: 1,
        alignItems: 'center',
        paddingVertical: 18,
        paddingHorizontal: 8,
        borderRadius: 14,
        borderWidth: 1.5,
    },
    effortIcon: {
        fontSize: 28,
        marginBottom: 8,
    },
    effortLabel: {
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 4,
        textAlign: 'center',
    },
    effortDesc: {
        fontSize: 11,
        textAlign: 'center',
        lineHeight: 15,
    },
    continueButton: {
        padding: 18,
        borderRadius: 16,
        alignItems: 'center',
        marginTop: 24,
        shadowColor: '#007AFF',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 4,
    },
    continueButtonText: {
        fontSize: 17,
        fontWeight: '700',
    },
});
