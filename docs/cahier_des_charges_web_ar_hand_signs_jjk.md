# Cahier des charges — Projet Web « Hand Signs → Effets AR » (inspiré JJK)

## 1. Objectif
Créer une application web (desktop/mobile) qui utilise la caméra pour :
1) détecter les mains en temps réel,
2) reconnaître des **poses** puis des **séquences de signes** (combos),
3) déclencher des **effets visuels** superposés à la vidéo afin de simuler une “technique”.

Le système doit être **modulaire** : ajout d’un nouveau signe/technique **sans modifier le cœur** (tracking/reconnaissance/render loop), uniquement via des modules “plugins”.

---

## 2. Périmètre fonctionnel
### 2.1 Fonctionnalités MVP
- Accès caméra (getUserMedia) + gestion permissions.
- Affichage vidéo + overlay effets en temps réel.
- Détection des mains (1 ou 2) + landmarks 2D/3D.
- Reconnaissance de :
  - **Poses** (instantanées) : ex. open hand / fist / pinch / two fingers / etc.
  - **Séquences** (combos) : ex. Pose A → Pose B → Pose C, avec contraintes temporelles.
- Déclenchement d’au moins **3 techniques** d’exemple (effets différents).
- UI minimale : start/stop caméra, sélection de techniques activées, affichage debug optionnel.

### 2.2 Hors périmètre (v1)
- Tracking de visage/corps.
- Réseau/social/compte utilisateur.
- Effets 3D volumétriques avancés (possible v2).

---

## 3. Cibles et contraintes
- **Cible** : utilisation sur **navigateur**, aussi bien sur **desktop** (webcam) que sur **mobile** (caméra arrière/avant), sans app native.
- **Plateformes** :
  - Desktop : Chrome/Edge (Windows/macOS), Firefox (best-effort), Safari macOS.
  - Mobile : **Safari iOS** et **Chrome Android** en priorité.
- **Accès caméra** : uniquement via Web APIs (`navigator.mediaDevices.getUserMedia`).
- **Contraintes iOS (obligatoires à gérer)** :
  - Déclenchement caméra sur **action utilisateur** (tap/click) ; pas d’autostart.
  - Vidéo en **inline** (`playsInline`) pour éviter le plein écran.
  - Gestion stricte des permissions + messages d’erreur compréhensibles.
- **Déploiement** : HTTPS obligatoire (sinon caméra bloquée).
- **Latence** : réponse perçue < 100 ms (du signe à l’effet) si possible.
- **FPS** : viser 30 FPS minimum sur smartphone milieu de gamme.
- **Confidentialité** : traitement **local** (on-device), aucun upload vidéo.

---

## 4. Stack technique imposée (Option A)
- Framework : **Next.js** (App Router) + **React** + **TypeScript**.
- Hand tracking : **MediaPipe Tasks Vision — Hand Landmarker** (WASM).
- Rendu effets :
  - MVP : **Canvas 2D** (overlay).
  - Extension optionnelle : Three.js / react-three-fiber (v2).
- State & events : simple store (Zustand recommandé) ou React context.
- Lint/format : ESLint + Prettier.

---

## 5. Architecture modulaire (exigences)
### 5.1 Séparation en couches (obligatoire)
1) **Capture** : caméra, gestion permissions, frame timestamps.
2) **Tracking** : hand landmarks bruts (MediaPipe).
3) **Features** : extraction d’attributs (doigts ouverts/fermés, pinch, orientation, stabilité).
4) **Reconnaissance** :
   - PoseRecognizer (instantané)
   - SequenceRecognizer (buffer temporel + règles)
5) **Registry** : mapping gestes → techniques (plugins).
6) **FX Engine** : moteur d’effets, lifecycle start/update/stop.
7) **UI** : contrôle + debug.

Aucune couche ne doit “sauter” une abstraction (ex: UI ne lit pas directement MediaPipe).

### 5.2 Contrats de données (interfaces TypeScript)
#### 5.2.1 Frame tracking
```ts
export type Vec3 = { x: number; y: number; z: number };

export type Hand = {
  id: string; // stable id if possible, sinon généré
  handedness: "Left" | "Right";
  confidence: number; // 0..1
  landmarks: Vec3[]; // 21 points
};

export type HandFrame = {
  t: number; // timestamp ms
  width: number;
  height: number;
  hands: Hand[];
};
```

#### 5.2.2 Features
```ts
export type Finger = "thumb"|"index"|"middle"|"ring"|"pinky";
export type FingerState = "open"|"closed"|"unknown";

export type HandFeatures = {
  handId: string;
  handedness: "Left"|"Right";
  fingerStates: Record<Finger, FingerState>;
  pinch: number; // 0..1
  palmNormal: Vec3; // normalisée
  rotation: { yaw: number; pitch: number; roll: number }; // radians
  motion: { speed: number; stable: boolean };
  poseCandidates?: Array<{ id: string; score: number }>;
};

export type FeaturesFrame = {
  t: number;
  hands: HandFeatures[];
};
```

#### 5.2.3 Poses et séquences
```ts
export type PoseSpec = {
  id: string;
  name: string;
  // fonction pure : retourne score 0..1
  score: (hand: HandFeatures) => number;
  threshold: number; // score min
};

export type GestureSpec = {
  id: string;
  name: string;
  // séquence de poses
  sequence: Array<{
    poseId: string;
    maxGapMs: number; // délai max entre étapes
    minHoldMs?: number; // tenue min
  }>;
  minConfidence: number; // tracking min
  maxDurationMs: number; // durée totale max
  cooldownMs: number;
  requiresHands?: 1 | 2; // optionnel
};
```

#### 5.2.4 Techniques / effets (plugins)
```ts
export type TechniqueContext = {
  now: number;
  video: HTMLVideoElement;
  overlay2d: CanvasRenderingContext2D;
  frame: HandFrame;
  features: FeaturesFrame;
};

export type Technique = {
  id: string;
  name: string;
  gestureId: string;
  version: string;
  start: (ctx: TechniqueContext, payload?: any) => void;
  update: (ctx: TechniqueContext) => void;
  stop: (ctx: TechniqueContext) => void;
};
```

### 5.3 Plugin system (obligatoire)
- Les **poses**, **gestures** et **techniques** doivent être déclarés via des modules exportés.
- Le cœur charge :
  - une liste de `PoseSpec[]`
  - une liste de `GestureSpec[]`
  - une liste de `Technique[]`
- Ajouter une technique = créer 1–3 fichiers dans `src/plugins/<technique>/`.
- Le cœur ne doit pas être modifié lors de l’ajout d’un plugin (sauf ajout au “barrel” auto-import si nécessaire).

**Structure de dossier recommandée**
```
src/
  core/
    camera/
    tracking/
    features/
    recognition/
    fx/
    registry/
  plugins/
    fireball/
      poses.ts
      gesture.ts
      technique.ts
    aura/
      ...
  ui/
  pages|app/
```

### 5.4 Règles de modularité (acceptance criteria)
- AC-MOD-01 : Ajouter une nouvelle technique ne nécessite **aucune modification** dans `src/core/**`.
- AC-MOD-02 : Une technique ne dépend pas de MediaPipe (seulement via `TechniqueContext`).
- AC-MOD-03 : Les fonctions `score()` de PoseSpec sont **pures** (pas d’accès DOM, pas d’état global).
- AC-MOD-04 : Toutes les specs disposent d’un `id` unique, stable, versionné (semver côté technique).

---

## 6. Reconnaissance : exigences détaillées
### 6.1 Pose recognition
- Calculer score pour chaque PoseSpec par main à chaque frame.
- Déterminer la pose active : max score > threshold.
- Lissage (smoothing) :
  - moyenne glissante sur 3–5 frames OU filtre exponentiel.
  - hysteresis : threshold_on > threshold_off pour éviter flicker.

### 6.2 Sequence recognition
- Buffer temporel (ring buffer) des poses détectées sur les N dernières frames (N configurable, ex 120 frames).
- Détecter séquences ordonnées avec contraintes :
  - `maxGapMs` entre étapes
  - `minHoldMs` optionnel
  - `maxDurationMs` global
- Cooldown global par gesture (éviter spam).

### 6.3 Multi-hand (option MVP)
- Support 1 main (MVP).
- Extension : gestures `requiresHands=2`.
- Stratégie matching :
  - étapes qui exigent Left/Right configurable (v2).

---

## 7. Moteur d’effets (FX Engine)
### 7.1 Requirements
- Effets en overlay Canvas 2D.
- Chaque technique gère son lifecycle : start/update/stop.
- Le moteur doit permettre plusieurs effets actifs en parallèle (queue/stack), avec gestion TTL.

### 7.2 Types d’effets MVP
- Aura (glow/outline) autour d’une main.
- Slash / shockwave (particules + anneau).
- Projectile simple (fireball 2D) partant de la main vers l’écran.

### 7.3 Performance
- Pas de recalcul lourd dans `update()`. Pré-calculer sprites, gradients, buffers.
- Limiter nombre de particules (config) + pooling.

---

## 8. UI/UX
### 8.1 Écrans
- Écran principal : vidéo + overlay + boutons.
- Panneau réglages :
  - sélection techniques actives
  - mode debug on/off
  - sensibilité (threshold global)
  - fps/latency display (debug)

### 8.2 Debug (obligatoire)
- Toggle :
  - afficher landmarks (points)
  - afficher pose active + score
  - afficher timeline de séquence (étapes validées)

---

## 9. Sécurité & conformité
- Aucune persistance vidéo.
- Aucune requête réseau pour traiter les frames.
- Mention claire : “traitement local”.

---

## 10. Tests & qualité
### 10.1 Unit tests
- PoseSpec.score() : tests sur features synthétiques.
- SequenceRecognizer : tests sur suites d’événements (timestamps) avec cas limites.

### 10.2 E2E (option)
- Playwright : smoke test chargement page + permission caméra (si possible mock).

### 10.3 Linting
- ESLint + Prettier, CI obligatoire.

---

## 11. Livrables
- Repo Git avec :
  - code source
  - README (setup, architecture, comment créer un plugin)
  - 3 techniques d’exemple
  - page démo
- Documentation “Créer une technique” (pas à pas) :
  1) créer `poses.ts`
  2) créer `gesture.ts`
  3) créer `technique.ts`
  4) enregistrer/auto-load

---

## 12. Critères d’acceptation (résumé)
- ACC-01 : L’app fonctionne sur Chrome desktop + Android.
- ACC-02 : 30 FPS stable sur smartphone moyen (conditions normales).
- ACC-03 : 3 techniques déclenchables, visuellement distinctes.
- ACC-04 : Ajout d’une nouvelle technique via dossier plugin sans toucher au core.
- ACC-05 : Debug overlay opérationnel.

---

## 13. Backlog d’évolutions (v2)
- Rendu Three.js (3D) + occlusion simple.
- Enregistrement “replay” (sans vidéo, uniquement landmarks + events).
- Éditeur de gestures in-app (UI pour créer des séquences).
- Personnalisation visuelle (skins de techniques).
- Support bi-manuel avancé (Left/Right binding par étape).

