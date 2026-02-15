import { useAppStore } from '@/store';

export default function UiControls() {
    const { reticleEnabled, toggleReticle } = useAppStore();

    return (
        <div className="absolute bottom-4 right-4 sm:bottom-6 sm:right-6 z-50 pointer-events-auto animate-fade-in">
            <label className="flex items-center space-x-3 cursor-pointer bg-cyan-900/40 backdrop-blur-md px-3 py-1.5 sm:px-4 sm:py-2 rounded-full border border-cyan-500/30 hover:bg-cyan-800/50 transition select-none shadow-lg group">
                <div className={`w-2 h-2 rounded-full transition-all duration-300 ${reticleEnabled ? 'bg-cyan-400 shadow-[0_0_8px_cyan] scale-110' : 'bg-gray-500 group-hover:bg-gray-400'}`} />
                <span className="text-[10px] sm:text-xs font-bold tracking-wider text-cyan-100 group-hover:text-white transition-colors uppercase">Reticle</span>
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
