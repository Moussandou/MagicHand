import { useAppStore } from '@/store';
import { useEffect, useState } from 'react';

export default function UiControls() {
    const { debugMode, toggleDebug } = useAppStore();

    return (
        <div className="absolute bottom-4 right-4 z-50 pointer-events-auto">
            <label className="flex items-center space-x-2 cursor-pointer bg-black/60 backdrop-blur-md px-3 py-2 rounded-full border border-white/10 hover:bg-black/80 transition text-xs text-white select-none">
                <div className={`w-3 h-3 rounded-full ${debugMode ? 'bg-cyan-400 shadow-[0_0_8px_cyan]' : 'bg-gray-500'}`} />
                <span>DEBUG SYSTEM</span>
                <input
                    type="checkbox"
                    checked={debugMode}
                    onChange={toggleDebug}
                    className="hidden"
                />
            </label>
        </div>
    );
}
