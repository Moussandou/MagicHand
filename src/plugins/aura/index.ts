import { registry } from '../../core/registry';
import { OpenHandPose } from './poses';
import { AuraTechnique } from './technique';
import { GestureSpec } from '../../core/types';

// Simple "Instant" Gesture for Open Hand
const OpenHandGesture: GestureSpec = {
    id: 'gesture_aura_trigger',
    name: 'Aura Trigger',
    sequence: [
        { poseId: OpenHandPose.id, maxGapMs: 1000, minHoldMs: 200 } // Hold open hand for 200ms
    ],
    minConfidence: 0.6,
    maxDurationMs: 1000,
    cooldownMs: 0,
};

export const registerAuraPlugin = () => {
    registry.registerPose(OpenHandPose);
    registry.registerGesture(OpenHandGesture);
    // Link technique to gesture
    const tech = { ...AuraTechnique, gestureId: OpenHandGesture.id };
    registry.registerTechnique(tech);
};
