'use client';

import { useEffect, useRef, useState } from 'react';
import { useCamera } from '@/core/camera/camera';
import { createHandLandmarker, detectHands } from '@/core/tracking/detector';
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

        // Pre-load model
        createHandLandmarker().then(() => pushLog('MediaPipe Model Loaded'))
            .catch(e => pushLog(`Model Load Error: ${e.message}`));

        startCamera().then(() => pushLog('Camera started'));
    }, [startCamera, poseRecognizer, seqRecognizer]);

    useEffect(() => {
        let animationFrameId: number;
        let lastVideoTime = -1;
        // Persistent frame data for rendering
        let lastHandFrame: HandFrame = { t: 0, width: 0, height: 0, hands: [] };
        let lastFeaturesFrame: FeaturesFrame = { t: 0, hands: [] };

        const loop = async (timestamp: number) => {
            if (!(window as any)._lastComplexTime) (window as any)._lastComplexTime = 0;
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
                } catch (e) {
                    // Model might not be ready yet
                }

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

            // 3. RENDER (Always run for smooth FX)
            if (canvas.width !== video.videoWidth) canvas.width = video.videoWidth;
            if (canvas.height !== video.videoHeight) canvas.height = video.videoHeight;

            const ctx = {
                now: timestamp,
                video,
                overlay2d: canvas.getContext('2d')!,
                frame: lastHandFrame,
                features: lastFeaturesFrame,
                state: {} as Record<string, unknown>
            };

            engine.update(ctx);

            // DEBUG DRAW
            if (debugMode) {
                const ctx2d = canvas.getContext('2d')!;
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
                        activeTechIds: engine.getActiveTechniqueIds()
                    };
                }

                hands.forEach(h => {
                    const connections = [
                        [0, 1], [1, 2], [2, 3], [3, 4], // Thumb
                        [0, 5], [5, 6], [6, 7], [7, 8], // Index
                        [0, 9], [9, 10], [10, 11], [11, 12], // Middle
                        [0, 13], [13, 14], [14, 15], [15, 16], // Ring
                        [0, 17], [17, 18], [18, 19], [19, 20], // Pinky
                        [5, 9], [9, 13], [13, 17] // Palm
                    ];

                    // DRAW TARGET BRACKETS
                    // Calculate bounding box
                    let minX = 1, minY = 1, maxX = 0, maxY = 0;
                    h.landmarks.forEach(p => {
                        if (p.x < minX) minX = p.x;
                        if (p.x > maxX) maxX = p.x;
                        if (p.y < minY) minY = p.y;
                        if (p.y > maxY) maxY = p.y;
                    });

                    // Add padding
                    const pad = 0.05;
                    minX = Math.max(0, minX - pad);
                    minY = Math.max(0, minY - pad);
                    maxX = Math.min(1, maxX + pad);
                    maxY = Math.min(1, maxY + pad);

                    const bx = minX * canvas.width;
                    const by = minY * canvas.height;
                    const bw = (maxX - minX) * canvas.width;
                    const bh = (maxY - minY) * canvas.height;

                    // Draw Brackets
                    ctx2d.strokeStyle = '#00ffff'; // Cyan
                    ctx2d.lineWidth = 2;
                    const cornerLen = 20;

                    // Top Left
                    ctx2d.beginPath(); ctx2d.moveTo(bx, by + cornerLen); ctx2d.lineTo(bx, by); ctx2d.lineTo(bx + cornerLen, by); ctx2d.stroke();
                    // Top Right
                    ctx2d.beginPath(); ctx2d.moveTo(bx + bw - cornerLen, by); ctx2d.lineTo(bx + bw, by); ctx2d.lineTo(bx + bw, by + cornerLen); ctx2d.stroke();
                    // Bottom Left
                    ctx2d.beginPath(); ctx2d.moveTo(bx, by + bh - cornerLen); ctx2d.lineTo(bx, by + bh); ctx2d.lineTo(bx + cornerLen, by + bh); ctx2d.stroke();
                    // Bottom Right
                    ctx2d.beginPath(); ctx2d.moveTo(bx + bw - cornerLen, by + bh); ctx2d.lineTo(bx + bw, by + bh); ctx2d.lineTo(bx + bw, by + bh - cornerLen); ctx2d.stroke();

                    // Text Label
                    ctx2d.fillStyle = '#00ffff';
                    ctx2d.font = '10px monospace';
                    ctx2d.fillText(`TARGET: ${h.handedness.toUpperCase()}`, bx, by - 5);


                    // SKELETON (Dimmer or different visual?)
                    // Let's keep skeleton but make it subtle? Or matching the theme?
                    ctx2d.lineWidth = 1;
                    ctx2d.strokeStyle = 'rgba(0, 255, 0, 0.5)'; // Traditional dim green

                    connections.forEach(([start, end]) => {
                        const p1 = h.landmarks[start];
                        const p2 = h.landmarks[end];
                        ctx2d.beginPath();
                        ctx2d.moveTo(p1.x * canvas.width, p1.y * canvas.height);
                        ctx2d.lineTo(p2.x * canvas.width, p2.y * canvas.height);
                        ctx2d.stroke();
                    });

                    h.landmarks.forEach(p => {
                        ctx2d.beginPath();
                        ctx2d.arc(p.x * canvas.width, p.y * canvas.height, 2, 0, 2 * Math.PI);
                        ctx2d.fillStyle = 'rgba(0, 255, 255, 0.8)';
                        ctx2d.fill();
                    });
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
            activeTechIds?: string[]
        };
    }
}
