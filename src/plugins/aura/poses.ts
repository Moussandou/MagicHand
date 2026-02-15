import { PoseSpec, HandFeatures } from '../../core/types';

export const OpenHandPose: PoseSpec = {
    id: 'pose_open_hand',
    name: 'Open Hand',
    threshold: 0.95, // Very strict
    score: (features: HandFeatures) => {
        // Score based on how many fingers are open
        let openCount = 0;
        if (features.fingerStates.thumb === 'open') openCount++;
        if (features.fingerStates.index === 'open') openCount++;
        if (features.fingerStates.middle === 'open') openCount++;
        if (features.fingerStates.ring === 'open') openCount++;
        if (features.fingerStates.pinky === 'open') openCount++;

        // Strict: Must utilize palm normal or check for "intentionality"
        // For now, just require 5/5
        return openCount === 5 ? 1.0 : 0;
    },
};
