import { create } from 'zustand';
import { Technique, HandFrame, FeaturesFrame } from '@/core/types';

type AppState = {
    activeTechniques: string[];
    debugMode: boolean;
    toggleDebug: () => void;
    toggleTechnique: (id: string) => void;
    // Debug info
    latestFrame: HandFrame | null;
    latestFeatures: FeaturesFrame | null;
    setLatestFrame: (frame: HandFrame) => void;
    setLatestFeatures: (features: FeaturesFrame) => void;
    activePose: string | null;
    setActivePose: (poseId: string | null) => void;
};

export const useAppStore = create<AppState>((set) => ({
    activeTechniques: [],
    debugMode: true,
    toggleDebug: () => set((state) => ({ debugMode: !state.debugMode })),
    toggleTechnique: (id) =>
        set((state) => ({
            activeTechniques: state.activeTechniques.includes(id)
                ? state.activeTechniques.filter((t) => t !== id)
                : [...state.activeTechniques, id],
        })),
    latestFrame: null,
    latestFeatures: null,
    setLatestFrame: (frame) => set({ latestFrame: frame }),
    setLatestFeatures: (features) => set({ latestFeatures: features }),
    activePose: null,
    setActivePose: (poseId) => set({ activePose: poseId }),
}));
