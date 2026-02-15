import { useAppStore } from '@/store';
import { useEffect, useState } from 'react';

export default function UiControls() {
    const { debugMode, toggleDebug, reticleEnabled, toggleReticle } = useAppStore();

    return (
        <div className="absolute bottom-6 right-6 z-50 pointer-events-auto animate-fade-in flex flex-col items-end gap-3">
            <label className="flex items-center space-x-3 cursor-pointer bg-cyan-900/40 backdrop-blur-md px-4 py-2 rounded-full border border-cyan-500/30 hover:bg-cyan-800/50 transition select-none shadow-lg group">
                <div className={`w-2 h-2 rounded-full transition-all duration-300 ${debugMode ? 'bg-cyan-400 shadow-[0_0_8px_cyan] scale-110' : 'bg-gray-500 group-hover:bg-gray-400'}`} />
                <span className="text-xs font-bold tracking-wider text-cyan-100 group-hover:text-white transition-colors uppercase">Debug</span>
                <input
                    type="checkbox"
                    checked={debugMode}
                    onChange={toggleDebug}
                    className="hidden"
                />
            </label>

            <label className="flex items-center space-x-3 cursor-pointer bg-cyan-900/40 backdrop-blur-md px-4 py-2 rounded-full border border-cyan-500/30 hover:bg-cyan-800/50 transition select-none shadow-lg group">
                <div className={`w-2 h-2 rounded-full transition-all duration-300 ${reticleEnabled ? 'bg-cyan-400 shadow-[0_0_8px_cyan] scale-110' : 'bg-gray-500 group-hover:bg-gray-400'}`} />
                <span className="text-xs font-bold tracking-wider text-cyan-100 group-hover:text-white transition-colors uppercase">Reticle</span>
                <input
                    type="checkbox"
                    checked={reticleEnabled}
                    onChange={toggleReticle}
                    className="hidden"
                />
            </label>
        </div>
    );
}
