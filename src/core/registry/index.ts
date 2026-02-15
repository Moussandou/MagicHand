import { Technique, PoseSpec, GestureSpec } from '../types';

export class Registry {
    techniques: Map<string, Technique> = new Map();
    poses: Map<string, PoseSpec> = new Map();
    gestures: Map<string, GestureSpec> = new Map();

    registerTechnique(technique: Technique) {
        this.techniques.set(technique.id, technique);
    }

    registerPose(pose: PoseSpec) {
        this.poses.set(pose.id, pose);
    }

    registerGesture(gesture: GestureSpec) {
        this.gestures.set(gesture.id, gesture);
    }

    getAllTechniques() {
        return Array.from(this.techniques.values());
    }

    getAllPoses() {
        return Array.from(this.poses.values());
    }

    getAllGestures() {
        return Array.from(this.gestures.values());
    }
}

export const registry = new Registry();
