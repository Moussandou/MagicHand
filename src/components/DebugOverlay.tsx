import { useAppStore } from '@/store';
import { useEffect, useState, useRef } from 'react';

export default function DebugOverlay() {
    const { activePose } = useAppStore();
    const [stats, setStats] = useState({
        fps: 0,
        cpu: 0,
        pose: 'SCANNING',
        handCount: 0,
        technique: 'IDLE',
        logs: [] as string[],
        cooldownMs: 0,
        cooldownTotalMs: 1500,
        lastTechnique: '',
        activeTechIds: [] as string[]
    });

    useEffect(() => {
        const interval = setInterval(() => {
            if (typeof window !== 'undefined' && window._debugInfo) {
                const d = window._debugInfo as any;
                setStats({
                    fps: d.fps,
                    cpu: d.cpu,
                    pose: activePose ? activePose.replace('pose_', '').toUpperCase() : 'SCANNING',
                    handCount: d.handCount || 0,
                    technique: d.activeTechnique || 'IDLE',
                    logs: d.logs || [],
                    cooldownMs: d.cooldownMs || 0,
                    cooldownTotalMs: d.cooldownTotalMs || 1500,
                    lastTechnique: d.lastTechnique || '',
                    activeTechIds: d.activeTechIds || []
                });
            }
        }, 100);
        return () => clearInterval(interval);
    }, [activePose]);

    const cooldownPct = stats.cooldownTotalMs > 0 ? Math.min(1, stats.cooldownMs / stats.cooldownTotalMs) : 0;
    const isOnCooldown = stats.cooldownMs > 0;

    return (
        <div className="absolute inset-0 pointer-events-none overflow-hidden font-mono select-none z-50 text-cyan-400">
            {/* CRT SCANLINE EFFECT */}
            <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] z-10 bg-[length:100%_4px,6px_100%] pointer-events-none opacity-20" />
            <div className="absolute inset-0 bg-gradient-to-t from-cyan-900/10 via-transparent to-cyan-900/10 z-0" />

            {/* CENTRAL RETICLE (Subtle) */}
            <div className="absolute inset-0 flex items-center justify-center opacity-20">
                <div className="w-[600px] h-[600px] border border-cyan-500/30 rounded-full animate-[spin_10s_linear_infinite]" />
                <div className="absolute w-[500px] h-[500px] border border-cyan-500/20 rounded-full border-dashed animate-[spin_15s_linear_infinite_reverse]" />
            </div>

            {/* TOP LEFT: IDENTITY & LOGS */}
            <div className="absolute top-8 left-8 max-w-sm">
                <div className="flex items-center gap-4 mb-4">
                    <div className="w-16 h-16 border-2 border-cyan-400 rounded-full flex items-center justify-center bg-cyan-900/20 backdrop-blur-sm relative box-border shadow-[0_0_15px_rgba(34,211,238,0.3)]">
                        <div className="absolute inset-0 border-t-2 border-cyan-200 rounded-full animate-spin" />
                        <div className="text-xl font-bold text-cyan-100 drop-shadow-[0_0_5px_rgba(34,211,238,0.8)]">JJK</div>
                    </div>
                    <div className="flex flex-col">
                        <div className="text-xs tracking-widest text-cyan-200 mb-1 font-bold">SYSTEM ONLINE</div>
                        {(stats.technique !== 'IDLE' && stats.technique !== 'NONE') ? (
                            <div className="text-sm font-black text-white bg-red-600/80 px-2 py-0.5 rounded animate-pulse shadow-[0_0_10px_red]">
                                ACT: {stats.technique}
                            </div>
                        ) : (
                            <div className="h-1 w-32 bg-cyan-900/50 rounded overflow-hidden">
                                <div className="h-full bg-cyan-400 animate-pulse w-full" />
                            </div>
                        )}
                    </div>
                </div>

                {/* LOGS WINDOW */}
                <div className="bg-black/80 border-l-4 border-cyan-500 p-2 font-mono text-[11px] text-cyan-100 h-32 overflow-hidden flex flex-col justify-end backdrop-blur shadow-lg">
                    {stats.logs.map((log, i) => (
                        <div key={i} className="truncate animate-fade-in border-b border-cyan-900/30 pb-0.5 mb-0.5">
                            <span className="text-cyan-400 font-bold mr-2">[{new Date().toLocaleTimeString().split(' ')[0]}]</span>
                            <span className="text-white brightness-125 drop-shadow-[0_0_1px_rgba(255,255,255,0.5)]">{log}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* TOP RIGHT: DATA FEED */}
            <div className="absolute top-8 right-8 text-right">
                <div className="bg-cyan-950/60 backdrop-blur-md border-r-4 border-cyan-500 p-4 transform skew-x-[-15deg] min-w-[200px] shadow-[0_0_20px_rgba(6,182,212,0.1)]">
                    <div className="transform skew-x-[15deg]">
                        <div className="text-[10px] text-cyan-200 font-bold mb-2 border-b border-cyan-500/50 pb-1 tracking-wider">PERFORMANCE METRICS</div>
                        <div className="flex justify-between items-center mb-1">
                            <span className="text-cyan-500 text-xs font-semibold">FPS</span>
                            <span className="text-lg font-bold text-white drop-shadow-[0_0_5px_cyan]">{stats.fps}</span>
                        </div>
                        <div className="flex justify-between items-center mb-1">
                            <span className="text-cyan-500 text-xs font-semibold">LATENCY</span>
                            <span className={`text-lg font-bold ${stats.cpu > 16 ? 'text-red-400 drop-shadow-[0_0_5px_red]' : 'text-cyan-100 drop-shadow-[0_0_5px_cyan]'}`}>
                                {Math.round(stats.cpu)}ms
                            </span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-cyan-500 text-xs font-semibold">TARGETS</span>
                            <span className="text-lg font-bold text-white drop-shadow-[0_0_5px_cyan]">{stats.handCount}</span>
                        </div>
                    </div>
                </div>
                <div className="h-[2px] w-16 bg-cyan-500 absolute -bottom-2 right-0" />
                <div className="h-[2px] w-4 bg-cyan-500 absolute -bottom-2 right-20" />
            </div>

            {/* BOTTOM CENTER: ACTIVE PROTOCOL */}
            <div className="absolute bottom-12 left-1/2 -translate-x-1/2 flex flex-col items-center">
                <div className="text-[10px] tracking-[0.5em] text-cyan-500 mb-2">CURRENT PROTOCOL</div>
                <div className="relative bg-black/40 backdrop-blur-xl border border-cyan-500/50 px-12 py-4 rounded-full shadow-[0_0_30px_rgba(6,182,212,0.2)]">
                    <div className="text-3xl font-black italic tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 to-blue-500 uppercase drop-shadow-[0_0_5px_rgba(6,182,212,0.8)]">
                        {stats.pose}
                    </div>
                    <div className="absolute -left-4 top-1/2 -translate-y-1/2 w-2 h-8 border-l-2 border-cyan-500 rounded-l-full" />
                    <div className="absolute -right-4 top-1/2 -translate-y-1/2 w-2 h-8 border-r-2 border-cyan-500 rounded-r-full" />
                </div>

                {/* COOLDOWN BAR */}
                {isOnCooldown && (
                    <div className="mt-3 w-48 flex flex-col items-center">
                        <div className="text-[9px] tracking-widest text-yellow-400 font-bold mb-1">
                            COOLDOWN {Math.ceil(stats.cooldownMs / 100) / 10}s
                        </div>
                        <div className="w-full h-2 bg-black/60 rounded-full border border-yellow-500/40 overflow-hidden">
                            <div
                                className="h-full bg-yellow-500 rounded-full transition-all duration-100"
                                style={{ width: `${cooldownPct * 100}%` }}
                            />
                        </div>
                    </div>
                )}
            </div>

            {/* BOTTOM LEFT: AVAILABLE COMMANDS */}
            <div className="absolute bottom-8 left-8">
                <div className="bg-cyan-950/60 backdrop-blur-md border-l-4 border-cyan-500 p-4 transform skew-x-[15deg] min-w-[220px] shadow-[0_0_20px_rgba(6,182,212,0.1)]">
                    <div className="transform skew-x-[-15deg]">
                        <div className="text-[10px] text-cyan-200 font-bold mb-2 border-b border-cyan-500/50 pb-1 tracking-wider">AVAILABLE MODULES</div>
                        <div className="flex flex-col gap-2 text-xs">
                            <ModuleRow
                                name="AURA"
                                hint="OPEN HAND"
                                active={stats.activeTechIds.includes('tech_aura')}
                                poseMatch={stats.pose === 'OPEN_HAND'}
                            />
                            <ModuleRow
                                name="SLASH"
                                hint="FIST → 2 FINGERS"
                                active={stats.activeTechIds.includes('tech_slash')}
                                poseMatch={stats.pose === 'FIST' || stats.pose === 'TWO_FINGERS'}
                            />
                            <ModuleRow
                                name="FIRE"
                                hint="PINCH → OPEN"
                                active={stats.activeTechIds.includes('tech_fireball')}
                                poseMatch={stats.pose === 'PINCH'}
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function ModuleRow({ name, hint, active, poseMatch }: { name: string; hint: string; active: boolean; poseMatch: boolean }) {
    const dotColor = active
        ? 'bg-red-500 shadow-[0_0_8px_red] animate-pulse'
        : poseMatch
            ? 'bg-green-400 shadow-[0_0_8px_lime]'
            : 'bg-cyan-600';
    const textColor = active ? 'text-red-300' : poseMatch ? 'text-white' : 'text-cyan-300';

    return (
        <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${dotColor}`} />
            <span className={`font-bold transition-colors ${textColor}`}>
                {name} {active && <span className="text-[8px] text-red-400 ml-1">ACTIVE</span>}
                <span className="text-[8px] opacity-70 font-normal ml-1">{hint}</span>
            </span>
        </div>
    );
}
