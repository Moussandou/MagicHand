import { Hand, HandFeatures, Finger, FingerState, Vec3 } from '../types';

const FINGER_TIPS = [4, 8, 12, 16, 20];
const FINGER_DIPS = [3, 7, 11, 15, 19];
const FINGER_PIPS = [2, 6, 10, 14, 18];
const FINGER_MCP = [1, 5, 9, 13, 17];
const WRIST = 0;

const distance = (a: Vec3, b: Vec3) => {
    return Math.sqrt(Math.pow(a.x - b.x, 2) + Math.pow(a.y - b.y, 2) + Math.pow(a.z - b.z, 2));
};

export const extractFeatures = (hand: Hand): HandFeatures => {
    const landmarks = hand.landmarks;
    const fingerStates: Record<Finger, FingerState> = {
        thumb: 'unknown',
        index: 'unknown',
        middle: 'unknown',
        ring: 'unknown',
        pinky: 'unknown',
    };

    // Simple heuristic for finger open/closed state
    // Compare distance of tip to wrist vs pip to wrist
    // EXCEPT THUMB: compare tip to pinky mcp vs ip to pinky mcp (rough approx)

    const fingers: Finger[] = ['thumb', 'index', 'middle', 'ring', 'pinky'];

    fingers.forEach((finger, i) => {
        const tip = landmarks[FINGER_TIPS[i]];
        const pip = landmarks[FINGER_PIPS[i]];
        const wrist = landmarks[WRIST];
        const mcp = landmarks[FINGER_MCP[i]];

        if (finger === 'thumb') {
            // Thumb is tricky. Check if tip is far from palm center (approx by index mcp + pinky mcp midpoint / 2)
            // Or simplified: is tip further out than IP joint relative to wrist?
            // Let's use a simpler check: is tip x/y far from index mcp?
            // Better: vector from MCP to Tip aligns with Hand direction?

            // Fallback simple check: Distance from Pinky MCP
            const pinkyMcp = landmarks[17];
            const tipDist = distance(tip, pinkyMcp);
            const ipDist = distance(landmarks[3], pinkyMcp);
            fingerStates[finger] = tipDist > ipDist ? 'open' : 'closed';
        } else {
            const tipDist = distance(tip, wrist);
            const pipDist = distance(pip, wrist);
            // Also check if tip is below pip (folded) - but this depends on orientation.
            // Distance is safer for general open/closed.
            fingerStates[finger] = tipDist > pipDist * 1.1 ? 'open' : 'closed';
        }
    });

    // Calculate Pinch (Index Tip to Thumb Tip)
    const pinchDist = distance(landmarks[8], landmarks[4]);
    // Normalize pinch: 0 (touching) to 1 (far).
    // Raw distance is in normalized coords (0..1 approx). Touching is ~0.02-0.05
    const pinch = Math.max(0, Math.min(1, 1 - (pinchDist / 0.1)));

    // Palm Normal (Vector cross product of Wrist->IndexMCP and Wrist->PinkyMCP)
    const v1 = { x: landmarks[5].x - landmarks[0].x, y: landmarks[5].y - landmarks[0].y, z: landmarks[5].z - landmarks[0].z };
    const v2 = { x: landmarks[17].x - landmarks[0].x, y: landmarks[17].y - landmarks[0].y, z: landmarks[17].z - landmarks[0].z };

    const normal = {
        x: v1.y * v2.z - v1.z * v2.y,
        y: v1.z * v2.x - v1.x * v2.z,
        z: v1.x * v2.y - v1.y * v2.x
    };
    const len = Math.sqrt(normal.x * normal.x + normal.y * normal.y + normal.z * normal.z);
    const palmNormal = { x: normal.x / len, y: normal.y / len, z: normal.z / len };

    // Rotation (Simplified)
    // Yaw: atan2(indexMcp.x - pinkyMcp.x, indexMcp.z - pinkyMcp.z) ??? 
    // For MVP, just zero.
    const rotation = { yaw: 0, pitch: 0, roll: 0 };

    return {
        handId: hand.id,
        handedness: hand.handedness,
        fingerStates,
        pinch,
        palmNormal,
        rotation,
        motion: { speed: 0, stable: true }, // Need history for speed, MVP skip
    };
};
