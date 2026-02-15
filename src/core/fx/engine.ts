import { Technique, TechniqueContext } from '../types';

const GLOBAL_COOLDOWN_MS = 1500;

export class FXEngine {
    private activeTechniques: Map<string, Technique> = new Map();
    private techniqueState: Map<string, Record<string, unknown>> = new Map();
    private lastStartTime = 0;
    private lastStartedName = '';

    isActive(id: string): boolean {
        return this.activeTechniques.has(id);
    }

    /** Returns remaining cooldown in ms (0 = ready) */
    getCooldownRemaining(now: number): number {
        const remaining = GLOBAL_COOLDOWN_MS - (now - this.lastStartTime);
        return Math.max(0, remaining);
    }

    /** Returns the name of the last started technique */
    getLastStartedName(): string {
        return this.lastStartedName;
    }

    /** Returns list of active technique IDs */
    getActiveTechniqueIds(): string[] {
        return Array.from(this.activeTechniques.keys());
    }

    startTechnique(technique: Technique, ctx: TechniqueContext, payload?: unknown): boolean {
        const now = ctx.now;

        // Global cooldown: block if another technique started recently (Aura exempt)
        if (technique.id !== 'tech_aura' && this.getCooldownRemaining(now) > 0) {
            return false;
        }

        if (this.activeTechniques.has(technique.id)) {
            this.stopTechnique(technique.id, ctx);
        }
        this.activeTechniques.set(technique.id, technique);

        const state: Record<string, unknown> = {};
        this.techniqueState.set(technique.id, state);

        const ctxWithState = { ...ctx, state };
        technique.start(ctxWithState, payload);

        if (technique.id !== 'tech_aura') {
            this.lastStartTime = now;
            this.lastStartedName = technique.name;
        }

        return true;
    }

    stopTechnique(techniqueId: string, ctx: TechniqueContext) {
        const technique = this.activeTechniques.get(techniqueId);
        if (technique) {
            const state = this.techniqueState.get(techniqueId) || {};
            technique.stop({ ...ctx, state });
            this.activeTechniques.delete(techniqueId);
            this.techniqueState.delete(techniqueId);
        }
    }

    update(ctx: TechniqueContext) {
        ctx.overlay2d.clearRect(0, 0, ctx.overlay2d.canvas.width, ctx.overlay2d.canvas.height);

        this.activeTechniques.forEach((technique, id) => {
            const state = this.techniqueState.get(id) || {};
            technique.update({ ...ctx, state });
        });
    }
}
