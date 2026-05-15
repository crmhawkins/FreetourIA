import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    Alert,
    Switch,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useStore } from '../store/useStore';
import { useTheme } from '../theme/theme';
import offlineService from '../services/offlineService';

export default function ProfileScreen({ navigation }: any) {
    const { t, i18n } = useTranslation();
    const { user, logout, language, setLanguage, downloadedRoutes, removeDownloadedRoute, isDarkMode, toggleDarkMode, completedTours, getTotalDistance, getTotalTours } = useStore();
    const theme = useTheme();
    const c = theme.colors;

    const handleLogout = () => {
        Alert.alert(
            t('logoutConfirmTitle', 'Cerrar sesión'),
            t('logoutConfirmMsg', '¿Estás seguro de que quieres cerrar sesión?'),
            [
                { text: t('cancel', 'Cancelar'), style: 'cancel' },
                {
                    text: t('logout', 'Cerrar sesión'),
                    style: 'destructive',
                    onPress: () => {
                        logout();
                        navigation.reset({
                            index: 0,
                            routes: [{ name: 'Login' }],
                        });
                    },
                },
            ]
        );
    };

    const handleChangeLanguage = (lang: string) => {
        setLanguage(lang);
        i18n.changeLanguage(lang);
    };

    const downloadedCount = Object.keys(downloadedRoutes).length;

    const statsRowStyle = { flexDirection: 'row' as const, gap: 10 };
    const statCardStyle = { flex: 1, alignItems: 'center' as const, padding: 16, borderRadius: 14 };
    const statNumberStyle = { fontSize: 24, fontWeight: 'bold' as const, marginBottom: 2 };
    const statLabelStyle = { fontSize: 12 };

    return (
        <ScrollView style={[styles.container, { backgroundColor: c.background }]}>
            {/* User info */}
            <View style={[styles.userCard, { backgroundColor: c.headerBackground }]}>
                {/* Decorative circles for visual depth */}
                <View style={[styles.decorCircle1, { backgroundColor: 'rgba(255,255,255,0.08)' }]} />
                <View style={[styles.decorCircle2, { backgroundColor: 'rgba(255,255,255,0.05)' }]} />

                <View style={[styles.avatarRing, { borderColor: 'rgba(255,255,255,0.4)' }]}>
                    <View style={[styles.avatar, { backgroundColor: c.avatarBackground }]}>
                        <Text style={styles.avatarText}>
                            {user?.name ? user.name.charAt(0).toUpperCase() : '?'}
                        </Text>
                    </View>
                </View>
                <Text style={styles.userName}>{user?.name || t('guest', 'Invitado')}</Text>
                <Text style={styles.userEmail}>{user?.email || t('noAccount', 'Sin cuenta')}</Text>
                {user && (
                    <View style={styles.memberBadge}>
                        <Text style={styles.memberBadgeText}>✦ {t('activeMember', 'Explorador activo')}</Text>
                    </View>
                )}
            </View>

            {/* Stats */}
            <View style={[styles.section, { backgroundColor: c.surface }]}>
                <Text style={[styles.sectionTitle, { color: c.text }]}>{t('yourStats', 'Tus estadísticas')}</Text>
                <View style={statsRowStyle}>
                    <View style={[statCardStyle, { backgroundColor: c.card }]}>
                        <Text style={{ fontSize: 28, marginBottom: 4 }}>🗺️</Text>
                        <Text style={[statNumberStyle, { color: c.primary }]}>{getTotalTours()}</Text>
                        <Text style={[statLabelStyle, { color: c.textTertiary }]}>{t('toursCompleted', 'Tours')}</Text>
                    </View>
                    <View style={[statCardStyle, { backgroundColor: c.card }]}>
                        <Text style={{ fontSize: 28, marginBottom: 4 }}>🚶</Text>
                        <Text style={[statNumberStyle, { color: c.primary }]}>{getTotalDistance().toFixed(1)}</Text>
                        <Text style={[statLabelStyle, { color: c.textTertiary }]}>km</Text>
                    </View>
                    <View style={[statCardStyle, { backgroundColor: c.card }]}>
                        <Text style={{ fontSize: 28, marginBottom: 4 }}>📥</Text>
                        <Text style={[statNumberStyle, { color: c.primary }]}>{Object.keys(downloadedRoutes).length}</Text>
                        <Text style={[statLabelStyle, { color: c.textTertiary }]}>{t('saved', 'Guardadas')}</Text>
                    </View>
                </View>
            </View>

            {/* Language selector */}
            <View style={[styles.section, { backgroundColor: c.surface }]}>
                <Text style={[styles.sectionTitle, { color: c.text }]}>{t('languageSetting', 'Idioma')}</Text>
                <View style={styles.languageButtons}>
                    {[
                        { code: 'es', label: 'Español', flag: '🇪🇸' },
                        { code: 'en', label: 'English', flag: '🇬🇧' },
                        { code: 'fr', label: 'Français', flag: '🇫🇷' },
                        { code: 'de', label: 'Deutsch', flag: '🇩🇪' },
                        { code: 'it', label: 'Italiano', flag: '🇮🇹' },
                    ].map((lang) => (
                        <TouchableOpacity
                            key={lang.code}
                            style={[
                                styles.langButton,
                                { backgroundColor: c.card },
                                language === lang.code && [styles.langButtonActive, { borderColor: c.primary, backgroundColor: c.primaryLight }],
                            ]}
                            onPress={() => handleChangeLanguage(lang.code)}
                        >
                            <Text style={styles.langFlag}>{lang.flag}</Text>
                            <Text
                                style={[
                                    styles.langLabel,
                                    { color: c.textSecondary },
                                    language === lang.code && { color: c.primary, fontWeight: '600' as const },
                                ]}
                            >
                                {lang.label}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </View>

            {/* Dark mode toggle */}
            <View style={[styles.section, { backgroundColor: c.surface }]}>
                <Text style={[styles.sectionTitle, { color: c.text }]}>{t('appearance', 'Apariencia')}</Text>
                <View style={[styles.darkModeRow, { backgroundColor: c.card }]}>
                    <View style={styles.darkModeInfo}>
                        <Text style={[styles.darkModeLabel, { color: c.text }]}>
                            {t('darkMode', 'Modo oscuro')}
                        </Text>
                        <Text style={[styles.darkModeDescription, { color: c.textTertiary }]}>
                            {isDarkMode
                                ? t('darkModeOn', 'Tema oscuro activado')
                                : t('darkModeOff', 'Tema claro activado')}
                        </Text>
                    </View>
                    <Switch
                        value={isDarkMode}
                        onValueChange={toggleDarkMode}
                        trackColor={{ false: '#D1D1D6', true: c.primary }}
                        thumbColor="#FFFFFF"
                    />
                </View>
            </View>

            {/* Downloaded routes */}
            <View style={[styles.section, { backgroundColor: c.surface }]}>
                <Text style={[styles.sectionTitle, { color: c.text }]}>
                    {t('downloadedRoutes', 'Rutas descargadas')} ({downloadedCount})
                </Text>
                {downloadedCount === 0 ? (
                    <Text style={[styles.emptyText, { color: c.textTertiary }]}>
                        {t('noDownloads', 'No tienes rutas descargadas para uso offline')}
                    </Text>
                ) : (
                    Object.entries(downloadedRoutes).map(([id, data]) => (
                        <View key={id} style={[styles.downloadedRoute, { backgroundColor: c.card }]}>
                            <View style={{ flex: 1 }}>
                                <Text style={[styles.downloadedName, { color: c.text }]}>{data.route.name}</Text>
                                <Text style={[styles.downloadedCity, { color: c.textTertiary }]}>{data.route.city}</Text>
                            </View>
                            <TouchableOpacity
                                onPress={() => {
                                    Alert.alert(
                                        t('deleteDownload', 'Eliminar descarga'),
                                        t('deleteDownloadConfirm', '¿Eliminar la ruta offline?'),
                                        [
                                            { text: t('cancel', 'Cancelar'), style: 'cancel' },
                                            {
                                                text: t('delete', 'Eliminar'),
                                                style: 'destructive',
                                                onPress: () => {
                                                    removeDownloadedRoute(id);
                                                    offlineService.removeDownloaded(id).catch(console.error);
                                                },
                                            },
                                        ]
                                    );
                                }}
                                style={[styles.deleteButton, { backgroundColor: c.error }]}
                            >
                                <Text style={styles.deleteText}>🗑️</Text>
                            </TouchableOpacity>
                        </View>
                    ))
                )}
            </View>

            {/* Recent tours */}
            {completedTours.length > 0 && (
                <View style={[styles.section, { backgroundColor: c.surface }]}>
                    <Text style={[styles.sectionTitle, { color: c.text }]}>
                        {t('recentTours', 'Tours recientes')}
                    </Text>
                    {completedTours.slice(0, 5).map((tour, idx) => (
                        <View key={idx} style={[styles.downloadedRoute, { backgroundColor: c.card }]}>
                            <Text style={{ fontSize: 24, marginRight: 12 }}>✅</Text>
                            <View style={{ flex: 1 }}>
                                <Text style={[styles.downloadedName, { color: c.text }]}>{tour.routeName}</Text>
                                <Text style={[styles.downloadedCity, { color: c.textTertiary }]}>
                                    {tour.city} · {tour.distanceKm} km · {tour.pointsCount} paradas
                                </Text>
                            </View>
                        </View>
                    ))}
                </View>
            )}

            {/* Actions */}
            <View style={[styles.section, { backgroundColor: c.surface }]}>
                {user ? (
                    <TouchableOpacity style={[styles.logoutButton, { backgroundColor: c.error }]} onPress={handleLogout}>
                        <Text style={styles.logoutText}>{t('logout', 'Cerrar sesión')}</Text>
                    </TouchableOpacity>
                ) : (
                    <TouchableOpacity
                        style={[styles.loginButton, { backgroundColor: c.primary }]}
                        onPress={() => navigation.navigate('Login')}
                    >
                        <Text style={styles.loginText}>{t('loginButton', 'Iniciar sesión')}</Text>
                    </TouchableOpacity>
                )}
            </View>

            <Text style={[styles.version, { color: c.textTertiary }]}>FreeTour IA v1.0.0</Text>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    userCard: {
        alignItems: 'center',
        paddingVertical: 36,
        paddingHorizontal: 20,
        overflow: 'hidden',
    },
    decorCircle1: {
        position: 'absolute',
        width: 220,
        height: 220,
        borderRadius: 110,
        top: -80,
        right: -60,
    },
    decorCircle2: {
        position: 'absolute',
        width: 160,
        height: 160,
        borderRadius: 80,
        bottom: -40,
        left: -40,
    },
    avatarRing: {
        width: 96,
        height: 96,
        borderRadius: 48,
        borderWidth: 2.5,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 14,
    },
    avatar: {
        width: 84,
        height: 84,
        borderRadius: 42,
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarText: {
        fontSize: 36,
        fontWeight: 'bold',
        color: '#FFF',
    },
    userName: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#FFF',
        marginBottom: 4,
    },
    userEmail: {
        fontSize: 14,
        color: 'rgba(255,255,255,0.8)',
        marginBottom: 12,
    },
    memberBadge: {
        backgroundColor: 'rgba(255,255,255,0.18)',
        paddingHorizontal: 14,
        paddingVertical: 5,
        borderRadius: 20,
    },
    memberBadgeText: {
        color: 'rgba(255,255,255,0.9)',
        fontSize: 12,
        fontWeight: '600',
        letterSpacing: 0.3,
    },
    section: {
        marginTop: 16,
        padding: 20,
        marginHorizontal: 16,
        borderRadius: 16,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '700',
        marginBottom: 16,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    languageButtons: {
        gap: 8,
    },
    langButton: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 14,
        borderRadius: 12,
        marginBottom: 8,
        borderWidth: 2,
        borderColor: 'transparent',
    },
    langButtonActive: {
        borderWidth: 2,
    },
    langFlag: {
        fontSize: 24,
        marginRight: 12,
    },
    langLabel: {
        fontSize: 16,
    },
    darkModeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 14,
        borderRadius: 12,
    },
    darkModeInfo: {
        flex: 1,
        marginRight: 12,
    },
    darkModeLabel: {
        fontSize: 16,
        fontWeight: '600',
    },
    darkModeDescription: {
        fontSize: 13,
        marginTop: 2,
    },
    emptyText: {
        fontSize: 14,
        fontStyle: 'italic',
    },
    downloadedRoute: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderRadius: 12,
        marginBottom: 8,
    },
    downloadedName: {
        fontSize: 15,
        fontWeight: '600',
    },
    downloadedCity: {
        fontSize: 13,
        marginTop: 2,
    },
    deleteButton: {
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
    },
    deleteText: {
        color: '#FFF',
        fontWeight: 'bold',
        fontSize: 14,
    },
    logoutButton: {
        padding: 16,
        borderRadius: 14,
        alignItems: 'center',
    },
    logoutText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: '600',
    },
    loginButton: {
        padding: 16,
        borderRadius: 14,
        alignItems: 'center',
    },
    loginText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: '600',
    },
    version: {
        textAlign: 'center',
        fontSize: 12,
        paddingVertical: 20,
    },
});
