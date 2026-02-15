export type Vec3 = { x: number; y: number; z: number };

export type Hand = {
    id: string; // stable id if possible, otherwise generated
    handedness: 'Left' | 'Right';
    confidence: number; // 0..1
    landmarks: Vec3[]; // 21 points
};

export type HandFrame = {
    t: number; // timestamp ms
    width: number;
    height: number;
    hands: Hand[];
};

export type Finger = 'thumb' | 'index' | 'middle' | 'ring' | 'pinky';
export type FingerState = 'open' | 'closed' | 'unknown';

export type HandFeatures = {
    handId: string;
    handedness: 'Left' | 'Right';
    fingerStates: Record<Finger, FingerState>;
    pinch: number; // 0..1
    palmNormal: Vec3; // normalized
    rotation: { yaw: number; pitch: number; roll: number }; // radians
    motion: { speed: number; stable: boolean };
    poseCandidates?: Array<{ id: string; score: number }>;
};

export type FeaturesFrame = {
    t: number;
    hands: HandFeatures[];
};

export type PoseSpec = {
    id: string;
    name: string;
    // pure function: returns score 0..1
    score: (hand: HandFeatures) => number;
    threshold: number; // min score
};

export type GestureSpec = {
    id: string;
    name: string;
    // sequence of poses
    sequence: Array<{
        poseId: string;
        maxGapMs: number; // max delay between steps
        minHoldMs?: number; // min hold time
    }>;
    minConfidence: number; // min tracking confidence
    maxDurationMs: number; // max total duration
    cooldownMs: number;
    requiresHands?: 1 | 2; // optional
};

export type TechniqueContext = {
    now: number;
    video: HTMLVideoElement;
    overlay2d: CanvasRenderingContext2D;
    frame: HandFrame;
    features: FeaturesFrame;
    state?: Record<string, unknown>; // Persistent per-technique state managed by FXEngine
};

export type Technique = {
    id: string;
    name: string;
    gestureId: string;
    version: string;
    start: (ctx: TechniqueContext, payload?: any) => void;
    update: (ctx: TechniqueContext) => void;
    stop: (ctx: TechniqueContext) => void;
};
