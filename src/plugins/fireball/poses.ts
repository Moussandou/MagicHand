import { PoseSpec, HandFeatures } from '../../core/types';

export const PinchPose: PoseSpec = {
    id: 'pose_pinch',
    name: 'Pinch',
    threshold: 0.5,
    score: (features: HandFeatures) => {
        // High pinch score (normalized 0..1 where 1 is touching)
        // In our extractFeatures, 'pinch' is 0 (touching) to 1 (far) -> wait, extractFeatures said:
        // const pinch = Math.max(0, Math.min(1, 1 - (pinchDist / 0.1))); 
        // So 1 is touching, 0 is far.

        return features.pinch;
    },
};
