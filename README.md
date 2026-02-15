# JJK Web AR Hand Signs

A web-based Augmented Research application for detecting hand signs and sequences to trigger visual effects, inspired by Jujutsu Kaisen.

## Features
- real-time hand tracking (MediaPipe)
- Pose & Sequence Recognition
- Modular Plugin System for Techniques
- 2D Canvas FX Engine

## Included Techniques (MVP)
- **Cursed Energy Aura**: Open Hand (Hold)
- **Dismantle (Slash)**: Fist -> Two Fingers
- **Fire Arrow**: Pinch (Charge) -> Open Hand (Release)

## Setup
1. Install dependencies:
   ```bash
   npm install
   ```
2. Run development server:
   ```bash
   npm run dev
   ```
3. Open [http://localhost:3000](http://localhost:3000)

## Architecture
- `src/core`: Core logic (Camera, Tracking, Recognition, FX)
- `src/plugins`: Technique definitions (Poses, Gestures, Visuals)
- `src/components`: UI Components
