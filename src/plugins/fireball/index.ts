import { registry } from '../../core/registry';
import { PinchPose } from './poses';
import { OpenHandPose } from '../aura/poses'; // Reuse generic Open Hand
import { FireballTechnique } from './technique';
import { GestureSpec } from '../../core/types';

const FireballGesture: GestureSpec = {
    id: 'gesture_fireball',
    name: 'Fire Arrow Activation',
    sequence: [
        { poseId: PinchPose.id, maxGapMs: 2000, minHoldMs: 100 }, // Charge
        { poseId: OpenHandPose.id, maxGapMs: 2000 } // Release
    ],
    minConfidence: 0.6,
    maxDurationMs: 3000,
    cooldownMs: 1000,
};

export const registerFireballPlugin = () => {
    registry.registerPose(PinchPose);
    registry.registerGesture(FireballGesture);
    registry.registerTechnique(FireballTechnique);
};
