import { HandFeatures, PoseSpec, GestureSpec } from '../types';

// POSE RECOGNIZER
export class PoseRecognizer {
    private specs: PoseSpec[] = [];

    registerPose(spec: PoseSpec) {
        this.specs.push(spec);
    }

    recognize(hand: HandFeatures): { poseId: string; score: number } | null {
        let bestScore = 0;
        let bestPoseId: string | null = null;

        for (const spec of this.specs) {
            const score = spec.score(hand);
            if (score > spec.threshold && score > bestScore) {
                bestScore = score;
                bestPoseId = spec.id;
            }
        }

        return bestPoseId ? { poseId: bestPoseId, score: bestScore } : null;
    }
}

// SEQUENCE RECOGNIZER
type HistoryItem = {
    t: number;
    poseId: string;
};

export class SequenceRecognizer {
    private specs: GestureSpec[] = [];
    private history: HistoryItem[] = [];
    private lastTriggerTime: Record<string, number> = {};

    registerGesture(spec: GestureSpec) {
        this.specs.push(spec);
    }

    update(now: number, activePoseId: string | null) {
        if (activePoseId) {
            // Avoid duplicate consecutive entries unless time passed?
            // Actually, we usually just want transitions.
            // But for "hold", we might need stream.
            // Simplified: Store changes.
            const last = this.history[this.history.length - 1];
            if (!last || last.poseId !== activePoseId) {
                this.history.push({ t: now, poseId: activePoseId });
                // Prune old history
                this.history = this.history.filter(h => now - h.t < 5000); // 5s buffer
            }
        }
    }

    recognize(now: number): string | null {
        // Check all gestures
        for (const spec of this.specs) {
            // Check cooldown
            if (this.lastTriggerTime[spec.id] && (now - this.lastTriggerTime[spec.id] < spec.cooldownMs)) {
                continue;
            }

            // Pattern Matching: Walk backwards through sequence steps
            // The last step of the sequence MUST be recent (matched near the end of history)

            let historyIdx = this.history.length - 1;
            let seqIdx = spec.sequence.length - 1;
            let lastMatchTime = now;
            let valid = true;

            while (seqIdx >= 0) {
                const seqStep = spec.sequence[seqIdx]; // The step we are looking for
                let stepFound = false;

                // Search backwards in history for this step
                while (historyIdx >= 0) {
                    const historyItem = this.history[historyIdx];

                    // 1. Time Check: Have we gone back too far relative to the NEXT step we already matched?
                    // For the very last step, we compare to 'now'.
                    // For others, we compare to the time of the step that comes after it in sequence.
                    const timeDiff = lastMatchTime - historyItem.t;

                    if (timeDiff > seqStep.maxGapMs + 500) { // Add buffer for noise
                        // Too much time has passed between the next step and this candidate
                        // Stop searching for this step.
                        break;
                    }

                    // 2. Pose Check
                    if (historyItem.poseId === seqStep.poseId) {
                        // FOUND IT!
                        // Check if the gap is strictly valid? 
                        // The 'maxGapMs' usually implies "Time from THIS step to NEXT step".
                        // So: nextStepTime - thisStepTime <= maxGapMs
                        if (timeDiff <= seqStep.maxGapMs) {
                            stepFound = true;
                            lastMatchTime = historyItem.t; // Update anchor for next search
                            historyIdx--; // Consumed this item
                            break;
                        }
                    }

                    // If not match, it's noise. Skip it.
                    historyIdx--;
                }

                if (!stepFound) {
                    valid = false;
                    break;
                }

                seqIdx--;
            }

            if (valid) {
                this.lastTriggerTime[spec.id] = now;
                // this.history = []; // Don't clear, allows overlapped triggers or rapid fire?
                // actually better to clear or mark used to prevent double trigger on same frame
                return spec.id; // Return usage ID
            }
        }
        return null;
    }
}
