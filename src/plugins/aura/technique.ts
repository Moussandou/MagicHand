import { Technique, TechniqueContext } from '../../core/types';

export const AuraTechnique: Technique = {
    id: 'tech_aura',
    name: 'Energy Shield',
    gestureId: 'pose_open_hand',
    version: '3.1.0',
    start: () => { },
    update: (ctx: TechniqueContext) => {
        const { overlay2d, frame, now } = ctx;
        const hands = frame.hands;
        if (hands.length === 0) return;

        overlay2d.save();
        overlay2d.globalCompositeOperation = 'lighter';

        hands.forEach(hand => {
            const lm = hand.landmarks;
            const cx = ((lm[0].x + lm[5].x + lm[9].x + lm[13].x + lm[17].x) / 5) * overlay2d.canvas.width;
            const cy = ((lm[0].y + lm[5].y + lm[9].y + lm[13].y + lm[17].y) / 5) * overlay2d.canvas.height;

            const pulse = Math.sin(now / 200) * 0.1 + 1;
            const r = 100 * pulse;

            // Outer glow — simple filled circle with low alpha (replaces radial gradient)
            overlay2d.fillStyle = 'rgba(0, 240, 255, 0.06)';
            overlay2d.beginPath();
            overlay2d.arc(cx, cy, r * 1.2, 0, Math.PI * 2);
            overlay2d.fill();

            // Hex grid (lightweight)
            drawHexGrid(overlay2d, cx, cy, r, now);

            // Shield edge ring
            overlay2d.strokeStyle = `rgba(0, 240, 255, ${0.35 + Math.sin(now / 150) * 0.1})`;
            overlay2d.lineWidth = 2;
            overlay2d.beginPath();
            overlay2d.arc(cx, cy, r, 0, Math.PI * 2);
            overlay2d.stroke();

            // Inner core dot
            overlay2d.fillStyle = 'rgba(200, 255, 255, 0.2)';
            overlay2d.beginPath();
            overlay2d.arc(cx, cy, 25, 0, Math.PI * 2);
            overlay2d.fill();
        });

        overlay2d.restore();
    },
    stop: () => { }
};

/**
 * Lightweight hex grid — fewer hexagons, no per-hex trig calculations cached.
 */
function drawHexGrid(
    ctx: CanvasRenderingContext2D,
    cx: number, cy: number,
    radius: number, time: number
) {
    const HEX_SIZE = 28; // Larger = fewer hexagons
    const hexH = HEX_SIZE * 1.732; // sqrt(3) ≈ 1.732
    const cols = Math.ceil(radius * 2 / (HEX_SIZE * 1.5));
    const rows = Math.ceil(radius * 2 / hexH);
    const r2 = radius * radius;

    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.clip();

    ctx.lineWidth = 0.8;
    const startX = cx - cols * HEX_SIZE * 0.75;
    const startY = cy - rows * hexH * 0.5;
    const timePhase = time / 400;

    // Batch all hex strokes into one path
    ctx.beginPath();
    for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
            const x = startX + col * HEX_SIZE * 1.5;
            const y = startY + row * hexH + (col & 1 ? hexH * 0.5 : 0);

            const dx = x - cx;
            const dy = y - cy;
            const dist2 = dx * dx + dy * dy;
            if (dist2 > r2) continue;

            // Simple alpha based on distance (avoid sin per hex)
            const distRatio = Math.sqrt(dist2) / radius;
            const alpha = 0.08 * (1 - distRatio);
            if (alpha < 0.01) continue;

            addHexToPath(ctx, x, y, HEX_SIZE * 0.4);
        }
    }
    // Single stroke for all hexagons combined
    const shimmer = Math.sin(timePhase) * 0.04 + 0.08;
    ctx.strokeStyle = `rgba(0, 240, 255, ${shimmer})`;
    ctx.stroke();

    ctx.restore();
}

// Pre-computed hex vertex offsets (cos/sin for 6 vertices)
const HEX_COS = Array.from({ length: 6 }, (_, i) => Math.cos((Math.PI / 3) * i - Math.PI / 6));
const HEX_SIN = Array.from({ length: 6 }, (_, i) => Math.sin((Math.PI / 3) * i - Math.PI / 6));

function addHexToPath(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
    ctx.moveTo(x + r * HEX_COS[0], y + r * HEX_SIN[0]);
    for (let i = 1; i < 6; i++) {
        ctx.lineTo(x + r * HEX_COS[i], y + r * HEX_SIN[i]);
    }
    ctx.closePath();
}
