'use client';

import { useEffect, useRef, useState } from 'react';
import { useCamera } from '@/core/camera/camera';
import { createHandLandmarker, detectHands, createFaceLandmarker, detectFace } from '@/core/tracking/detector';
import { extractFeatures } from '@/core/features';
import { PoseRecognizer, SequenceRecognizer } from '@/core/recognition';
import { registry } from '@/core/registry';
import { registerAuraPlugin } from '@/plugins/aura';
import { useAppStore } from '@/store';
import { HandFrame, FeaturesFrame } from '@/core/types';
import { FXEngine } from '@/core/fx/engine';
import UiControls from './UiControls';
import DebugOverlay from './DebugOverlay';

import { registerSlashPlugin } from '@/plugins/slash';
import { registerFireballPlugin } from '@/plugins/fireball';

// Register plugins early
if (typeof window !== 'undefined') {
    // Register complex gestures FIRST so they match before simple ones (like Aura)
    registerSlashPlugin();
    registerFireballPlugin();
    registerAuraPlugin();
}

export default function CameraView() {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const { startCamera, stream, loading, error } = useCamera(videoRef);
    const [engine] = useState(() => new FXEngine());
    const [poseRecognizer] = useState(() => new PoseRecognizer());
    const [seqRecognizer] = useState(() => new SequenceRecognizer());

    const { setLatestFrame, setLatestFeatures, setActivePose, activeTechniques, debugMode } = useAppStore();

    // Debug log buffer (mutable ref so rAF loop can write to it)
    const logBufferRef = useRef<string[]>([]);
    const pushLog = (msg: string) => {
        logBufferRef.current = [...logBufferRef.current.slice(-4), msg];
    };

    // Track frame stats
    const statsRef = useRef({ fps: 0, lastTime: 0, frameCount: 0 });

    useEffect(() => {
        // Init Recognizers
        registry.getAllPoses().forEach(p => poseRecognizer.registerPose(p));
        // Sort gestures by length (longest first) to prioritize complex sequences
        const gestures = registry.getAllGestures().sort((a, b) => b.sequence.length - a.sequence.length);
        gestures.forEach(g => seqRecognizer.registerGesture(g));

        pushLog('Recognizers initialized');

        // Pre-load models
        Promise.all([
            createHandLandmarker(),
            createFaceLandmarker()
        ]).then(() => pushLog('Tracking Models Loaded'))
            .catch(e => pushLog(`Model Load Error: ${e.message}`));

        startCamera().then(() => pushLog('Camera started'));
    }, [startCamera, poseRecognizer, seqRecognizer]);

    useEffect(() => {
        let animationFrameId: number;
        let lastVideoTime = -1;
        let lastHandFrame: HandFrame = { t: 0, width: 0, height: 0, hands: [] };
        let lastFeaturesFrame: FeaturesFrame = { t: 0, hands: [] };
        let cachedCtx: CanvasRenderingContext2D | null = null;
        let frameNumber = 0;

        const loop = async (timestamp: number) => {
            if (!(window as any)._lastComplexTime) (window as any)._lastComplexTime = 0;
            if (!(window as any)._lastEyeTarget) (window as any)._lastEyeTarget = null;
            animationFrameId = requestAnimationFrame(loop);

            // FPS Calc
            if (timestamp - statsRef.current.lastTime >= 1000) {
                statsRef.current.fps = statsRef.current.frameCount;
                statsRef.current.frameCount = 0;
                statsRef.current.lastTime = timestamp;
            }
            statsRef.current.frameCount++;

            const video = videoRef.current;
            const canvas = canvasRef.current;
            if (!video || !canvas || video.readyState < 2) return;

            // MEASURE PERF
            const tStart = performance.now();

            // 1. DETECTION (Conditional)
            let hands = useAppStore.getState().latestFrame?.hands || []; // Fallback, but we use local vars essentially

            if (video.currentTime !== lastVideoTime) {
                lastVideoTime = video.currentTime;

                try {
                    const detection = detectHands(video, timestamp);
                    if (detection && detection.landmarks) {
                        hands = detection.landmarks.map((landmarks, i) => ({
                            id: i.toString(),
                            handedness: detection.handedness[i][0].categoryName as 'Left' | 'Right',
                            confidence: detection.handedness[i][0].score,
                            landmarks: landmarks
                        }));
                    } else {
                        hands = [];
                    }
                } catch (e) { }

                try {
                    const faceResult = detectFace(video, timestamp);
                    if (faceResult && faceResult.faceLandmarks && faceResult.faceLandmarks.length > 0) {
                        const landmarks = faceResult.faceLandmarks[0];
                        // Landmark 473 is the right iris center
                        const eyeCenter = landmarks[473];
                        (window as any)._lastEyeTarget = { x: eyeCenter.x, y: eyeCenter.y };
                    } else {
                        (window as any)._lastEyeTarget = null;
                    }
                } catch (e) { }

                // Update Local State
                lastHandFrame = {
                    t: timestamp,
                    width: video.videoWidth,
                    height: video.videoHeight,
                    hands: hands
                };

                // 2. RECOGNITION (Only when new hands detected)
                const featuresList = hands.map(h => extractFeatures(h));
                lastFeaturesFrame = { t: timestamp, hands: featuresList };

                let activePoseId: string | null = null;
                featuresList.forEach(f => {
                    const res = poseRecognizer.recognize(f);
                    if (res) activePoseId = res.poseId;
                });

                // OPTIMIZATION: Only update store if changed
                if (activePoseId !== useAppStore.getState().activePose) {
                    setActivePose(activePoseId);
                }

                seqRecognizer.update(timestamp, activePoseId);
                const triggeredGestureId = seqRecognizer.recognize(timestamp);

                if (triggeredGestureId) {
                    console.log('TRIGGER GESTURE:', triggeredGestureId);
                    pushLog(`GESTURE: ${triggeredGestureId}`);
                    const tech = registry.getAllTechniques().find(t => t.gestureId === triggeredGestureId);
                    if (tech) {
                        const now = timestamp; // Ensure we use the same time context
                        const isAura = tech.id === 'tech_aura';

                        // 1. PRIORITY CHECK
                        if (isAura && (now - (window as any)._lastComplexTime < 2000)) {
                            // Block Aura
                        } else {
                            // 2. MARK COMPLEX GESTURE
                            if (!isAura) {
                                (window as any)._lastComplexTime = now;
                            }

                            // 3. START TECHNIQUE
                            {
                                const ctx = {
                                    now: timestamp,
                                    video,
                                    overlay2d: canvas.getContext('2d')!,
                                    frame: lastHandFrame,
                                    features: lastFeaturesFrame,
                                    state: {} as Record<string, unknown>
                                };
                                const started = engine.startTechnique(tech, ctx);
                                if (started) {
                                    (window as any)._lastActiveTech = tech.name;
                                    setTimeout(() => { if ((window as any)._lastActiveTech === tech.name) (window as any)._lastActiveTech = 'IDLE'; }, 2000);
                                }
                            }
                        }
                    }
                }

                // AUTO-STOP LOGIC FOR STATE-BASED AURA
                // If Aura is active but pose is not Open Hand, stop it.
                // We check if 'tech_aura' is running (how? Engine needs hasTechnique method or we track it)
                // Expanded Engine capabilities or using "Active Techniques" form store?
                // The store has activeTechniques? No, engine has it inside.
                // Workaround: Always try to stop it if mismatch.
                if (activePoseId !== 'pose_open_hand' && triggeredGestureId !== 'gesture_aura_trigger') {
                    // Try to stop Aura if it's running
                    const auraTech = registry.getAllTechniques().find(t => t.id === 'tech_aura');
                    if (auraTech) {
                        const ctx = {
                            now: timestamp,
                            video,
                            overlay2d: canvas.getContext('2d')!,
                            frame: lastHandFrame,
                            features: lastFeaturesFrame,
                            state: {} as Record<string, unknown>
                        };
                        engine.stopTechnique(auraTech.id, ctx);
                    }
                }
            }

            // 3. RENDER
            if (canvas.width !== video.videoWidth) canvas.width = video.videoWidth;
            if (canvas.height !== video.videoHeight) canvas.height = video.videoHeight;

            if (!cachedCtx) cachedCtx = canvas.getContext('2d');
            const ctx2d = cachedCtx!;

            const techCtx = {
                now: timestamp,
                video,
                overlay2d: ctx2d,
                frame: lastHandFrame,
                features: lastFeaturesFrame,
                state: {} as Record<string, unknown>
            };

            engine.update(techCtx);

            // DEBUG DRAW
            if (debugMode) {
                const tEnd = performance.now();
                const frameTime = tEnd - tStart;

                // Retrieve active technique from global state for debug display
                const activeTechName = (window as any)._lastActiveTech || 'IDLE';

                // Update global debug info for overlay
                if (typeof window !== 'undefined') {
                    window._debugInfo = {
                        fps: statsRef.current.fps,
                        cpu: frameTime,
                        pose: useAppStore.getState().activePose || 'None',
                        handCount: hands.length,
                        activeTechnique: activeTechName,
                        logs: logBufferRef.current,
                        cooldownMs: engine.getCooldownRemaining(timestamp),
                        cooldownTotalMs: 1500,
                        lastTechnique: engine.getLastStartedName(),
                        activeTechIds: engine.getActiveTechniqueIds(),
                        eyeTarget: (window as any)._lastEyeTarget
                    };
                }

                const connections = [
                    [0, 1], [1, 2], [2, 3], [3, 4], // Thumb
                    [0, 5], [5, 6], [6, 7], [7, 8], // Index
                    [0, 9], [9, 10], [10, 11], [11, 12], // Middle
                    [0, 13], [13, 14], [14, 15], [15, 16], // Ring
                    [0, 17], [17, 18], [18, 19], [19, 20], // Pinky
                    [5, 9], [9, 13], [13, 17] // Palm
                ];

                hands.forEach((hand) => { // Rename 'h' to 'hand' to avoid confusion with height
                    // 1. Calculate Bounding Box
                    let minX = 1, minY = 1, maxX = 0, maxY = 0;
                    hand.landmarks.forEach(p => {
                        minX = Math.min(minX, p.x);
                        minY = Math.min(minY, p.y);
                        maxX = Math.max(maxX, p.x);
                        maxY = Math.max(maxY, p.y);
                    });

                    // Pad box
                    const pad = 0.05;
                    const paddedMinX = Math.max(0, minX - pad);
                    const paddedMinY = Math.max(0, minY - pad);
                    const paddedMaxX = Math.min(1, maxX + pad);
                    const paddedMaxY = Math.min(1, maxY + pad);

                    const bx = paddedMinX * canvas.width;
                    const by = paddedMinY * canvas.height;
                    const bw = (paddedMaxX - paddedMinX) * canvas.width;
                    const bh = (paddedMaxY - paddedMinY) * canvas.height;

                    // 2. Draw HUD Brackets — single path, no shadowBlur
                    ctx2d.lineJoin = 'round';
                    ctx2d.lineCap = 'round';
                    ctx2d.strokeStyle = '#00f0ff';
                    ctx2d.lineWidth = 2;
                    const cornerLen = 25;

                    ctx2d.beginPath();
                    // Top-Left
                    ctx2d.moveTo(bx, by + cornerLen); ctx2d.lineTo(bx, by); ctx2d.lineTo(bx + cornerLen, by);
                    // Top-Right
                    ctx2d.moveTo(bx + bw - cornerLen, by); ctx2d.lineTo(bx + bw, by); ctx2d.lineTo(bx + bw, by + cornerLen);
                    // Bottom-Right
                    ctx2d.moveTo(bx + bw, by + bh - cornerLen); ctx2d.lineTo(bx + bw, by + bh); ctx2d.lineTo(bx + bw - cornerLen, by + bh);
                    // Bottom-Left
                    ctx2d.moveTo(bx + cornerLen, by + bh); ctx2d.lineTo(bx, by + bh); ctx2d.lineTo(bx, by + bh - cornerLen);
                    ctx2d.stroke();

                    // 3. Draw Skeleton — single batched path
                    ctx2d.lineWidth = 1;
                    ctx2d.strokeStyle = 'rgba(0, 240, 255, 0.3)';
                    ctx2d.beginPath();
                    connections.forEach(([start, end]) => {
                        const p1 = hand.landmarks[start];
                        const p2 = hand.landmarks[end];
                        ctx2d.moveTo(p1.x * canvas.width, p1.y * canvas.height);
                        ctx2d.lineTo(p2.x * canvas.width, p2.y * canvas.height);
                    });
                    ctx2d.stroke();

                    // 4. Landmarks — single batched fill
                    ctx2d.fillStyle = 'rgba(0, 240, 255, 0.7)';
                    ctx2d.beginPath();
                    hand.landmarks.forEach(p => {
                        ctx2d.moveTo(p.x * canvas.width + 1.5, p.y * canvas.height);
                        ctx2d.arc(p.x * canvas.width, p.y * canvas.height, 1.5, 0, Math.PI * 2);
                    });
                    ctx2d.fill();

                    // 5. REPULSOR — simplified (no gradients, no shadowBlur)
                    const palmIdx = [0, 5, 9, 13, 17];
                    let palmX = 0, palmY = 0;
                    for (let pi = 0; pi < 5; pi++) {
                        palmX += hand.landmarks[palmIdx[pi]].x;
                        palmY += hand.landmarks[palmIdx[pi]].y;
                    }
                    palmX = (palmX / 5) * canvas.width;
                    palmY = (palmY / 5) * canvas.height;

                    // Outer glow (simple semi-transparent circle)
                    ctx2d.fillStyle = 'rgba(0, 220, 255, 0.12)';
                    ctx2d.beginPath();
                    ctx2d.arc(palmX, palmY, 45, 0, Math.PI * 2);
                    ctx2d.fill();

                    // Core
                    ctx2d.fillStyle = 'rgba(200, 255, 255, 0.5)';
                    ctx2d.beginPath();
                    ctx2d.arc(palmX, palmY, 12, 0, Math.PI * 2);
                    ctx2d.fill();

                    // Ring
                    ctx2d.strokeStyle = 'rgba(0, 240, 255, 0.5)';
                    ctx2d.lineWidth = 1.5;
                    ctx2d.beginPath();
                    ctx2d.arc(palmX, palmY, 16, 0, Math.PI * 2);
                    ctx2d.stroke();

                    // 6. Label
                    ctx2d.font = 'bold 14px monospace';
                    const label = `TARGET [${(hand.confidence * 100).toFixed(0)}%]`;
                    const textWidth = ctx2d.measureText(label).width;

                    ctx2d.fillStyle = 'rgba(0, 20, 40, 0.6)';
                    ctx2d.beginPath();
                    ctx2d.roundRect(bx, by - 26, textWidth + 12, 22, 6);
                    ctx2d.fill();

                    ctx2d.strokeStyle = 'rgba(0, 240, 255, 0.3)';
                    ctx2d.lineWidth = 1;
                    ctx2d.stroke();

                    ctx2d.save();
                    const textX = bx + 6;
                    const textY = by - 10;
                    ctx2d.translate(textX + textWidth / 2, textY);
                    ctx2d.scale(-1, 1);
                    ctx2d.fillStyle = '#ffffff';
                    ctx2d.fillText(label, -textWidth / 2, 0);
                    ctx2d.restore();
                });
            }
        };

        animationFrameId = requestAnimationFrame(loop);

        return () => cancelAnimationFrame(animationFrameId);
    }, [detectHands, poseRecognizer, seqRecognizer, engine, debugMode]);

    // Poll for debug info for UI
    const [debugInfo, setDebugInfo] = useState({ fps: 0, cpu: 0, pose: 'None' });
    useEffect(() => {
        // Expose Manual Trigger for Debugging
        (window as any)._triggerTechnique = (techId: string) => {
            const tech = registry.getAllTechniques().find(t => t.id === techId);
            if (tech && videoRef.current && canvasRef.current) {
                console.log('MANUAL TRIGGER:', tech.name);
                const ctx = {
                    now: performance.now(),
                    video: videoRef.current,
                    overlay2d: canvasRef.current.getContext('2d')!,
                    frame: { t: performance.now(), width: canvasRef.current.width, height: canvasRef.current.height, hands: [] },
                    features: { t: performance.now(), hands: [] },
                    state: {} as Record<string, unknown>
                };
                engine.startTechnique(tech, ctx);
                (window as any)._lastActiveTech = tech.name;
                setTimeout(() => { if ((window as any)._lastActiveTech === tech.name) (window as any)._lastActiveTech = 'IDLE'; }, 2000);
            }
        };

        if (!debugMode) return;
        const interval = setInterval(() => {
            if (window._debugInfo) setDebugInfo(window._debugInfo);
        }, 100);
        return () => clearInterval(interval);
    }, [debugMode, engine]);


    return (
        <div className="relative w-full h-screen bg-black overflow-hidden flex flex-col items-center justify-center">
            {loading && <div className="text-white z-50">Loading Camera...</div>}
            {error && <div className="text-red-500 z-50 bg-black/80 p-4">{error}</div>}

            {/* Debug Info Overlay (Unified) */}
            {debugMode && <DebugOverlay />}

            <video
                ref={videoRef}
                className="absolute top-0 left-0 w-full h-full object-cover transform scale-x-[-1]"
                playsInline
                muted
            />
            <canvas
                ref={canvasRef}
                className="absolute top-0 left-0 w-full h-full object-cover transform scale-x-[-1]"
            />

            {/* UI Overlay */}
            {/* Title moved to DebugOverlay or kept minimal? kept minimal for non-debug */}
            {!debugMode && (
                <div className="absolute top-4 left-4 z-10">
                    <h1 className="text-white text-2xl font-bold drop-shadow-md">JJK Hand Signs</h1>
                </div>
            )}

            <UiControls />
        </div>
    );
}

declare global {
    interface Window {
        handLandmarkerReady?: boolean;
        handLandmarkerLogged?: boolean;
        modelErrorLogged?: boolean;
        handsDetectedLogged?: boolean;
        _debugInfo?: {
            fps: number,
            cpu: number,
            pose: string,
            handCount?: number,
            activeTechnique?: string,
            logs?: string[],
            cooldownMs?: number,
            cooldownTotalMs?: number,
            lastTechnique?: string,
            activeTechIds?: string[],
            eyeTarget?: { x: number, y: number }
        };
    }
}
