import { registry } from '../../core/registry';
import { FistPose, TwoFingersPose } from './poses';
import { SlashTechnique } from './technique';
import { GestureSpec } from '../../core/types';

const SlashGesture: GestureSpec = {
    id: 'gesture_slash',
    name: 'Slash Activation',
    sequence: [
        { poseId: FistPose.id, maxGapMs: 2000 },
        { poseId: TwoFingersPose.id, maxGapMs: 2000 }
    ],
    minConfidence: 0.6,
    maxDurationMs: 1500,
    cooldownMs: 2000,
};

export const registerSlashPlugin = () => {
    registry.registerPose(FistPose);
    registry.registerPose(TwoFingersPose);
    registry.registerGesture(SlashGesture);
    registry.registerTechnique(SlashTechnique);
};
