import { useAppStore } from '@/store';
import { useEffect, useState, useRef } from 'react';

const BIOS_LINES = [
    "[SYS] POWER ON SELF TEST...................... OK",
    "[SYS] BIOS v14.7.2 LOADED",
    "[CPU] QUANTUM CORE x16 DETECTED.............. OK",
    "[MEM] 64TB UNIFIED MEMORY ALLOCATION......... OK",
    "[GPU] HOLOGRAPHIC RENDER UNIT................. OK",
    "[NET] NEURAL LINK INTERFACE................... SYNCING",
    "[SEC] ENCRYPTION MODULE AES-512............... ACTIVE",
    "[IO]  HAPTIC FEEDBACK ARRAY................... CALIBRATED",
    "[CAM] OPTICS ARRAY x4......................... INITIALIZING",
    "[CAM] THERMAL IMAGING......................... STANDBY",
    "[CAM] MOTION TRACKING v3.1.................... LOADED",
    "[NAV] INERTIAL MEASUREMENT UNIT............... SYNCED",
    "[NAV] GPS/GLONASS LOCK........................ ACQUIRED",
    "[PWR] ARC REACTOR OUTPUT 3.2GW................ NOMINAL",
    "[PWR] BACKUP CELLS............................ 100%",
    "[WPN] KINETIC BLADE MODULE.................... ARMED",
    "[WPN] THERMAL CANNON MODULE................... ARMED",
    "[WPN] ENERGY SHIELD MODULE.................... ARMED",
    "[WPN] TARGETING COMPUTER...................... ONLINE",
    "[SHD] ARMOR PLATING INTEGRITY................. 100%",
    "[SHD] ENERGY BARRIER.......................... PRIMED",
    "[COM] ENCRYPTED CHANNEL....................... OPEN",
    "[COM] SATELLITE UPLINK........................ CONNECTED",
    "[AI]  COMBAT ASSISTANT v7.0................... LOADING",
    "[AI]  THREAT ANALYSIS MODULE.................. ACTIVE",
    "[AI]  PATTERN RECOGNITION..................... READY",
    "[HUD] HEADS-UP DISPLAY....................... RENDERING",
    "[HUD] OVERLAY SUBSYSTEMS..................... NOMINAL",
    "[SYS] ======================================",
    "[SYS] ALL SYSTEMS NOMINAL",
    "[SYS] STATUS: COMBAT READY",
    "[SYS] ======================================",
    "[SYS] WELCOME BACK, OPERATOR."
];

export default function DebugOverlay() {
    const { activePose } = useAppStore();
    const { debugMode, reticleEnabled } = useAppStore();
    const [stats, setStats] = useState({
        fps: 0, cpu: 0, pose: 'SCANNING', handCount: 0, technique: 'IDLE',
        logs: [] as string[], cooldownMs: 0, cooldownTotalMs: 1500,
        lastTechnique: '', activeTechIds: [] as string[],
        eyeTarget: null as { x: number, y: number } | null
    });

    const [bootPhase, setBootPhase] = useState(0);
    const [biosLines, setBiosLines] = useState<string[]>([]);
    const [biosVisible, setBiosVisible] = useState(true);
    const biosEndRef = useRef<HTMLDivElement>(null);

    const activePoseRef = useRef(activePose);
    useEffect(() => { activePoseRef.current = activePose; }, [activePose]);

    useEffect(() => {
        setTimeout(() => setBootPhase(1), 100);
        setTimeout(() => {
            setBootPhase(2);
            let idx = 0;
            const iv = setInterval(() => {
                if (idx < BIOS_LINES.length) {
                    const currentLine = BIOS_LINES[idx];
                    setBiosLines(prev => [...prev, currentLine]);
                    idx++;
                } else {
                    clearInterval(iv);
                    setTimeout(() => setBiosVisible(false), 400);
                    setTimeout(() => setBootPhase(3), 800);
                }
            }, 70);
        }, 500);

        const interval = setInterval(() => {
            if (typeof window !== 'undefined' && window._debugInfo) {
                const d = window._debugInfo as any;
                const p = activePoseRef.current;
                setStats({
                    fps: d.fps, cpu: d.cpu,
                    pose: p ? p.replace('pose_', '').toUpperCase() : 'SCANNING',
                    handCount: d.handCount || 0, technique: d.activeTechnique || 'IDLE',
                    logs: d.logs || [], cooldownMs: d.cooldownMs || 0,
                    cooldownTotalMs: d.cooldownTotalMs || 1500,
                    lastTechnique: d.lastTechnique || '', activeTechIds: d.activeTechIds || [],
                    eyeTarget: d.eyeTarget || null
                });
            }
        }, 16); // High frequency for smooth eye-tracking (60fps)
        return () => clearInterval(interval);
    }, []);

    useEffect(() => { biosEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [biosLines]);

    const cooldownPct = stats.cooldownTotalMs > 0 ? Math.min(1, stats.cooldownMs / stats.cooldownTotalMs) : 0;
    const isOnCooldown = stats.cooldownMs > 0;
    const isCombatMode = stats.pose !== 'SCANNING' && stats.pose !== 'NONE';

    if (bootPhase === 0) return <div className="fixed inset-0 bg-black z-[100] pointer-events-none" />;

    if (bootPhase === 1) {
        return (
            <div className="fixed inset-0 bg-black z-[100] flex items-center justify-center pointer-events-none overflow-hidden">
                <div className="w-full h-1 bg-cyan-400 shadow-[0_0_80px_30px_rgba(0,240,255,0.5)] animate-crt-turn-on" />
            </div>
        );
    }

    const progress = Math.min(100, Math.round((biosLines.length / BIOS_LINES.length) * 100));
    const hasActive = stats.activeTechIds.length > 0;

    return (
        <div className="absolute inset-0 pointer-events-none overflow-hidden font-mono select-none z-50 text-cyan-400">

            {/* BIOS overlay */}
            {biosVisible && bootPhase === 2 && (
                <div className={`fixed inset-0 bg-black/95 z-[60] pointer-events-none font-mono overflow-hidden flex flex-col transition-opacity duration-500 ${!biosVisible ? 'opacity-0' : 'opacity-100'}`}>
                    <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0)_50%,rgba(0,0,0,0.3)_50%)] bg-[length:100%_2px] pointer-events-none z-10" />
                    <div className="flex-none px-6 py-3 border-b border-cyan-500/20 flex justify-between items-center">
                        <div className="flex items-center gap-3">
                            <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                            <span className="text-cyan-400 text-xs font-bold tracking-[0.3em]">SYSTEM INITIALIZATION</span>
                        </div>
                        <span className="text-cyan-600 text-[12px] tracking-wider">v14.7.2</span>
                    </div>
                    <div className="flex-1 overflow-y-auto px-6 py-4 text-[13px] leading-[1.8] tracking-wide">
                        {biosLines.map((line, i) => {
                            const isOk = line.includes('OK') || line.includes('ARMED') || line.includes('ACTIVE') || line.includes('READY');
                            const isWarn = line.includes('SYNCING') || line.includes('STANDBY') || line.includes('LOADING') || line.includes('INITIALIZING');
                            const isSep = line.includes('======');
                            const isWelcome = line.includes('WELCOME');
                            const isStatus = line.includes('COMBAT READY') || line.includes('ALL SYSTEMS');
                            return (
                                <div key={i} className={`animate-fade-in whitespace-pre ${isWelcome ? 'text-cyan-300 text-sm font-bold mt-2 text-center' :
                                    isSep ? 'text-cyan-700' :
                                        isStatus ? 'text-cyan-300 font-bold' :
                                            isOk ? 'text-cyan-400' :
                                                isWarn ? 'text-cyan-600' :
                                                    'text-cyan-500/70'
                                    }`}>{line}</div>
                            );
                        })}
                        <span className="inline-block w-2 h-3.5 bg-cyan-400 animate-blink" />
                        <div ref={biosEndRef} />
                    </div>
                    <div className="flex-none px-6 py-3 border-t border-cyan-500/20">
                        <div className="flex justify-between text-[13px] text-cyan-600 mb-1.5">
                            <span>LOADING MODULES</span>
                            <span>{progress}%</span>
                        </div>
                        <div className="w-full h-1 bg-cyan-900/30 overflow-hidden">
                            <div className="h-full bg-cyan-400/60 transition-all duration-100" style={{ width: `${progress}%` }} />
                        </div>
                    </div>
                </div>
            )}

            {/* Scanlines */}
            <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0)_50%,rgba(0,0,0,0.08)_50%)] z-30 bg-[length:100%_2px] pointer-events-none" />

            {/* ═══ TOP SECTION ═══ */}

            {/* HUD Badge — top center */}
            <div className="absolute top-3 left-1/2 -translate-x-1/2 animate-hud-build" style={{ animationDelay: '0.8s', animationDuration: '0.5s', opacity: 0, animationFillMode: 'forwards' }}>
                <div className="px-6 py-1 border border-cyan-400/60 bg-cyan-900/70 backdrop-blur-sm text-[12px] font-bold text-white tracking-[0.4em]"
                    style={{ clipPath: 'polygon(8px 0, calc(100% - 8px) 0, 100% 50%, calc(100% - 8px) 100%, 8px 100%, 0 50%)' }}>
                    HUD
                </div>
            </div>

            {/* Top diagnostic label — left */}
            <div className="absolute top-4 left-6 animate-hud-build" style={{ animationDelay: '1s', animationDuration: '0.5s', opacity: 0, animationFillMode: 'forwards' }}>
                <span className="text-[13px] text-cyan-400 tracking-wider bg-cyan-950/25 backdrop-blur-[1px] px-2 py-0.5 border border-cyan-400/10">MK42_DIAGNOSTIC GFX</span>
            </div>

            {/* Top status bar — right */}
            <div className="absolute top-4 right-6 animate-hud-build" style={{ animationDelay: '1s', animationDuration: '0.5s', opacity: 0, animationFillMode: 'forwards' }}>
                <div className="flex items-center gap-3 text-[13px] bg-cyan-950/25 backdrop-blur-[1px] px-2 py-0.5 border border-cyan-400/10">
                    <span className="text-cyan-400">FPS: <span className="text-white">{stats.fps}</span></span>
                    <span className="text-cyan-500">|</span>
                    <span className="text-cyan-400">CPU: <span className="text-white">{stats.cpu.toFixed(1)}ms</span></span>
                    <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse ml-1" />
                </div>
            </div>

            {/* ═══ HORIZONTAL SEPARATOR 1 — below top ═══ */}
            <HudSeparator top="28px" delay="0.9s" />

            {/* ═══ LEFT COLUMN ═══ */}
            <div className="absolute top-12 left-5 w-64 flex flex-col gap-4">

                {/* System Status panel */}
                <HudPanel delay="1.2s" clipVariant="topRight">
                    <div className="text-[12px] text-cyan-400 tracking-[0.2em] mb-2 border-b border-cyan-400/30 pb-1">SYSTEM STATUS</div>
                    <div className="flex flex-col gap-1.5">
                        <StatusRow label="ARMOR" value="100%" />
                        <StatusRow label="REACTOR" value="3.2GW" />
                        <StatusRow label="SHIELDS" value="PRIMED" />
                        <StatusRow label="HANDS" value={`${stats.handCount}`} />
                    </div>
                </HudPanel>

                {/* Bar graph decoration */}
                <div className="animate-hud-build" style={{ animationDelay: '1.5s', animationDuration: '0.5s', opacity: 0, animationFillMode: 'forwards' }}>
                    <BarGraph />
                </div>

                {/* Reticle placeholder removed from sidebar */}

                <HudPanel delay="1.8s" clipVariant="bottomRight">
                    <div className="text-[12px] text-cyan-400 tracking-[0.2em] mb-1 border-b border-cyan-400/30 pb-1">SYSTEM LOGS</div>
                    <div className="flex flex-col gap-1 overflow-hidden h-[80px]" style={{ maskImage: 'linear-gradient(to bottom, transparent, black 15%)' }}>
                        {stats.logs.map((log, i) => (
                            <div key={i} className="text-[13px] text-white/90 leading-tight truncate">
                                <span className="text-cyan-400 mr-1">{'>'}</span>{log}
                            </div>
                        ))}
                    </div>
                </HudPanel>
            </div>

            {/* ═══ CENTER — horizontal separator + targeting data ═══ */}
            <HudSeparator top="50%" delay="1.3s" />

            {/* Small decorative ticks on center separator */}
            <div className="absolute left-1/2 -translate-x-1/2 animate-hud-build" style={{ top: 'calc(50% - 8px)', animationDelay: '1.4s', animationDuration: '0.4s', opacity: 0, animationFillMode: 'forwards' }}>
                <svg width="20" height="16" viewBox="0 0 20 16" className="text-cyan-400 opacity-50">
                    <circle cx="10" cy="8" r="3" fill="none" stroke="currentColor" strokeWidth="1" />
                    <line x1="10" y1="0" x2="10" y2="4" stroke="currentColor" strokeWidth="1" />
                    <line x1="10" y1="12" x2="10" y2="16" stroke="currentColor" strokeWidth="1" />
                    <line x1="0" y1="8" x2="6" y2="8" stroke="currentColor" strokeWidth="1" />
                    <line x1="14" y1="8" x2="20" y2="8" stroke="currentColor" strokeWidth="1" />
                </svg>
            </div>

            {/* ═══ RIGHT COLUMN ═══ */}
            <div className="absolute top-12 right-5 w-64 flex flex-col gap-4">

                <HudPanel delay="1.4s" clipVariant="topLeft">
                    <div className="text-[12px] text-cyan-400 tracking-[0.2em] mb-2 border-b border-cyan-400/30 pb-1">ARSENAL</div>
                    <div className="flex flex-col gap-2">
                        <div className="animate-hud-build" style={{ animationDelay: '1.7s', animationDuration: '0.5s', opacity: 0, animationFillMode: 'forwards' }}>
                            <WeaponRow label="KINETIC BLADE" trigger="FIST → 2F" active={stats.activeTechIds.includes('tech_slash')} ready={stats.pose === 'FIST' || stats.pose === 'TWO_FINGERS'} />
                        </div>
                        <div className="animate-hud-build" style={{ animationDelay: '1.9s', animationDuration: '0.5s', opacity: 0, animationFillMode: 'forwards' }}>
                            <WeaponRow label="THERMAL CANNON" trigger="PINCH → OPEN" active={stats.activeTechIds.includes('tech_fireball')} ready={stats.pose === 'PINCH'} />
                        </div>
                        <div className="animate-hud-build" style={{ animationDelay: '2.1s', animationDuration: '0.5s', opacity: 0, animationFillMode: 'forwards' }}>
                            <WeaponRow label="ENERGY SHIELD" trigger="OPEN HAND" active={stats.activeTechIds.includes('tech_aura')} ready={stats.pose === 'OPEN_HAND'} />
                        </div>
                    </div>
                </HudPanel>

                {/* Network graph decoration */}
                <div className="animate-hud-build" style={{ animationDelay: '2.0s', animationDuration: '0.5s', opacity: 0, animationFillMode: 'forwards' }}>
                    <NetworkGraph />
                </div>

                {/* Side bar indicators */}
                <div className="animate-hud-build flex gap-2" style={{ animationDelay: '2.2s', animationDuration: '0.4s', opacity: 0, animationFillMode: 'forwards' }}>
                    <SideIndicators />
                </div>
            </div>

            {/* ═══ BOTTOM SECTION ═══ */}
            <HudSeparator top="calc(100% - 60px)" delay="1.5s" />

            {/* Bottom: active pose */}
            <div className="absolute bottom-10 left-1/2 -translate-x-1/2 text-center animate-hud-build" style={{ animationDelay: '2s', animationDuration: '0.5s', opacity: 0, animationFillMode: 'forwards' }}>
                <div className={`px-4 py-1 bg-cyan-950/30 backdrop-blur-[2px] border border-cyan-400/10 ${isCombatMode ? 'text-red-400 scale-105' : 'text-cyan-300'}`}>
                    <div className="text-4xl font-black italic tracking-tighter transition-all duration-300">
                        {stats.pose}
                    </div>
                </div>
                {isOnCooldown && (
                    <div className="mt-2 w-48 h-[2px] bg-gray-900/30 overflow-hidden border border-white/5 mx-auto">
                        <div className="h-full bg-gradient-to-r from-yellow-500/60 to-orange-500/60" style={{ width: `${cooldownPct * 100}%`, transition: 'width 0.1s linear' }} />
                    </div>
                )}
            </div>

            {/* Bottom labels */}
            <div className="absolute bottom-2 left-6 animate-hud-build" style={{ animationDelay: '2.2s', animationDuration: '0.4s', opacity: 0, animationFillMode: 'forwards' }}>
                <div className="bg-cyan-950/25 backdrop-blur-[1px] px-2 py-1 border border-cyan-400/10">
                    <div className="text-[12px] font-bold text-cyan-300 tracking-wider">SETS</div>
                    <div className="text-[12px] text-cyan-400 tracking-wider">ALPHA • NUMERIC</div>
                </div>
            </div>
            <div className="absolute bottom-2 right-6 animate-hud-build" style={{ animationDelay: '2.2s', animationDuration: '0.4s', opacity: 0, animationFillMode: 'forwards' }}>
                <div className="bg-cyan-950/25 backdrop-blur-[1px] px-2 py-1 border border-cyan-400/10">
                    <div className="text-[12px] text-cyan-400 tracking-wider text-right">NET: STABLE</div>
                    <div className="text-[12px] text-cyan-500 tracking-wider text-right">UPLINK: CONNECTED</div>
                </div>
            </div>

            {/* Corner accents */}
            <CornerAccents delay="0.6s" />

            {/* Global Dynamic Reticle */}
            {reticleEnabled && (
                <div className="absolute inset-0 pointer-events-none z-40 overflow-hidden">
                    <Reticle active={hasActive} technique={stats.technique} eyeTarget={stats.eyeTarget} />
                </div>
            )}
        </div>
    );
}

/* ─── Sub-components ─── */

function HudSeparator({ top, delay }: { top: string; delay: string }) {
    return (
        <div className="absolute left-0 right-0 animate-hud-scan" style={{ top, animationDelay: delay, animationDuration: '0.6s', opacity: 0, animationFillMode: 'forwards' }}>
            <div className="h-[1px] bg-gradient-to-r from-transparent via-cyan-400/70 to-transparent" />
            <div className="h-[1px] mt-[2px] bg-gradient-to-r from-transparent via-cyan-400/40 to-transparent" />
        </div>
    );
}

function HudPanel({ children, delay, clipVariant }: { children: React.ReactNode; delay: string; clipVariant: 'topRight' | 'topLeft' | 'bottomRight' }) {
    const clips: Record<string, string> = {
        topRight: 'polygon(0 0, calc(100% - 12px) 0, 100% 12px, 100% 100%, 0 100%)',
        topLeft: 'polygon(12px 0, 100% 0, 100% 100%, 0 100%, 0 12px)',
        bottomRight: 'polygon(0 0, 100% 0, 100% calc(100% - 12px), calc(100% - 12px) 100%, 0 100%)',
    };

    return (
        <div className="animate-hud-build" style={{ animationDelay: delay, animationDuration: '0.7s', opacity: 0, animationFillMode: 'forwards' }}>
            <div className="relative p-3 bg-cyan-950/60 backdrop-blur-sm border border-cyan-400/30"
                style={{ clipPath: clips[clipVariant] }}>
                {/* Corner accent line */}
                <div className="absolute top-0 left-0 w-8 h-[1px] bg-cyan-400/60" />
                <div className="absolute top-0 left-0 w-[1px] h-8 bg-cyan-400/60" />
                {children}
            </div>
        </div>
    );
}

function StatusRow({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex justify-between items-center text-[13px]">
            <span className="text-cyan-400 tracking-wider font-medium">{label}</span>
            <span className="text-white font-black">{value}</span>
        </div>
    );
}

function WeaponRow({ label, trigger, active, ready }: { label: string; trigger: string; active: boolean; ready: boolean }) {
    return (
        <div className={`p-2 transition-all duration-300 border cursor-default
            ${active ? 'border-red-500/60 bg-red-900/30' : ready ? 'border-cyan-400/50 bg-cyan-800/30' : 'border-cyan-500/20 bg-cyan-950/40 opacity-70'}`}
            style={{ clipPath: 'polygon(0 0, calc(100% - 6px) 0, 100% 6px, 100% 100%, 6px 100%, 0 calc(100% - 6px))' }}>
            <div className="flex justify-between items-center text-[13px]">
                <span className={`font-bold tracking-wider ${active ? 'text-red-300' : 'text-white'}`}>{label}</span>
                {active && <span className="text-[13px] bg-red-500 text-white font-bold px-1 py-0.5">ACT</span>}
                {ready && !active && <div className="w-1.5 h-1.5 rounded-full bg-cyan-400" />}
            </div>
            <div className="text-[12px] text-cyan-500 mt-0.5 uppercase tracking-tight">{trigger}</div>
        </div>
    );
}

function BarGraph() {
    const bars = [0.3, 0.7, 0.5, 0.9, 0.4, 0.8, 0.6, 0.35, 0.75, 0.55, 0.85, 0.45];
    return (
        <div className="flex items-end gap-[2px] h-10 opacity-60">
            {bars.map((h, i) => (
                <div key={i} className="w-[3px] bg-cyan-400/60 transition-all"
                    style={{ height: `${h * 100}%`, animationDelay: `${i * 0.05}s` }} />
            ))}
        </div>
    );
}

function NetworkGraph() {
    const nodes = [
        { x: 25, y: 20 }, { x: 70, y: 10 }, { x: 110, y: 25 },
        { x: 50, y: 45 }, { x: 90, y: 55 }, { x: 20, y: 60 },
        { x: 120, y: 70 }, { x: 65, y: 80 },
    ];
    const edges = [[0, 1], [1, 2], [0, 3], [1, 4], [2, 4], [3, 4], [3, 5], [4, 6], [3, 7], [5, 7], [6, 7]];

    return (
        <svg width="140" height="90" viewBox="0 0 140 90" className="opacity-50 ml-auto">
            {edges.map(([a, b], i) => (
                <line key={i} x1={nodes[a].x} y1={nodes[a].y} x2={nodes[b].x} y2={nodes[b].y}
                    stroke="currentColor" strokeWidth="0.5" className="text-cyan-400" />
            ))}
            {nodes.map((n, i) => (
                <circle key={i} cx={n.x} cy={n.y} r="2" fill="none" stroke="currentColor"
                    strokeWidth="0.8" className="text-cyan-400" />
            ))}
        </svg>
    );
}

function SideIndicators() {
    const levels = [0.6, 0.8, 0.4, 0.9, 0.5];
    return (
        <div className="flex gap-3 opacity-50">
            {levels.map((l, i) => (
                <div key={i} className="flex flex-col items-center gap-1">
                    <div className="w-[8px] h-14 bg-cyan-950/60 border border-cyan-400/30 relative overflow-hidden">
                        <div className="absolute bottom-0 left-0 right-0 bg-cyan-400/70" style={{ height: `${l * 100}%` }} />
                    </div>
                    <span className="text-[12px] text-cyan-500">{String.fromCharCode(65 + i)}</span>
                </div>
            ))}
        </div>
    );
}

function Reticle({ active, technique, eyeTarget }: { active: boolean; technique: string; eyeTarget: { x: number, y: number } | null }) {
    let color = 'rgba(0, 240, 255, 0.5)';
    let outerSpeed = '12s';
    let innerSpeed = '8s';

    const containerRef = useRef<HTMLDivElement>(null);
    const posRef = useRef({ x: 150, y: 300 });
    const targetRef = useRef({ x: 150, y: 300 });

    useEffect(() => {
        if (eyeTarget) {
            // High precision target update
            targetRef.current = {
                x: (1 - eyeTarget.x) * window.innerWidth,
                y: eyeTarget.y * window.innerHeight
            };
        }
    }, [eyeTarget]);

    useEffect(() => {
        let rafId: number;
        const animate = () => {
            if (containerRef.current) {
                const lerp = 0.4; // High snappiness
                const p = posRef.current;
                const t = targetRef.current;

                p.x += (t.x - p.x) * lerp;
                p.y += (t.y - p.y) * lerp;

                containerRef.current.style.left = `${p.x}px`;
                containerRef.current.style.top = `${p.y}px`;
                containerRef.current.style.transform = `translate(-50%, -50%) scale(${active ? 1.15 : 1})`;
            }
            rafId = requestAnimationFrame(animate);
        };
        rafId = requestAnimationFrame(animate);
        return () => cancelAnimationFrame(rafId);
    }, [active]);

    if (active) {
        outerSpeed = '3s';
        innerSpeed = '2s';
        if (technique === 'Thermal Cannon') color = 'rgba(255, 160, 0, 0.7)';
        else if (technique === 'Kinetic Blade') color = 'rgba(0, 240, 255, 0.7)';
        else if (technique === 'Energy Shield') color = 'rgba(80, 140, 255, 0.7)';
        else color = 'rgba(0, 240, 255, 0.6)';
    }

    return (
        <div
            ref={containerRef}
            className="absolute transition-opacity duration-500"
            style={{
                willChange: 'left, top, transform',
                transition: 'transform 0.3s ease'
            }}
        >
            <svg width="140" height="140" viewBox="0 0 120 120" style={{ color, transition: 'color 0.3s ease' }}>
                <g style={{ transformOrigin: '60px 60px', animation: `spin-slow ${outerSpeed} linear infinite` }}>
                    <circle cx="60" cy="60" r="54" fill="none" stroke="currentColor" strokeWidth="1" strokeDasharray="10 14" />
                </g>
                <g style={{ transformOrigin: '60px 60px', animation: `spin-reverse ${innerSpeed} linear infinite` }}>
                    <circle cx="60" cy="60" r="38" fill="none" stroke="currentColor" strokeWidth="0.8" strokeDasharray="6 12" />
                </g>
                <g style={{ transformOrigin: '60px 60px', animation: `spin-slow ${innerSpeed} linear infinite` }}>
                    <circle cx="60" cy="60" r="22" fill="none" stroke="currentColor" strokeWidth="0.6" strokeDasharray="4 8" />
                </g>
                {/* Crosshairs */}
                <line x1="60" y1="2" x2="60" y2="18" stroke="currentColor" strokeWidth="1" />
                <line x1="60" y1="102" x2="60" y2="118" stroke="currentColor" strokeWidth="1" />
                <line x1="2" y1="60" x2="18" y2="60" stroke="currentColor" strokeWidth="1" />
                <line x1="102" y1="60" x2="118" y2="60" stroke="currentColor" strokeWidth="1" />
                {/* Diagonals */}
                <line x1="16" y1="16" x2="26" y2="26" stroke="currentColor" strokeWidth="0.6" />
                <line x1="94" y1="16" x2="104" y2="26" stroke="currentColor" strokeWidth="0.6" opacity="0" />
                <line x1="104" y1="94" x2="94" y2="104" stroke="currentColor" strokeWidth="0.6" />
                {/* Center */}
                <circle cx="60" cy="60" r="2.5" fill="currentColor" opacity={active ? 1 : 0.5} />
                {active && (
                    <circle cx="60" cy="60" r="12" fill="none" stroke="currentColor" strokeWidth="1.2"
                        style={{ animation: 'hudPulse 0.8s ease-in-out infinite' }} />
                )}
            </svg>
        </div>
    );
}

function CornerAccents({ delay }: { delay: string }) {
    const style = { animationDelay: delay, animationDuration: '0.5s', opacity: 0, animationFillMode: 'forwards' as const };
    return (
        <>
            {/* Top-left */}
            <svg className="absolute top-0 left-0 animate-hud-build" width="60" height="60" style={style}>
                <path d="M0 40 L0 0 L40 0" stroke="currentColor" strokeWidth="1.5" fill="none" className="text-cyan-500/40" />
                <path d="M0 20 L0 6 L6 0" stroke="currentColor" strokeWidth="1" fill="none" className="text-cyan-500/25" />
            </svg>
            {/* Top-right */}
            <svg className="absolute top-0 right-0 animate-hud-build" width="60" height="60" style={style}>
                <path d="M60 40 L60 0 L20 0" stroke="currentColor" strokeWidth="1.5" fill="none" className="text-cyan-500/40" />
                <path d="M60 20 L60 6 L54 0" stroke="currentColor" strokeWidth="1" fill="none" className="text-cyan-500/25" />
            </svg>
            {/* Bottom-left */}
            <svg className="absolute bottom-0 left-0 animate-hud-build" width="60" height="60" style={style}>
                <path d="M0 20 L0 60 L40 60" stroke="currentColor" strokeWidth="1.5" fill="none" className="text-cyan-500/40" />
            </svg>
            {/* Bottom-right */}
            <svg className="absolute bottom-0 right-0 animate-hud-build" width="60" height="60" style={style}>
                <path d="M60 20 L60 60 L20 60" stroke="currentColor" strokeWidth="1.5" fill="none" className="text-cyan-500/40" />
            </svg>
        </>
    );
}
