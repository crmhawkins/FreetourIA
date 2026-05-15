import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface User {
    id: string;
    email: string;
    name?: string;
    token: string;
}

interface PointOfInterest {
    id: string;
    name: string;
    description?: string;
    latitude: number;
    longitude: number;
    orderIndex: number;
    stableId?: string;
}

interface Route {
    id: string;
    name: string;
    description: string;
    city: string;
    difficulty: string;
    estimatedDuration: number;
    distance: number;
    tags: string[];
    points?: PointOfInterest[];
}

interface DownloadedRoute {
    route: Route;
    speeches: Record<string, string>;
    downloadedAt: number;
}

interface CompletedTour {
    routeId: string;
    routeName: string;
    city: string;
    pointsCount: number;
    distanceKm: number;
    completedAt: number;
}

interface AppState {
    // Auth
    user: User | null;
    setUser: (user: User | null) => void;
    logout: () => void;

    // Location
    currentCity: string | null;
    setCurrentCity: (city: string) => void;
    userLocation: { latitude: number; longitude: number } | null;
    userHeading: number;
    userSpeed: number;
    setUserLocation: (loc: { latitude: number; longitude: number }) => void;
    setUserHeading: (heading: number) => void;
    setUserSpeed: (s: number) => void;

    // Route selection
    selectedRoute: Route | null;
    setSelectedRoute: (route: Route | null) => void;

    // Preferences
    travelType: string | null;
    experienceType: string | null;
    effortLevel: string | null;
    setPreferences: (prefs: { travelType?: string; experienceType?: string; effortLevel?: string }) => void;

    // Language
    language: string;
    setLanguage: (lang: string) => void;

    // Dark Mode
    isDarkMode: boolean;
    toggleDarkMode: () => void;

    // Offline
    downloadedRoutes: Record<string, DownloadedRoute>;
    addDownloadedRoute: (routeId: string, data: DownloadedRoute) => void;
    removeDownloadedRoute: (routeId: string) => void;
    isRouteDownloaded: (routeId: string) => boolean;

    // Tour history
    completedTours: CompletedTour[];
    addCompletedTour: (tour: CompletedTour) => void;
    getTotalDistance: () => number;
    getTotalTours: () => number;

    // Persistence
    loadPersistedState: () => Promise<void>;
}

export const useStore = create<AppState>((set, get) => ({
    // Auth
    user: null,
    setUser: (user) => {
        set({ user });
        if (user) {
            AsyncStorage.setItem('user', JSON.stringify(user)).catch(console.error);
        } else {
            AsyncStorage.removeItem('user').catch(console.error);
        }
    },
    logout: () => {
        set({ user: null });
        AsyncStorage.removeItem('user').catch(console.error);
    },

    // Location
    currentCity: null,
    setCurrentCity: (city) => set({ currentCity: city }),
    userLocation: null,
    userHeading: 0,
    userSpeed: 0,
    setUserLocation: (loc) => set({ userLocation: loc }),
    setUserHeading: (heading) => set({ userHeading: heading }),
    setUserSpeed: (s) => set({ userSpeed: s }),

    // Route
    selectedRoute: null,
    setSelectedRoute: (route) => set({ selectedRoute: route }),

    // Preferences
    travelType: null,
    experienceType: null,
    effortLevel: null,
    setPreferences: (prefs) => {
        set((state) => ({ ...state, ...prefs }));
        const { travelType, experienceType, effortLevel } = get();
        AsyncStorage.setItem(
            'preferences',
            JSON.stringify({ travelType, experienceType, effortLevel })
        ).catch(console.error);
    },

    // Language
    language: 'es',
    setLanguage: (lang) => {
        set({ language: lang });
        AsyncStorage.setItem('language', lang).catch(console.error);
    },

    // Dark Mode
    isDarkMode: false,
    toggleDarkMode: () => {
        const newValue = !get().isDarkMode;
        set({ isDarkMode: newValue });
        AsyncStorage.setItem('isDarkMode', JSON.stringify(newValue)).catch(console.error);
    },

    // Offline
    downloadedRoutes: {},
    addDownloadedRoute: (routeId, data) => {
        set((state) => ({
            downloadedRoutes: { ...state.downloadedRoutes, [routeId]: data },
        }));
        AsyncStorage.setItem(
            'downloadedRoutes',
            JSON.stringify(get().downloadedRoutes)
        ).catch(console.error);
    },
    removeDownloadedRoute: (routeId) => {
        set((state) => {
            const updated = { ...state.downloadedRoutes };
            delete updated[routeId];
            return { downloadedRoutes: updated };
        });
        AsyncStorage.setItem(
            'downloadedRoutes',
            JSON.stringify(get().downloadedRoutes)
        ).catch(console.error);
    },
    isRouteDownloaded: (routeId) => !!get().downloadedRoutes[routeId],

    // Tour history
    completedTours: [],
    addCompletedTour: (tour) => {
        set((state) => ({
            completedTours: [tour, ...state.completedTours].slice(0, 100), // keep last 100
        }));
        AsyncStorage.setItem(
            'completedTours',
            JSON.stringify(get().completedTours)
        ).catch(console.error);
    },
    getTotalDistance: () => {
        return get().completedTours.reduce((sum, t) => sum + (t.distanceKm || 0), 0);
    },
    getTotalTours: () => get().completedTours.length,

    // Persistence
    loadPersistedState: async () => {
        try {
            const [userStr, langStr, routesStr, darkModeStr, prefsStr, toursStr] =
                await Promise.all([
                    AsyncStorage.getItem('user'),
                    AsyncStorage.getItem('language'),
                    AsyncStorage.getItem('downloadedRoutes'),
                    AsyncStorage.getItem('isDarkMode'),
                    AsyncStorage.getItem('preferences'),
                    AsyncStorage.getItem('completedTours'),
                ]);

            const updates: Partial<AppState> = {};
            if (userStr) updates.user = JSON.parse(userStr);
            if (langStr) updates.language = langStr;
            if (routesStr) updates.downloadedRoutes = JSON.parse(routesStr);
            if (darkModeStr !== null) updates.isDarkMode = JSON.parse(darkModeStr);
            if (prefsStr) {
                const prefs = JSON.parse(prefsStr);
                if (prefs.travelType) updates.travelType = prefs.travelType;
                if (prefs.experienceType) updates.experienceType = prefs.experienceType;
                if (prefs.effortLevel) updates.effortLevel = prefs.effortLevel;
            }
            if (toursStr) updates.completedTours = JSON.parse(toursStr);

            set(updates as any);
        } catch (error) {
            console.error('Error loading persisted state:', error);
        }
    },
}));
