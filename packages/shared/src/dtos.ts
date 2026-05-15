export interface RouteDTO {
    id: string;
    name: string;
    description: string;
    city: string;
    difficulty: string;
    estimatedDuration: number;
    distance: number;
    tags: string[];
}

export interface PointOfInterestDTO {
    id: string;
    routeId: string;
    orderIndex: number;
    name: string;
    description?: string;
    latitude: number;
    longitude: number;
    stableId?: string;
}

export interface UserDTO {
    id: string;
    email: string;
    name?: string;
}

export interface SpeechContentDTO {
    text: string;
    audioUrl?: string;
    cached: boolean;
}

export interface GroupSessionDTO {
    id: string;
    code: string;
    hostUserId: string;
    routeId: string;
    currentPointId?: string;
    status: string;
}

export interface RatingDTO {
    id: string;
    routeId: string;
    userId?: string;
    rating: number;
    comment?: string;
    createdAt: Date;
}
