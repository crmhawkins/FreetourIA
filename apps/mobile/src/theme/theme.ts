import { useStore } from '../store/useStore';

export interface Theme {
    dark: boolean;
    colors: {
        background: string;
        surface: string;
        card: string;
        text: string;
        textSecondary: string;
        textTertiary: string;
        primary: string;
        primaryLight: string;
        error: string;
        border: string;
        separator: string;
        inputBackground: string;
        avatarBackground: string;
        headerBackground: string;
        headerText: string;
        statusBar: 'light' | 'dark';
    };
}

export const lightTheme: Theme = {
    dark: false,
    colors: {
        background: '#F5F5F5',
        surface: '#FFFFFF',
        card: '#F8F9FA',
        text: '#333333',
        textSecondary: '#666666',
        textTertiary: '#999999',
        primary: '#007AFF',
        primaryLight: '#E3F2FD',
        error: '#FF3B30',
        border: '#E0E0E0',
        separator: '#EEEEEE',
        inputBackground: '#F8F9FA',
        avatarBackground: 'rgba(255,255,255,0.3)',
        headerBackground: '#007AFF',
        headerText: '#FFFFFF',
        statusBar: 'light',
    },
};

export const darkTheme: Theme = {
    dark: true,
    colors: {
        background: '#121212',
        surface: '#1E1E1E',
        card: '#2C2C2C',
        text: '#E8E8E8',
        textSecondary: '#A0A0A0',
        textTertiary: '#6E6E6E',
        primary: '#4DA6FF',
        primaryLight: '#1A3A5C',
        error: '#FF6B6B',
        border: '#333333',
        separator: '#2C2C2C',
        inputBackground: '#2C2C2C',
        avatarBackground: 'rgba(255,255,255,0.15)',
        headerBackground: '#1A1A2E',
        headerText: '#E8E8E8',
        statusBar: 'light',
    },
};

export function useTheme(): Theme {
    const isDarkMode = useStore((state) => state.isDarkMode);
    return isDarkMode ? darkTheme : lightTheme;
}
