import { Technique, TechniqueContext } from '../../core/types';

function ensureState(ctx: TechniqueContext): Record<string, unknown> {
    if (!ctx.state) ctx.state = {};
    return ctx.state;
}

export const SlashTechnique: Technique = {
    id: 'tech_slash',
    name: 'Dismantle',
    gestureId: 'gesture_slash',
    version: '2.0.0',
    start: (ctx: TechniqueContext) => {
        const state = ensureState(ctx);
        state.startTime = ctx.now;
        const w = ctx.overlay2d.canvas.width;
        const h = ctx.overlay2d.canvas.height;
        const x1 = Math.random() * w;
        const y1 = Math.random() * h;
        const x2 = w - x1;
        const y2 = Math.random() * h;
        state.coords = { x1, y1, x2, y2 };
    },
    update: (ctx: TechniqueContext) => {
        const { overlay2d, now } = ctx;
        const state = ensureState(ctx);
        const startTime = (state.startTime as number) || now;
        const coords = (state.coords as { x1: number; y1: number; x2: number; y2: number }) || { x1: 0, y1: 0, x2: 100, y2: 100 };

        const elapsed = now - startTime;
        const DURATION = 800;

        if (elapsed > DURATION) return;

        overlay2d.save();

        const progress = Math.min(1, elapsed / 200);
        const { x1, y1, x2, y2 } = coords;
        const curX = x1 + (x2 - x1) * progress;
        const curY = y1 + (y2 - y1) * progress;

        // Core black cut line (Sukuna style)
        overlay2d.beginPath();
        overlay2d.moveTo(x1, y1);
        overlay2d.lineTo(curX, curY);

        overlay2d.lineWidth = 15;
        overlay2d.strokeStyle = 'black';
        overlay2d.stroke();

        // Outer glow
        overlay2d.shadowColor = 'red';
        overlay2d.shadowBlur = 30;
        overlay2d.lineWidth = 8;
        overlay2d.strokeStyle = 'rgba(255, 0, 0, 0.8)';
        overlay2d.stroke();

        // Secondary delayed lines (Dismantle = multiple cuts)
        if (elapsed > 100) {
            const p2 = Math.min(1, (elapsed - 100) / 200);
            overlay2d.beginPath();
            overlay2d.moveTo(x1 + 50, y1 + 50);
            overlay2d.lineTo(x1 + 50 + (x2 - x1) * p2, y1 + 50 + (y2 - y1) * p2);
            overlay2d.lineWidth = 8;
            overlay2d.strokeStyle = 'white';
            overlay2d.shadowColor = 'red';
            overlay2d.shadowBlur = 10;
            overlay2d.stroke();
        }

        overlay2d.restore();
    },
    stop: (ctx: TechniqueContext) => {
        const state = ensureState(ctx);
        state.startTime = undefined;
        state.coords = undefined;
    }
};
