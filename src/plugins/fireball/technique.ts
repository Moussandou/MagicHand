import { Technique, TechniqueContext } from '../../core/types';

type Particle = {
    x: number;
    y: number;
    vx: number;
    vy: number;
    life: number;
    size: number;
    color: string;
};

function ensureState(ctx: TechniqueContext): Record<string, unknown> {
    if (!ctx.state) ctx.state = {};
    return ctx.state;
}

export const FireballTechnique: Technique = {
    id: 'tech_fireball',
    name: 'Fire Arrow',
    gestureId: 'gesture_fireball',
    version: '2.0.0',
    start: (ctx: TechniqueContext) => {
        const state = ensureState(ctx);

        let startX = ctx.overlay2d.canvas.width / 2;
        const startY = ctx.overlay2d.canvas.height;

        if (ctx.frame.hands.length > 0) {
            startX = ctx.frame.hands[0].landmarks[0].x * ctx.overlay2d.canvas.width;
        }

        state.projectile = {
            x: startX,
            y: startY,
            vx: 0,
            vy: -40,
            particles: [] as Particle[],
        };
        state.startTime = ctx.now;
    },
    update: (ctx: TechniqueContext) => {
        const { overlay2d, now } = ctx;
        const state = ensureState(ctx);
        const projectile = state.projectile as { x: number; y: number; vx: number; vy: number; particles: Particle[] } | undefined;
        if (!projectile) return;

        const elapsed = now - (state.startTime as number);

        overlay2d.save();

        if (elapsed < 300) {
            // CHARGING PHASE
            const chargeProgress = elapsed / 300;
            const radius = 20 + chargeProgress * 60;

            const g = overlay2d.createRadialGradient(projectile.x, projectile.y, 10, projectile.x, projectile.y, radius);
            g.addColorStop(0, 'white');
            g.addColorStop(0.5, 'orange');
            g.addColorStop(1, 'red');

            overlay2d.fillStyle = g;
            overlay2d.beginPath();
            overlay2d.arc(projectile.x, projectile.y, radius, 0, Math.PI * 2);
            overlay2d.fill();

            // Screenshake
            const shake = (Math.random() - 0.5) * 10 * chargeProgress;
            overlay2d.translate(shake, shake);

        } else {
            // FLIGHT PHASE
            projectile.x += projectile.vx;
            projectile.y += projectile.vy;

            // Trail particles
            for (let i = 0; i < 5; i++) {
                projectile.particles.push({
                    x: projectile.x + (Math.random() - 0.5) * 40,
                    y: projectile.y + (Math.random() - 0.5) * 40,
                    vx: (Math.random() - 0.5) * 5,
                    vy: Math.random() * 10,
                    life: 1.0,
                    size: Math.random() * 20 + 10,
                    color: Math.random() > 0.3 ? '#ff4d00' : '#ffaa00'
                });
            }

            // Draw particles (iterate backwards to safely remove dead ones)
            for (let i = projectile.particles.length - 1; i >= 0; i--) {
                const p = projectile.particles[i];
                p.x += p.vx;
                p.y += p.vy;
                p.life -= 0.08;
                if (p.life <= 0) {
                    projectile.particles.splice(i, 1);
                    continue;
                }
                overlay2d.globalAlpha = p.life;
                overlay2d.fillStyle = p.color;
                overlay2d.beginPath();
                overlay2d.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
                overlay2d.fill();
            }

            // Arrow head (white core)
            overlay2d.globalAlpha = 1;
            overlay2d.shadowColor = 'yellow';
            overlay2d.shadowBlur = 50;
            overlay2d.fillStyle = 'white';
            overlay2d.beginPath();
            overlay2d.moveTo(projectile.x, projectile.y - 60);
            overlay2d.lineTo(projectile.x - 20, projectile.y + 20);
            overlay2d.lineTo(projectile.x + 20, projectile.y + 20);
            overlay2d.fill();
        }

        overlay2d.restore();

        // Off-screen cleanup
        if (projectile.y < -500) {
            state.projectile = undefined;
        }
    },
    stop: (ctx: TechniqueContext) => {
        const state = ensureState(ctx);
        state.projectile = undefined;
        state.startTime = undefined;
    }
};
