import { Technique, TechniqueContext } from '../../core/types';

type Debris = {
    x: number; y: number;
    vx: number; vy: number;
    life: number; size: number;
    color: string;
};

function ensureState(ctx: TechniqueContext): Record<string, unknown> {
    if (!ctx.state) ctx.state = {};
    return ctx.state;
}

export const FireballTechnique: Technique = {
    id: 'tech_fireball',
    name: 'Thermal Cannon',
    gestureId: 'gesture_fireball',
    version: '3.1.0',
    start: (ctx: TechniqueContext) => {
        const state = ensureState(ctx);
        const w = ctx.overlay2d.canvas.width;
        const h = ctx.overlay2d.canvas.height;

        let palmX = w / 2;
        let palmY = h / 2;
        if (ctx.frame.hands.length > 0) {
            const lm = ctx.frame.hands[0].landmarks;
            palmX = ((lm[0].x + lm[5].x + lm[17].x) / 3) * w;
            palmY = ((lm[0].y + lm[5].y + lm[17].y) / 3) * h;
        }

        // Pre-create the charge gradient once
        const chargeGrad = ctx.overlay2d.createRadialGradient(0, 0, 5, 0, 0, 65);
        chargeGrad.addColorStop(0, 'white');
        chargeGrad.addColorStop(0.4, 'rgba(255, 200, 50, 0.9)');
        chargeGrad.addColorStop(0.8, 'rgba(255, 100, 0, 0.5)');
        chargeGrad.addColorStop(1, 'rgba(255, 50, 0, 0)');

        state.cannon = { palmX, palmY, debris: [] as Debris[], chargeGrad };
        state.startTime = ctx.now;
    },
    update: (ctx: TechniqueContext) => {
        const { overlay2d, now } = ctx;
        const state = ensureState(ctx);
        const cannon = state.cannon as {
            palmX: number; palmY: number; debris: Debris[];
            chargeGrad: CanvasGradient;
        } | undefined;
        if (!cannon) return;

        const elapsed = now - (state.startTime as number);
        const CHARGE = 350;
        const BLAST = 500;
        if (elapsed > CHARGE + BLAST) return;

        const { palmX, palmY } = cannon;
        overlay2d.save();

        if (elapsed < CHARGE) {
            const t = elapsed / CHARGE;
            const radius = 15 + t * 50;

            // Heat ring (simple stroke, no shadow)
            overlay2d.strokeStyle = `rgba(255, 150, 0, ${t * 0.4})`;
            overlay2d.lineWidth = 2;
            overlay2d.beginPath();
            overlay2d.arc(palmX, palmY, radius * 1.5, 0, Math.PI * 2);
            overlay2d.stroke();

            // Core orb — translate to reuse pre-built gradient
            overlay2d.save();
            overlay2d.translate(palmX, palmY);
            overlay2d.fillStyle = cannon.chargeGrad;
            overlay2d.beginPath();
            overlay2d.arc(0, 0, radius, 0, Math.PI * 2);
            overlay2d.fill();
            overlay2d.restore();

        } else {
            const blastElapsed = elapsed - CHARGE;
            const t = blastElapsed / BLAST;
            const fadeOut = t > 0.6 ? 1 - (t - 0.6) / 0.4 : 1;

            const beamLength = palmY * Math.min(1, blastElapsed / 150);
            const beamWidth = 40 * (1 - t * 0.5);

            overlay2d.globalAlpha = fadeOut;

            // Beam — outer (warm orange, no shadow)
            overlay2d.fillStyle = `rgba(255, 180, 60, ${0.7 * fadeOut})`;
            overlay2d.beginPath();
            overlay2d.moveTo(palmX - beamWidth / 2, palmY);
            overlay2d.lineTo(palmX - beamWidth * 0.1, palmY - beamLength);
            overlay2d.lineTo(palmX + beamWidth * 0.1, palmY - beamLength);
            overlay2d.lineTo(palmX + beamWidth / 2, palmY);
            overlay2d.fill();

            // Beam — core white
            overlay2d.fillStyle = `rgba(255, 255, 230, ${0.5 * fadeOut})`;
            overlay2d.beginPath();
            overlay2d.moveTo(palmX - beamWidth * 0.15, palmY);
            overlay2d.lineTo(palmX - 2, palmY - beamLength * 0.9);
            overlay2d.lineTo(palmX + 2, palmY - beamLength * 0.9);
            overlay2d.lineTo(palmX + beamWidth * 0.15, palmY);
            overlay2d.fill();

            // Shockwave ring (simple)
            if (blastElapsed < 200) {
                const waveR = blastElapsed * 1.5;
                overlay2d.globalAlpha = (1 - blastElapsed / 200) * fadeOut;
                overlay2d.strokeStyle = 'rgba(255, 200, 100, 0.5)';
                overlay2d.lineWidth = 2;
                overlay2d.beginPath();
                overlay2d.arc(palmX, palmY, waveR, 0, Math.PI * 2);
                overlay2d.stroke();
            }

            // Debris — capped at 20
            if (t < 0.5 && cannon.debris.length < 20) {
                cannon.debris.push({
                    x: palmX + (Math.random() - 0.5) * beamWidth,
                    y: palmY - Math.random() * beamLength * 0.3,
                    vx: (Math.random() - 0.5) * 5,
                    vy: -Math.random() * 6 - 3,
                    life: 1, size: Math.random() * 4 + 2,
                    color: Math.random() > 0.5 ? '#ffaa00' : '#ff6600',
                });
            }

            for (let i = cannon.debris.length - 1; i >= 0; i--) {
                const d = cannon.debris[i];
                d.x += d.vx;
                d.y += d.vy;
                d.vy += 0.3;
                d.life -= 0.05;
                if (d.life <= 0) { cannon.debris.splice(i, 1); continue; }
                overlay2d.globalAlpha = d.life * fadeOut;
                overlay2d.fillStyle = d.color;
                overlay2d.beginPath();
                overlay2d.arc(d.x, d.y, d.size * d.life, 0, Math.PI * 2);
                overlay2d.fill();
            }
        }

        overlay2d.restore();
    },
    stop: (ctx: TechniqueContext) => {
        const state = ensureState(ctx);
        state.cannon = undefined;
        state.startTime = undefined;
    }
};
