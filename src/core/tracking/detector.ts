import { HandLandmarker, FilesetResolver, HandLandmarkerResult } from '@mediapipe/tasks-vision';

let handLandmarker: HandLandmarker | undefined;

export const createHandLandmarker = async () => {
    if (handLandmarker) return handLandmarker;

    const vision = await FilesetResolver.forVisionTasks(
        '/wasm' // Path to local WASM folder in public
    );

    handLandmarker = await HandLandmarker.createFromOptions(vision, {
        baseOptions: {
            modelAssetPath: '/models/hand_landmarker.task', // Path to local model in public
            delegate: 'GPU',
        },
        runningMode: 'VIDEO',
        numHands: 2,
    });

    return handLandmarker;
};

export const detectHands = (
    video: HTMLVideoElement,
    startTimeMs: number
): HandLandmarkerResult | null => {
    if (!handLandmarker) return null;
    // Ensure video is ready
    if (video.videoWidth === 0 || video.videoHeight === 0) return null;

    return handLandmarker.detectForVideo(video, startTimeMs);
};
