import { create } from 'zustand';
import { Technique, HandFrame, FeaturesFrame } from '@/core/types';

type AppState = {
    activeTechniques: string[];
    debugMode: boolean;
    reticleEnabled: boolean;
    toggleDebug: () => void;
    toggleReticle: () => void;
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
    reticleEnabled: true,
    toggleDebug: () => set((state) => ({ debugMode: !state.debugMode })),
    toggleReticle: () => set((state) => ({ reticleEnabled: !state.reticleEnabled })),
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
