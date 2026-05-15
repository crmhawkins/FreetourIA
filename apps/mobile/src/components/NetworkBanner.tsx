import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import * as Network from 'expo-network';
import { AppState, AppStateStatus } from 'react-native';

export default function NetworkBanner() {
    const [isOffline, setIsOffline] = useState(false);
    const slideAnim = useState(() => new Animated.Value(0))[0];

    const checkConnection = async () => {
        try {
            const state = await Network.getNetworkStateAsync();
            const offline = !state.isConnected || !state.isInternetReachable;
            setIsOffline(offline ?? false);

            Animated.timing(slideAnim, {
                toValue: offline ? 1 : 0,
                duration: 300,
                useNativeDriver: true,
            }).start();
        } catch {
            // If we can't check network, assume we're online
        }
    };

    useEffect(() => {
        checkConnection();

        // Re-check when app comes to foreground
        const subscription = AppState.addEventListener('change', (nextState: AppStateStatus) => {
            if (nextState === 'active') {
                checkConnection();
            }
        });

        // Poll every 30 seconds
        const interval = setInterval(checkConnection, 30000);

        return () => {
            subscription.remove();
            clearInterval(interval);
        };
    }, []);

    if (!isOffline) return null;

    return (
        <Animated.View
            style={[
                styles.banner,
                {
                    opacity: slideAnim,
                    transform: [
                        {
                            translateY: slideAnim.interpolate({
                                inputRange: [0, 1],
                                outputRange: [-44, 0],
                            }),
                        },
                    ],
                },
            ]}
        >
            <Text style={styles.icon}>📵</Text>
            <Text style={styles.text}>Sin conexión · Usando modo offline</Text>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    banner: {
        backgroundColor: '#FF3B30',
        paddingVertical: 10,
        paddingHorizontal: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
    },
    icon: {
        fontSize: 16,
    },
    text: {
        color: '#FFFFFF',
        fontSize: 13,
        fontWeight: '600',
    },
});
