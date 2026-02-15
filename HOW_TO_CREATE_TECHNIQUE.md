# How to Create a Technique

1. **Create a Plugin Folder**
   Create a new folder in `src/plugins/<technique_name>`.

2. **Define Poses (`poses.ts`)**
   Create `poses.ts` and export `PoseSpec` objects.
   Implement the `score(features)` function to evaluate hand landmarks.
   - Use `features.fingerStates` for simple open/closed checks.
   - Use `features.pinch` for pinch gesture.

3. **Define Visuals (`technique.ts`)**
   Create `technique.ts` and export a `Technique` object.
   - `start(ctx)`: Initialize effect state.
   - `update(ctx)`: Draw to `ctx.overlay2d` each frame.
   - `stop(ctx)`: Cleanup.

4. **Register Plugin (`index.ts`)**
   Create `index.ts` to export a registration function.
   - Define a `GestureSpec` (sequence of poses).
   - Register Poses, Gestures, and the Technique using `registry`.

5. **Enable Plugin**
   Import and call your registration function in `src/components/CameraView.tsx`.
