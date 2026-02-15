import { Technique, TechniqueContext } from '../../core/types';

export const AuraTechnique: Technique = {
    id: 'tech_aura',
    name: 'Cursed Energy Aura',
    gestureId: 'pose_open_hand', // Triggered directly by pose
    version: '1.1.0',
    start: (ctx: TechniqueContext) => {
        // No state needed for pure stateless aura
    },
    update: (ctx: TechniqueContext) => {
        const { overlay2d, frame, now } = ctx;
        const hands = frame.hands;

        if (hands.length === 0) return;

        overlay2d.save();
        overlay2d.globalCompositeOperation = 'lighter'; // Additive blending for glow

        hands.forEach(hand => {
            const wrist = hand.landmarks[0];
            const indexMcp = hand.landmarks[5];
            const pinkyMcp = hand.landmarks[17];

            const centerX = ((wrist.x + indexMcp.x + pinkyMcp.x) / 3) * overlay2d.canvas.width;
            const centerY = ((wrist.y + indexMcp.y + pinkyMcp.y) / 3) * overlay2d.canvas.height;

            // Dynamic pulsing
            const pulse = Math.sin(now / 150) * 10 + 20;
            const radius = 100 + pulse;

            // Layer 1: Core Blue
            const gradient = overlay2d.createRadialGradient(centerX, centerY, 20, centerX, centerY, radius);
            gradient.addColorStop(0, 'rgba(0, 100, 255, 0.8)');
            gradient.addColorStop(0.6, 'rgba(0, 50, 200, 0.3)');
            gradient.addColorStop(1, 'rgba(0, 0, 255, 0)');

            overlay2d.fillStyle = gradient;
            overlay2d.beginPath();
            overlay2d.arc(centerX, centerY, radius, 0, Math.PI * 2);
            overlay2d.fill();

            // Layer 2: Turbulent Energy (Random lines/flames)
            const timeOffset = now / 100;
            overlay2d.strokeStyle = 'cyan';
            overlay2d.lineWidth = 2;
            overlay2d.beginPath();
            for (let i = 0; i < 10; i++) {
                const angle = (i / 10) * Math.PI * 2 + timeOffset;
                const rStart = radius * 0.8;
                const rEnd = radius * 1.2 + Math.random() * 20;

                overlay2d.moveTo(centerX + Math.cos(angle) * rStart, centerY + Math.sin(angle) * rStart);
                overlay2d.quadraticCurveTo(
                    centerX + Math.cos(angle + 0.5) * (rEnd + 20),
                    centerY + Math.sin(angle + 0.5) * (rEnd + 20),
                    centerX + Math.cos(angle) * rEnd,
                    centerY + Math.sin(angle) * rEnd
                );
            }
            overlay2d.stroke();
        });

        overlay2d.restore();
    },
    stop: (ctx: TechniqueContext) => {
        // Cleanup
    }
};
