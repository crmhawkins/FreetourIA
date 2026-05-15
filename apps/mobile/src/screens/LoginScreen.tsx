import React, { useState, useRef } from 'react';
import {
    View,
    Text,
    TextInput,
    StyleSheet,
    TouchableOpacity,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useStore } from '../store/useStore';
import apiClient from '../services/apiClient';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function LoginScreen({ navigation }: any) {
    const { t } = useTranslation();
    const { setUser } = useStore();

    const [isRegister, setIsRegister] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showPassword, setShowPassword] = useState(false);
    const [emailError, setEmailError] = useState<string | null>(null);
    const submittingRef = useRef(false);

    const validateEmail = (value: string) => {
        if (!value.trim()) {
            setEmailError(t('emailRequired', 'El email es obligatorio'));
            return false;
        }
        if (!EMAIL_REGEX.test(value.trim())) {
            setEmailError(t('emailInvalid', 'Introduce un email válido'));
            return false;
        }
        setEmailError(null);
        return true;
    };

    const getPasswordStrength = (pwd: string) => {
        if (!isRegister || !pwd) return null;
        const checks = [
            pwd.length >= 8,
            /[A-Z]/.test(pwd),
            /[a-z]/.test(pwd),
            /\d/.test(pwd),
        ];
        const score = checks.filter(Boolean).length;
        if (score <= 1) return { label: t('pwWeak', 'Débil'), color: '#F44336', score: 1 };
        if (score <= 2) return { label: t('pwFair', 'Regular'), color: '#FF9800', score: 2 };
        if (score <= 3) return { label: t('pwGood', 'Buena'), color: '#4CAF50', score: 3 };
        return { label: t('pwStrong', 'Fuerte'), color: '#2196F3', score: 4 };
    };

    const handleSubmit = async () => {
        if (submittingRef.current) return;
        setError(null);

        if (!validateEmail(email)) return;

        if (!password.trim()) {
            setError(t('passwordRequired', 'La contraseña es obligatoria'));
            return;
        }

        if (isRegister) {
            if (!name.trim()) {
                setError(t('fillName', 'Por favor, introduce tu nombre'));
                return;
            }
            if (password.length < 8) {
                setError(t('pwTooShort', 'La contraseña debe tener al menos 8 caracteres'));
                return;
            }
            if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
                setError(t('pwRequirements', 'La contraseña debe tener mayúsculas, minúsculas y números'));
                return;
            }
        }

        submittingRef.current = true;
        setLoading(true);

        try {
            if (isRegister) {
                // Register returns token directly — no need for separate login call
                const response = await apiClient.post('/auth/register', {
                    email: email.trim().toLowerCase(),
                    password,
                    name: name.trim(),
                });
                const { access_token, user } = response.data;
                setUser({ id: user.id, email: user.email, name: user.name, token: access_token });
            } else {
                const response = await apiClient.post('/auth/login', {
                    email: email.trim().toLowerCase(),
                    password,
                });
                const { access_token, user } = response.data;
                setUser({ id: user.id, email: user.email, name: user.name, token: access_token });
            }

            navigation.reset({ index: 0, routes: [{ name: 'MainTabs' }] });
        } catch (err: any) {
            const status = err.response?.status;
            const serverMessage = err.response?.data?.message;

            if (status === 409) {
                setError(t('emailInUse', 'Este email ya tiene una cuenta. ¿Quieres iniciar sesión?'));
            } else if (status === 401) {
                setError(t('loginError', 'Email o contraseña incorrectos'));
            } else if (status === 400 && Array.isArray(serverMessage)) {
                setError(serverMessage[0]);
            } else if (typeof serverMessage === 'string') {
                setError(serverMessage);
            } else if (err.userMessage) {
                setError(err.userMessage);
            } else {
                setError(
                    isRegister
                        ? t('registerError', 'Error al registrarse. Inténtalo de nuevo.')
                        : t('loginError', 'Email o contraseña incorrectos')
                );
            }
        } finally {
            setLoading(false);
            submittingRef.current = false;
        }
    };

    const handleSkip = () => {
        navigation.reset({ index: 0, routes: [{ name: 'MainTabs' }] });
    };

    const pwStrength = getPasswordStrength(password);

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            <ScrollView
                contentContainerStyle={styles.scrollContent}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
            >
                {/* Header */}
                <View style={styles.header}>
                    <Text style={styles.logo}>FreeTour IA</Text>
                    <Text style={styles.tagline}>
                        {t('appSubtitle', 'Tu guía turístico personal')}
                    </Text>
                </View>

                {/* Form */}
                <View style={styles.form}>
                    <Text style={styles.formTitle}>
                        {isRegister ? t('createAccount', 'Crear cuenta') : t('login', 'Iniciar sesión')}
                    </Text>

                    {isRegister && (
                        <TextInput
                            style={styles.input}
                            placeholder={t('namePlaceholder', 'Tu nombre')}
                            placeholderTextColor="#999"
                            value={name}
                            onChangeText={setName}
                            autoCapitalize="words"
                            returnKeyType="next"
                        />
                    )}

                    <View>
                        <TextInput
                            style={[styles.input, emailError && styles.inputError]}
                            placeholder={t('emailPlaceholder', 'Email')}
                            placeholderTextColor="#999"
                            value={email}
                            onChangeText={(v) => {
                                setEmail(v);
                                if (emailError) validateEmail(v);
                            }}
                            onBlur={() => email && validateEmail(email)}
                            keyboardType="email-address"
                            autoCapitalize="none"
                            autoCorrect={false}
                            returnKeyType="next"
                        />
                        {emailError && <Text style={styles.fieldError}>{emailError}</Text>}
                    </View>

                    <View>
                        <View style={styles.passwordContainer}>
                            <TextInput
                                style={[styles.input, styles.passwordInput]}
                                placeholder={t('passwordPlaceholder', 'Contraseña')}
                                placeholderTextColor="#999"
                                value={password}
                                onChangeText={setPassword}
                                secureTextEntry={!showPassword}
                                returnKeyType="done"
                                onSubmitEditing={handleSubmit}
                            />
                            <TouchableOpacity
                                style={styles.eyeButton}
                                onPress={() => setShowPassword(!showPassword)}
                            >
                                <Text style={styles.eyeIcon}>{showPassword ? '🙈' : '👁️'}</Text>
                            </TouchableOpacity>
                        </View>
                        {pwStrength && (
                            <View style={styles.strengthRow}>
                                <View style={styles.strengthBar}>
                                    {[1, 2, 3, 4].map((i) => (
                                        <View
                                            key={i}
                                            style={[
                                                styles.strengthSegment,
                                                i <= pwStrength.score
                                                    ? { backgroundColor: pwStrength.color }
                                                    : {},
                                            ]}
                                        />
                                    ))}
                                </View>
                                <Text style={[styles.strengthLabel, { color: pwStrength.color }]}>
                                    {pwStrength.label}
                                </Text>
                            </View>
                        )}
                    </View>

                    {isRegister && (
                        <Text style={styles.passwordHint}>
                            {t('pwHint', 'Mínimo 8 caracteres con mayúsculas, minúsculas y números')}
                        </Text>
                    )}

                    {error && <Text style={styles.errorText}>{error}</Text>}

                    <TouchableOpacity
                        style={[styles.submitButton, loading && styles.disabledButton]}
                        onPress={handleSubmit}
                        disabled={loading}
                        activeOpacity={0.85}
                    >
                        {loading ? (
                            <ActivityIndicator color="#FFF" />
                        ) : (
                            <Text style={styles.submitButtonText}>
                                {isRegister ? t('createAccount', 'Crear cuenta') : t('loginButton', 'Entrar')}
                            </Text>
                        )}
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.switchButton}
                        onPress={() => {
                            setIsRegister(!isRegister);
                            setError(null);
                            setEmailError(null);
                        }}
                    >
                        <Text style={styles.switchText}>
                            {isRegister
                                ? t('hasAccount', '¿Ya tienes cuenta? Inicia sesión')
                                : t('noAccount', '¿No tienes cuenta? Regístrate gratis')}
                        </Text>
                    </TouchableOpacity>
                </View>

                <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
                    <Text style={styles.skipText}>{t('skipLogin', 'Continuar sin cuenta')}</Text>
                </TouchableOpacity>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#007AFF',
    },
    scrollContent: {
        flexGrow: 1,
        justifyContent: 'center',
        padding: 24,
    },
    header: {
        alignItems: 'center',
        marginBottom: 36,
    },
    logo: {
        fontSize: 42,
        fontWeight: 'bold',
        color: '#FFF',
        marginBottom: 8,
    },
    tagline: {
        fontSize: 16,
        color: 'rgba(255,255,255,0.85)',
    },
    form: {
        backgroundColor: '#FFF',
        borderRadius: 24,
        padding: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.15,
        shadowRadius: 16,
        elevation: 10,
    },
    formTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#1A1A1A',
        marginBottom: 20,
        textAlign: 'center',
    },
    input: {
        backgroundColor: '#F5F5F5',
        borderRadius: 14,
        padding: 16,
        fontSize: 16,
        marginBottom: 12,
        color: '#333',
        borderWidth: 1,
        borderColor: '#E8E8E8',
    },
    inputError: {
        borderColor: '#FF3B30',
        borderWidth: 1.5,
    },
    fieldError: {
        color: '#FF3B30',
        fontSize: 12,
        marginTop: -8,
        marginBottom: 8,
        marginLeft: 4,
    },
    passwordContainer: {
        position: 'relative',
        marginBottom: 4,
    },
    passwordInput: {
        paddingRight: 52,
        marginBottom: 0,
    },
    eyeButton: {
        position: 'absolute',
        right: 14,
        top: 0,
        bottom: 0,
        justifyContent: 'center',
        paddingHorizontal: 4,
    },
    eyeIcon: {
        fontSize: 20,
    },
    strengthRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
        marginTop: 6,
    },
    strengthBar: {
        flex: 1,
        flexDirection: 'row',
        gap: 4,
        marginRight: 10,
    },
    strengthSegment: {
        flex: 1,
        height: 4,
        borderRadius: 2,
        backgroundColor: '#E0E0E0',
    },
    strengthLabel: {
        fontSize: 12,
        fontWeight: '600',
        width: 50,
        textAlign: 'right',
    },
    passwordHint: {
        fontSize: 12,
        color: '#999',
        marginBottom: 12,
        marginLeft: 4,
    },
    errorText: {
        color: '#FF3B30',
        fontSize: 14,
        marginBottom: 12,
        textAlign: 'center',
        backgroundColor: '#FFF0F0',
        padding: 10,
        borderRadius: 10,
    },
    submitButton: {
        backgroundColor: '#007AFF',
        padding: 18,
        borderRadius: 14,
        alignItems: 'center',
        marginTop: 6,
        shadowColor: '#007AFF',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 5,
    },
    disabledButton: {
        opacity: 0.7,
    },
    submitButtonText: {
        color: '#FFF',
        fontSize: 18,
        fontWeight: '700',
    },
    switchButton: {
        marginTop: 16,
        alignItems: 'center',
        padding: 8,
    },
    switchText: {
        color: '#007AFF',
        fontSize: 15,
    },
    skipButton: {
        marginTop: 24,
        alignItems: 'center',
        padding: 10,
    },
    skipText: {
        color: 'rgba(255,255,255,0.85)',
        fontSize: 15,
        textDecorationLine: 'underline',
    },
});
