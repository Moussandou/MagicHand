import { Technique, TechniqueContext } from '../../core/types';

function ensureState(ctx: TechniqueContext): Record<string, unknown> {
    if (!ctx.state) ctx.state = {};
    return ctx.state;
}

type Spark = { x: number; y: number; vx: number; vy: number; life: number };

export const SlashTechnique: Technique = {
    id: 'tech_slash',
    name: 'Kinetic Blade',
    gestureId: 'gesture_slash',
    version: '3.1.0',
    start: (ctx: TechniqueContext) => {
        const state = ensureState(ctx);
        state.startTime = ctx.now;
        const w = ctx.overlay2d.canvas.width;
        const h = ctx.overlay2d.canvas.height;

        let originX = w / 2;
        let originY = h / 2;
        if (ctx.frame.hands.length > 0) {
            originX = ctx.frame.hands[0].landmarks[9].x * w;
            originY = ctx.frame.hands[0].landmarks[9].y * h;
        }

        const angle = -Math.PI / 6 + Math.random() * Math.PI / 3;
        const bladeLength = Math.max(w, h) * 0.8;
        state.blade = { originX, originY, angle, bladeLength, sparks: [] as Spark[] };
    },
    update: (ctx: TechniqueContext) => {
        const { overlay2d, now } = ctx;
        const state = ensureState(ctx);
        const startTime = state.startTime as number;
        const blade = state.blade as {
            originX: number; originY: number;
            angle: number; bladeLength: number;
            sparks: Spark[];
        } | undefined;
        if (!blade) return;

        const elapsed = now - startTime;
        const DURATION = 600;
        if (elapsed > DURATION) return;

        const progress = Math.min(1, elapsed / 180);
        const fadeOut = elapsed > 400 ? 1 - (elapsed - 400) / 200 : 1;

        overlay2d.save();
        overlay2d.globalAlpha = fadeOut;

        const { originX, originY, angle, bladeLength } = blade;
        const tipX = originX + Math.cos(angle) * bladeLength * progress;
        const tipY = originY + Math.sin(angle) * bladeLength * progress;

        // Outer glow (no shadowBlur — use extra thick transparent stroke)
        overlay2d.strokeStyle = 'rgba(0, 240, 255, 0.15)';
        overlay2d.lineWidth = 30;
        overlay2d.lineCap = 'round';
        overlay2d.beginPath();
        overlay2d.moveTo(originX, originY);
        overlay2d.lineTo(tipX, tipY);
        overlay2d.stroke();

        // Mid glow
        overlay2d.strokeStyle = 'rgba(0, 240, 255, 0.4)';
        overlay2d.lineWidth = 12;
        overlay2d.beginPath();
        overlay2d.moveTo(originX, originY);
        overlay2d.lineTo(tipX, tipY);
        overlay2d.stroke();

        // Core blade (bright)
        overlay2d.strokeStyle = 'rgba(220, 255, 255, 0.95)';
        overlay2d.lineWidth = 4;
        overlay2d.beginPath();
        overlay2d.moveTo(originX, originY);
        overlay2d.lineTo(tipX, tipY);
        overlay2d.stroke();

        // Sparks — capped at 15 total
        if (progress < 1 && blade.sparks.length < 15) {
            blade.sparks.push({
                x: tipX + (Math.random() - 0.5) * 20,
                y: tipY + (Math.random() - 0.5) * 20,
                vx: (Math.random() - 0.5) * 8,
                vy: (Math.random() - 0.5) * 8,
                life: 1.0,
            });
        }

        overlay2d.fillStyle = 'cyan';
        for (let i = blade.sparks.length - 1; i >= 0; i--) {
            const s = blade.sparks[i];
            s.x += s.vx;
            s.y += s.vy;
            s.life -= 0.08;
            if (s.life <= 0) { blade.sparks.splice(i, 1); continue; }
            overlay2d.globalAlpha = s.life * fadeOut;
            overlay2d.beginPath();
            overlay2d.arc(s.x, s.y, 2 + s.life * 2, 0, Math.PI * 2);
            overlay2d.fill();
        }

        // Impact flash at tip (simple circle, no gradient)
        if (progress >= 0.9 && elapsed < 350) {
            const flashAlpha = Math.max(0, (1 - (elapsed - 180) / 170)) * fadeOut;
            overlay2d.globalAlpha = flashAlpha;
            overlay2d.fillStyle = 'rgba(200, 255, 255, 0.5)';
            overlay2d.beginPath();
            overlay2d.arc(tipX, tipY, 40, 0, Math.PI * 2);
            overlay2d.fill();
        }

        overlay2d.restore();
    },
    stop: (ctx: TechniqueContext) => {
        const state = ensureState(ctx);
        state.startTime = undefined;
        state.blade = undefined;
    }
};
