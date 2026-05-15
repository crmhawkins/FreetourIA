import React, { useState, useRef, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TouchableOpacity,
    TextInput,
    Animated,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import apiClient from '../services/apiClient';
import shareService from '../services/shareService';

interface RatingModalProps {
    visible: boolean;
    routeId: string;
    routeName: string;
    city: string;
    onClose: () => void;
}

export default function RatingModal({ visible, routeId, routeName, city, onClose }: RatingModalProps) {
    const { t } = useTranslation();
    const [rating, setRating] = useState(0);
    const [comment, setComment] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [submitError, setSubmitError] = useState<string | null>(null);
    const starAnims = useRef([1, 2, 3, 4, 5].map(() => new Animated.Value(1))).current;
    const fadeAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (visible) {
            setRating(0);
            setComment('');
            setSubmitted(false);
            setSubmitError(null);
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 300,
                useNativeDriver: true,
            }).start();
        } else {
            fadeAnim.setValue(0);
        }
    }, [visible]);

    const handleStarPress = (starIndex: number) => {
        setRating(starIndex);
        // Bounce animation for selected star
        Animated.sequence([
            Animated.timing(starAnims[starIndex - 1], {
                toValue: 1.4,
                duration: 150,
                useNativeDriver: true,
            }),
            Animated.spring(starAnims[starIndex - 1], {
                toValue: 1,
                friction: 3,
                tension: 100,
                useNativeDriver: true,
            }),
        ]).start();
    };

    const handleSubmit = async () => {
        if (rating === 0) return;
        setSubmitting(true);
        try {
            await apiClient.post('/ratings', {
                routeId,
                rating,
                comment: comment.trim() || undefined,
            });
            setSubmitted(true);
        } catch (error: any) {
            const msg = error.response?.data?.message || 'No se pudo enviar la valoración. Inténtalo de nuevo.';
            setSubmitError(typeof msg === 'string' ? msg : msg[0]);
        } finally {
            setSubmitting(false);
        }
    };

    const handleShare = async () => {
        try {
            await shareService.shareRating(routeName, city, rating);
        } catch (error) {
            console.error('Share error:', error);
        }
    };

    const handleClose = () => {
        onClose();
    };

    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
            <KeyboardAvoidingView
                style={styles.overlay}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            >
                <Animated.View style={[styles.modalContainer, { opacity: fadeAnim }]}>
                    <View style={styles.modal}>
                        {/* Close button */}
                        <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
                            <Text style={styles.closeButtonText}>{'\u2715'}</Text>
                        </TouchableOpacity>

                        {!submitted ? (
                            <>
                                {/* Header */}
                                <Text style={styles.title}>
                                    {t('rateTitle', 'Valora la ruta')}
                                </Text>
                                <Text style={styles.routeName}>{routeName}</Text>
                                <Text style={styles.cityName}>{city}</Text>

                                {/* Stars */}
                                <View style={styles.starsContainer}>
                                    {[1, 2, 3, 4, 5].map((star) => (
                                        <TouchableOpacity
                                            key={star}
                                            onPress={() => handleStarPress(star)}
                                            activeOpacity={0.7}
                                        >
                                            <Animated.Text
                                                style={[
                                                    styles.star,
                                                    {
                                                        transform: [{ scale: starAnims[star - 1] }],
                                                        opacity: star <= rating ? 1 : 0.3,
                                                    },
                                                ]}
                                            >
                                                {'\u2B50'}
                                            </Animated.Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>

                                {rating > 0 && (
                                    <Text style={styles.ratingLabel}>
                                        {rating === 1 && (t('rating1', 'Mejorable'))}
                                        {rating === 2 && (t('rating2', 'Regular'))}
                                        {rating === 3 && (t('rating3', 'Bien'))}
                                        {rating === 4 && (t('rating4', 'Muy bien'))}
                                        {rating === 5 && (t('rating5', 'Excelente!'))}
                                    </Text>
                                )}

                                {/* Comment input */}
                                <TextInput
                                    style={styles.commentInput}
                                    placeholder={t('addComment', 'Escribe un comentario (opcional)...')}
                                    placeholderTextColor="#AAA"
                                    value={comment}
                                    onChangeText={setComment}
                                    multiline
                                    numberOfLines={3}
                                    maxLength={500}
                                    textAlignVertical="top"
                                />

                                {submitError && (
                                    <Text style={{ color: '#FF3B30', fontSize: 13, textAlign: 'center', marginBottom: 10 }}>
                                        {submitError}
                                    </Text>
                                )}

                                {/* Submit button */}
                                <TouchableOpacity
                                    style={[
                                        styles.submitButton,
                                        rating === 0 && styles.submitButtonDisabled,
                                    ]}
                                    onPress={handleSubmit}
                                    disabled={rating === 0 || submitting}
                                >
                                    {submitting ? (
                                        <ActivityIndicator size="small" color="#FFF" />
                                    ) : (
                                        <Text style={styles.submitButtonText}>
                                            {t('submitRating', 'Enviar valoracion')}
                                        </Text>
                                    )}
                                </TouchableOpacity>
                            </>
                        ) : (
                            <>
                                {/* Success state */}
                                <Text style={styles.successEmoji}>{'\u{1F389}'}</Text>
                                <Text style={styles.successTitle}>
                                    {t('thankYou', 'Gracias por tu valoracion!')}
                                </Text>
                                <Text style={styles.successSubtitle}>
                                    {t('ratingHelps', 'Tu opinion nos ayuda a mejorar')}
                                </Text>

                                {/* Share button */}
                                <TouchableOpacity style={styles.shareButton} onPress={handleShare}>
                                    <Text style={styles.shareButtonText}>
                                        {'\u{1F4E4}'} {t('shareExperience', 'Comparte tu experiencia!')}
                                    </Text>
                                </TouchableOpacity>

                                {/* Done button */}
                                <TouchableOpacity style={styles.doneButton} onPress={handleClose}>
                                    <Text style={styles.doneButtonText}>
                                        {t('done', 'Listo')}
                                    </Text>
                                </TouchableOpacity>
                            </>
                        )}
                    </View>
                </Animated.View>
            </KeyboardAvoidingView>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContainer: {
        width: '90%',
        maxWidth: 400,
    },
    modal: {
        backgroundColor: '#FFF',
        borderRadius: 24,
        padding: 28,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.2,
        shadowRadius: 20,
        elevation: 15,
    },
    closeButton: {
        position: 'absolute',
        top: 16,
        right: 16,
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#F0F0F0',
        justifyContent: 'center',
        alignItems: 'center',
    },
    closeButtonText: {
        fontSize: 16,
        color: '#999',
        fontWeight: '600',
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#1A1A1A',
        marginTop: 8,
        marginBottom: 4,
    },
    routeName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#007AFF',
        marginBottom: 2,
        textAlign: 'center',
    },
    cityName: {
        fontSize: 14,
        color: '#999',
        marginBottom: 24,
    },
    starsContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginBottom: 12,
        gap: 8,
    },
    star: {
        fontSize: 40,
    },
    ratingLabel: {
        fontSize: 16,
        fontWeight: '600',
        color: '#FFB800',
        marginBottom: 20,
    },
    commentInput: {
        width: '100%',
        minHeight: 80,
        borderWidth: 1,
        borderColor: '#E0E0E0',
        borderRadius: 14,
        padding: 14,
        fontSize: 15,
        color: '#333',
        backgroundColor: '#FAFAFA',
        marginBottom: 20,
    },
    submitButton: {
        width: '100%',
        backgroundColor: '#FFD700',
        padding: 16,
        borderRadius: 14,
        alignItems: 'center',
    },
    submitButtonDisabled: {
        backgroundColor: '#E0E0E0',
    },
    submitButtonText: {
        fontSize: 17,
        fontWeight: '700',
        color: '#333',
    },
    successEmoji: {
        fontSize: 64,
        marginBottom: 16,
        marginTop: 8,
    },
    successTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#1A1A1A',
        marginBottom: 8,
        textAlign: 'center',
    },
    successSubtitle: {
        fontSize: 15,
        color: '#666',
        marginBottom: 28,
        textAlign: 'center',
    },
    shareButton: {
        width: '100%',
        backgroundColor: '#007AFF',
        padding: 16,
        borderRadius: 14,
        alignItems: 'center',
        marginBottom: 12,
    },
    shareButtonText: {
        fontSize: 16,
        fontWeight: '700',
        color: '#FFF',
    },
    doneButton: {
        width: '100%',
        backgroundColor: '#F0F0F0',
        padding: 16,
        borderRadius: 14,
        alignItems: 'center',
    },
    doneButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#666',
    },
});
