import React, { useEffect, useState, useMemo, useRef } from 'react';
import * as Location from 'expo-location';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { ActivityIndicator, View, Text } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useStore } from './src/store/useStore';
import { useTheme } from './src/theme/theme';
import './src/i18n/i18n';
import ErrorBoundary from './src/components/ErrorBoundary';
import NetworkBanner from './src/components/NetworkBanner';

import OnboardingScreen from './src/screens/OnboardingScreen';
import LoginScreen from './src/screens/LoginScreen';
import HomeScreen from './src/screens/HomeScreen';
import PreferencesScreen from './src/screens/PreferencesScreen';
import RoutesScreen from './src/screens/RoutesScreen';
import GuidanceScreen from './src/screens/GuidanceScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import ExploreScreen from './src/screens/ExploreScreen';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();
const ONBOARDING_KEY = '@hasSeenOnboarding';

function TabIcon({ focused, icon }: { focused: boolean; icon: string; label: string }) {
    return (
        <View style={{ alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontSize: focused ? 24 : 21, opacity: focused ? 1 : 0.45 }}>{icon}</Text>
            {focused && (
                <View
                    style={{
                        width: 4,
                        height: 4,
                        borderRadius: 2,
                        backgroundColor: '#007AFF',
                        marginTop: 3,
                        opacity: 0.9,
                    }}
                />
            )}
        </View>
    );
}

function MainTabs() {
    const theme = useTheme();
    const c = theme.colors;

    return (
        <Tab.Navigator
            detachInactiveScreens={false}
            screenOptions={{
                headerStyle: {
                    backgroundColor: c.headerBackground,
                    elevation: 0,
                    shadowOpacity: 0,
                },
                headerTintColor: c.headerText,
                headerTitleStyle: { fontWeight: 'bold', fontSize: 18 },
                tabBarStyle: {
                    backgroundColor: c.surface,
                    borderTopColor: c.border,
                    borderTopWidth: 0.5,
                    paddingBottom: 8,
                    paddingTop: 4,
                    height: 64,
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: -2 },
                    shadowOpacity: 0.06,
                    shadowRadius: 8,
                    elevation: 8,
                },
                tabBarActiveTintColor: c.primary,
                tabBarInactiveTintColor: c.textSecondary,
                tabBarLabelStyle: { fontSize: 11, fontWeight: '600', marginTop: 0 },
            }}
        >
            <Tab.Screen
                name="Home"
                component={HomeScreen}
                options={{
                    title: 'FreeTour IA',
                    tabBarLabel: 'Inicio',
                    tabBarIcon: ({ focused }) => (
                        <TabIcon focused={focused} icon="🏠" label="Inicio" />
                    ),
                }}
            />
            <Tab.Screen
                name="Routes"
                component={RoutesScreen}
                options={{
                    title: 'Rutas',
                    tabBarLabel: 'Rutas',
                    tabBarIcon: ({ focused }) => (
                        <TabIcon focused={focused} icon="🗺️" label="Rutas" />
                    ),
                }}
            />
            <Tab.Screen
                name="Profile"
                component={ProfileScreen}
                options={{
                    title: 'Perfil',
                    tabBarLabel: 'Perfil',
                    tabBarIcon: ({ focused }) => (
                        <TabIcon focused={focused} icon="👤" label="Perfil" />
                    ),
                }}
            />
        </Tab.Navigator>
    );
}

export default function App() {
    const [ready, setReady] = useState(false);
    const [hasSeenOnboarding, setHasSeenOnboarding] = useState(false);
    const { loadPersistedState, user, setUserLocation, setUserSpeed } = useStore();
    const locationSubRef = useRef<Location.LocationSubscription | null>(null);
    const theme = useTheme();
    const c = theme.colors;

    const navigationTheme = useMemo(
        () => ({
            ...(theme.dark ? DarkTheme : DefaultTheme),
            colors: {
                ...(theme.dark ? DarkTheme.colors : DefaultTheme.colors),
                primary: c.primary,
                background: c.background,
                card: c.headerBackground,
                text: c.headerText,
                border: c.border,
                notification: c.error,
            },
        }),
        [theme.dark, c]
    );

    useEffect(() => {
        Promise.all([
            loadPersistedState(),
            AsyncStorage.getItem(ONBOARDING_KEY).then((value) => {
                setHasSeenOnboarding(value === 'true');
            }),
        ]).finally(() => setReady(true));

        // GPS: solo fix inicial rápido + watch de BAJA frecuencia (30s / 50m).
        // El tracking fino (4s / 8m) lo gestiona ExploreScreen, que es la única
        // fuente de heading. Aquí solo actualizamos ubicación + speed globales.
        (async () => {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') return;
            try {
                const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
                setUserLocation({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
                setUserSpeed(pos.coords.speed ?? 0);
            } catch (_) {}
            locationSubRef.current = await Location.watchPositionAsync(
                { accuracy: Location.Accuracy.Balanced, timeInterval: 30000, distanceInterval: 50 },
                (loc) => {
                    setUserLocation({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
                    setUserSpeed(loc.coords.speed ?? 0);
                }
            );
        })();

        return () => {
            locationSubRef.current?.remove();
        };
    }, []);

    if (!ready) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: c.headerBackground }}>
                <ActivityIndicator size="large" color="#FFF" />
            </View>
        );
    }

    return (
        <ErrorBoundary>
            <NetworkBanner />
            <NavigationContainer theme={navigationTheme}>
                <StatusBar style={c.statusBar as any} />
                <Stack.Navigator
                    initialRouteName={!hasSeenOnboarding ? 'Onboarding' : user ? 'MainTabs' : 'Login'}
                    detachInactiveScreens={false}
                    screenOptions={{
                        headerStyle: {
                            backgroundColor: c.headerBackground,
                            elevation: 0,
                            shadowOpacity: 0,
                        },
                        headerTintColor: c.headerText,
                        headerTitleStyle: { fontWeight: 'bold', fontSize: 18 },
                        cardStyle: { backgroundColor: c.background },
                    }}
                >
                    <Stack.Screen
                        name="Onboarding"
                        component={OnboardingScreen}
                        options={{ headerShown: false }}
                    />
                    <Stack.Screen
                        name="Login"
                        component={LoginScreen}
                        options={{ headerShown: false }}
                    />
                    <Stack.Screen
                        name="MainTabs"
                        component={MainTabs}
                        options={{ headerShown: false }}
                    />
                    <Stack.Screen
                        name="Preferences"
                        component={PreferencesScreen}
                        options={{ title: 'Preferencias' }}
                    />
                    <Stack.Screen
                        name="Guidance"
                        component={GuidanceScreen}
                        options={{ headerShown: false }}
                    />
                    <Stack.Screen
                        name="Explore"
                        component={ExploreScreen}
                        options={{ headerShown: false }}
                    />
                </Stack.Navigator>
            </NavigationContainer>
        </ErrorBoundary>
    );
}
