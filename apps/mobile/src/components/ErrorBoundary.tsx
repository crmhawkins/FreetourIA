import React, { Component, ErrorInfo, ReactNode } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

interface Props {
    children: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('ErrorBoundary caught an error:', error, errorInfo);
    }

    handleReset = () => {
        this.setState({ hasError: false, error: null });
    };

    render() {
        if (this.state.hasError) {
            return (
                <View style={styles.container}>
                    <View style={styles.iconCircle}>
                        <Text style={styles.iconText}>!</Text>
                    </View>
                    <Text style={styles.title}>Algo salio mal</Text>
                    <Text style={styles.subtitle}>
                        Ha ocurrido un error inesperado. Por favor, intenta de nuevo.
                    </Text>
                    {__DEV__ && this.state.error && (
                        <View style={styles.debugBox}>
                            <Text style={styles.debugText}>
                                {this.state.error.toString()}
                            </Text>
                        </View>
                    )}
                    <TouchableOpacity
                        style={styles.retryButton}
                        onPress={this.handleReset}
                        activeOpacity={0.8}
                    >
                        <Text style={styles.retryButtonText}>Reintentar</Text>
                    </TouchableOpacity>
                </View>
            );
        }

        return this.props.children;
    }
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#F5F5F5',
        padding: 32,
    },
    iconCircle: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: '#007AFF',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 24,
    },
    iconText: {
        fontSize: 40,
        fontWeight: 'bold',
        color: '#FFFFFF',
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#1A1A1A',
        marginBottom: 12,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 16,
        color: '#666',
        textAlign: 'center',
        lineHeight: 24,
        marginBottom: 32,
        paddingHorizontal: 16,
    },
    debugBox: {
        backgroundColor: '#FFF3F3',
        borderRadius: 12,
        padding: 16,
        marginBottom: 24,
        width: '100%',
        borderWidth: 1,
        borderColor: '#FFD0D0',
    },
    debugText: {
        fontSize: 12,
        color: '#CC0000',
        fontFamily: 'monospace',
    },
    retryButton: {
        backgroundColor: '#007AFF',
        paddingHorizontal: 48,
        paddingVertical: 16,
        borderRadius: 16,
        shadowColor: '#007AFF',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 5,
    },
    retryButtonText: {
        color: '#FFFFFF',
        fontSize: 18,
        fontWeight: '700',
    },
});
