import { PoseSpec, HandFeatures } from '../../core/types';

export const FistPose: PoseSpec = {
    id: 'pose_fist',
    name: 'Fist',
    threshold: 0.75,
    score: (features: HandFeatures) => {
        // All fingers closed
        let closedCount = 0;
        if (features.fingerStates.thumb === 'closed') closedCount++; // Thumb can be tricky in fist
        if (features.fingerStates.index === 'closed') closedCount++;
        if (features.fingerStates.middle === 'closed') closedCount++;
        if (features.fingerStates.ring === 'closed') closedCount++;
        if (features.fingerStates.pinky === 'closed') closedCount++;

        // Allow thumb to be 'unknown' or 'open' slightly? 
        // Just count non-thumb fingers for reliability
        let coreClosed = 0;
        if (features.fingerStates.index === 'closed') coreClosed++;
        if (features.fingerStates.middle === 'closed') coreClosed++;
        if (features.fingerStates.ring === 'closed') coreClosed++;
        if (features.fingerStates.pinky === 'closed') coreClosed++;

        return coreClosed / 4;
    },
};

export const TwoFingersPose: PoseSpec = {
    id: 'pose_two_fingers',
    name: 'Two Fingers (Domain/Slash)',
    threshold: 0.75,
    score: (features: HandFeatures) => {
        // Index & Middle Open, Ring & Pinky Closed
        let score = 0;
        if (features.fingerStates.index === 'open') score += 0.25;
        if (features.fingerStates.middle === 'open') score += 0.25;
        if (features.fingerStates.ring === 'closed') score += 0.25;
        if (features.fingerStates.pinky === 'closed') score += 0.25;

        return score;
    }
};
