# Technical Requirements Document (TRD)
## Timber-Style Web Game

**Version:** 1.0
**Status:** MVP Specification
**Last Updated:** December 2024

---

## Table of Contents

1. [Overview](#1-overview)
2. [Tech Stack](#2-tech-stack)
3. [System Architecture](#3-system-architecture)
4. [Game State Machine](#4-game-state-machine)
5. [Client-Side Architecture](#5-client-side-architecture)
6. [Data Models](#6-data-models)
7. [API Specification](#7-api-specification)
8. [Game Loop Implementation](#8-game-loop-implementation)
9. [Input Handling](#9-input-handling)
10. [Rendering Specification](#10-rendering-specification)
11. [Audio System](#11-audio-system)
12. [Performance Requirements](#12-performance-requirements)
13. [Security & Anti-Abuse](#13-security--anti-abuse)
14. [Local Storage Schema](#14-local-storage-schema)
15. [File Structure](#15-file-structure)
16. [Deployment](#16-deployment)
17. [Testing Strategy](#17-testing-strategy)

---

## 1. Overview

### 1.1 Purpose

This document defines the technical implementation requirements for a web-based, reflex-driven chopping game. It translates the PRD into actionable engineering specifications.

### 1.2 Scope

- Single-player, client-side game loop
- Server-side leaderboard persistence
- Mobile-first, desktop-compatible
- MVP feature set only

### 1.3 Design Principles

| Principle | Implementation |
|-----------|----------------|
| Instant Play | < 100KB initial bundle, no blocking requests |
| 60 FPS | RequestAnimationFrame loop, Canvas rendering |
| Low Latency | Direct input handlers, no framework abstraction |
| Offline-Capable | Game runs without network; scores queue for submission |

---

## 2. Tech Stack

### 2.1 Frontend

| Layer | Technology | Rationale |
|-------|------------|-----------|
| Language | TypeScript | Type safety, better DX, minimal runtime cost |
| Rendering | HTML5 Canvas 2D | Direct pixel control, consistent 60fps |
| Build | Vite | Fast HMR, optimized production builds |
| Styling | CSS (minimal) | Only for non-game UI (leaderboard, modals) |

### 2.2 Backend

| Layer | Technology | Rationale |
|-------|------------|-----------|
| Database | Supabase (PostgreSQL) | Managed, free tier, REST API included |
| API | Supabase Auto-generated REST | Zero backend code for CRUD |
| Auth | None (MVP) | Anonymous submissions with display names |

### 2.3 Infrastructure

| Layer | Technology | Rationale |
|-------|------------|-----------|
| Hosting | Vercel | Free, global CDN, git integration |
| Domain | Optional | Can use vercel.app subdomain for MVP |

### 2.4 Version Requirements

```
Node.js: >= 18.0.0
TypeScript: >= 5.0.0
Vite: >= 5.0.0
@supabase/supabase-js: >= 2.0.0
```

---

## 3. System Architecture

### 3.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                          CLIENT                                  │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │   Input     │  │   Game      │  │      Renderer           │  │
│  │   Handler   │─▶│   Engine    │─▶│   (Canvas 2D)           │  │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘  │
│         │               │                      │                 │
│         ▼               ▼                      ▼                 │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                    Game State                                ││
│  │  { screen, player, tree, timer, score, obstacles[] }        ││
│  └─────────────────────────────────────────────────────────────┘│
│                              │                                   │
│                              ▼ (on game over)                    │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                  Score Manager                               ││
│  │  - Queue score submission                                    ││
│  │  - Update local storage                                      ││
│  │  - Fetch leaderboard                                         ││
│  └─────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
                               │
                               ▼ HTTPS
┌─────────────────────────────────────────────────────────────────┐
│                        SUPABASE                                  │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                    PostgreSQL                                ││
│  │  ┌─────────────────────────────────────────────────────┐    ││
│  │  │  scores                                              │    ││
│  │  │  - id (uuid)                                         │    ││
│  │  │  - display_name (varchar)                            │    ││
│  │  │  - score (integer)                                   │    ││
│  │  │  - created_at (timestamp)                            │    ││
│  │  │  - session_id (varchar)                              │    ││
│  │  └─────────────────────────────────────────────────────┘    ││
│  └─────────────────────────────────────────────────────────────┘│
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                   REST API (auto-generated)                  ││
│  │  POST /rest/v1/scores                                        ││
│  │  GET  /rest/v1/scores?order=score.desc&limit=50             ││
│  └─────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
```

### 3.2 Data Flow

```
1. GAME START
   User Input → Input Handler → Game Engine (state: PLAYING)

2. GAME LOOP (every frame)
   Game Engine → Update State → Renderer → Canvas

3. GAME OVER
   Game Engine → Score Manager → Local Storage
                              → Supabase API (async)
                              → Leaderboard UI
```

---

## 4. Game State Machine

### 4.1 States

```typescript
enum GameScreen {
  TITLE,      // Initial screen, waiting for input
  PLAYING,    // Active gameplay
  GAME_OVER,  // Death screen, score submission
  LEADERBOARD // Viewing leaderboard
}
```

### 4.2 State Transitions

```
                    ┌──────────────┐
                    │    TITLE     │
                    │  "Tap to     │
                    │   Start"    │
                    └──────┬───────┘
                           │ tap/key
                           ▼
                    ┌──────────────┐
            ┌──────▶│   PLAYING    │◀─────┐
            │       │              │      │
            │       └──────┬───────┘      │
            │              │ death        │
            │              ▼              │
            │       ┌──────────────┐      │
            │       │  GAME_OVER   │      │
            │       │ Score Submit │      │
            │       └──────┬───────┘      │
            │              │ continue     │
            │              ▼              │
            │       ┌──────────────┐      │
            │       │ LEADERBOARD  │──────┘
            │       │              │ play again
            │       └──────┬───────┘
            │              │ back
            └──────────────┘
```

### 4.3 State Transition Table

| Current State | Input | Next State | Action |
|---------------|-------|------------|--------|
| TITLE | tap/key | PLAYING | Initialize game, start timer |
| PLAYING | left input | PLAYING | Chop left, check collision |
| PLAYING | right input | PLAYING | Chop right, check collision |
| PLAYING | collision | GAME_OVER | Stop timer, trigger death animation |
| PLAYING | timer empty | GAME_OVER | Stop timer, trigger death animation |
| GAME_OVER | submit | LEADERBOARD | Save score, fetch leaderboard |
| GAME_OVER | skip | LEADERBOARD | Fetch leaderboard only |
| LEADERBOARD | play again | PLAYING | Reset game state |
| LEADERBOARD | back | TITLE | Return to title |

---

## 5. Client-Side Architecture

### 5.1 Module Structure

```typescript
// Core modules
Game           // Main orchestrator, owns game loop
InputHandler   // Keyboard/touch event management
Renderer       // Canvas drawing operations
AudioManager   // Sound effect playback

// Game objects
Player         // Position, state, animation frame
Tree           // Segment stack, obstacle positions
Timer          // Countdown logic, decay rate

// Services
ScoreManager   // Local storage + API communication
Leaderboard    // Fetch and display rankings

// UI Components
TitleScreen    // Pre-game UI
GameOverScreen // Post-game UI, name input
LeaderboardUI  // Score table rendering
```

### 5.2 Core Game Class

```typescript
interface GameState {
  screen: GameScreen;
  score: number;
  playerSide: 'left' | 'right';
  treeSegments: TreeSegment[];
  timerValue: number;        // 0-1, percentage remaining
  timerDecayRate: number;    // increases over time
  chopCount: number;         // for difficulty scaling
  isPlayerDead: boolean;
  lastChopTime: number;
}

interface TreeSegment {
  obstacle: 'none' | 'left' | 'right';
}

class Game {
  private state: GameState;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private lastFrameTime: number;

  constructor(canvas: HTMLCanvasElement);

  // Lifecycle
  start(): void;
  reset(): void;

  // Game loop
  private loop(timestamp: number): void;
  private update(deltaTime: number): void;
  private render(): void;

  // Actions
  chop(side: 'left' | 'right'): void;

  // State queries
  getState(): Readonly<GameState>;
}
```

### 5.3 Input Handler

```typescript
interface InputConfig {
  leftKeys: string[];   // ['ArrowLeft', 'KeyA']
  rightKeys: string[];  // ['ArrowRight', 'KeyD']
}

class InputHandler {
  private callbacks: {
    onLeft: () => void;
    onRight: () => void;
    onAnyKey: () => void;
  };

  constructor(config: InputConfig);

  // Setup
  attach(element: HTMLElement): void;
  detach(): void;

  // Handlers
  private handleKeyDown(e: KeyboardEvent): void;
  private handleTouchStart(e: TouchEvent): void;

  // Mobile touch zones
  private getTouchSide(x: number): 'left' | 'right';
}
```

---

## 6. Data Models

### 6.1 Database Schema (Supabase)

```sql
-- Scores table
CREATE TABLE scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  display_name VARCHAR(20) NOT NULL DEFAULT 'Anonymous',
  score INTEGER NOT NULL CHECK (score >= 0),
  session_id VARCHAR(64) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for leaderboard queries
CREATE INDEX idx_scores_score_desc ON scores(score DESC);

-- Index for session-based queries (rate limiting)
CREATE INDEX idx_scores_session_created ON scores(session_id, created_at DESC);
```

### 6.2 TypeScript Types

```typescript
// Database record
interface ScoreRecord {
  id: string;
  display_name: string;
  score: number;
  session_id: string;
  created_at: string;
}

// API submission payload
interface ScoreSubmission {
  display_name: string;
  score: number;
  session_id: string;
}

// Leaderboard display
interface LeaderboardEntry {
  rank: number;
  displayName: string;
  score: number;
  isCurrentPlayer: boolean;
  date: Date;
}

// Local storage schema
interface LocalPlayerData {
  bestScore: number;
  lastDisplayName: string;
  sessionId: string;
  totalGamesPlayed: number;
}
```

---

## 7. API Specification

### 7.1 Supabase Configuration

```typescript
// Environment variables
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbG...

// Client initialization
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);
```

### 7.2 API Endpoints

#### Submit Score

```typescript
// POST score
async function submitScore(submission: ScoreSubmission): Promise<void> {
  const { error } = await supabase
    .from('scores')
    .insert(submission);

  if (error) throw new Error(error.message);
}
```

**Request:**
```json
{
  "display_name": "PlayerOne",
  "score": 142,
  "session_id": "abc123..."
}
```

**Response:** `201 Created` or error

#### Get Leaderboard

```typescript
// GET top 50 scores
async function getLeaderboard(): Promise<ScoreRecord[]> {
  const { data, error } = await supabase
    .from('scores')
    .select('*')
    .order('score', { ascending: false })
    .limit(50);

  if (error) throw new Error(error.message);
  return data;
}
```

**Response:**
```json
[
  {
    "id": "uuid-1",
    "display_name": "Champion",
    "score": 287,
    "created_at": "2024-12-28T10:30:00Z"
  },
  ...
]
```

#### Get Player Rank

```typescript
// GET rank for a specific score
async function getPlayerRank(score: number): Promise<number> {
  const { count, error } = await supabase
    .from('scores')
    .select('*', { count: 'exact', head: true })
    .gt('score', score);

  if (error) throw new Error(error.message);
  return (count ?? 0) + 1;
}
```

### 7.3 Row Level Security (RLS)

```sql
-- Enable RLS
ALTER TABLE scores ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read scores
CREATE POLICY "Scores are viewable by everyone"
ON scores FOR SELECT
USING (true);

-- Allow inserts with rate limiting via session_id
CREATE POLICY "Anyone can submit scores"
ON scores FOR INSERT
WITH CHECK (true);

-- No updates or deletes allowed
-- (handled by absence of UPDATE/DELETE policies)
```

---

## 8. Game Loop Implementation

### 8.1 Main Loop

```typescript
class Game {
  private animationFrameId: number | null = null;
  private lastFrameTime: number = 0;

  private loop = (timestamp: number): void => {
    // Calculate delta time (capped to prevent spiral of death)
    const deltaTime = Math.min(timestamp - this.lastFrameTime, 33.33); // Max 30fps worth
    this.lastFrameTime = timestamp;

    // Update game state
    if (this.state.screen === GameScreen.PLAYING) {
      this.update(deltaTime);
    }

    // Render current frame
    this.render();

    // Schedule next frame
    this.animationFrameId = requestAnimationFrame(this.loop);
  };

  start(): void {
    this.lastFrameTime = performance.now();
    this.animationFrameId = requestAnimationFrame(this.loop);
  }

  stop(): void {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }
}
```

### 8.2 Update Logic

```typescript
private update(deltaTime: number): void {
  // Timer decay (accelerates over time)
  const decayMultiplier = 1 + (this.state.chopCount * 0.002); // 0.2% faster per chop
  const decay = this.state.timerDecayRate * decayMultiplier * (deltaTime / 1000);

  this.state.timerValue = Math.max(0, this.state.timerValue - decay);

  // Check timer death
  if (this.state.timerValue <= 0) {
    this.triggerDeath('timeout');
  }

  // Update animations
  this.updateAnimations(deltaTime);
}
```

### 8.3 Chop Action

```typescript
chop(side: 'left' | 'right'): void {
  if (this.state.screen !== GameScreen.PLAYING) return;
  if (this.state.isPlayerDead) return;

  // Move player
  this.state.playerSide = side;

  // Check collision with bottom segment
  const bottomSegment = this.state.treeSegments[0];
  if (bottomSegment.obstacle === side) {
    this.triggerDeath('collision');
    return;
  }

  // Successful chop
  this.state.score += 1;
  this.state.chopCount += 1;
  this.state.lastChopTime = performance.now();

  // Refill timer (diminishing returns)
  const refillAmount = Math.max(0.05, 0.15 - (this.state.chopCount * 0.001));
  this.state.timerValue = Math.min(1, this.state.timerValue + refillAmount);

  // Shift tree segments
  this.state.treeSegments.shift();
  this.state.treeSegments.push(this.generateSegment());

  // Trigger effects
  this.audioManager.play('chop');
  this.renderer.triggerScreenShake();
}
```

### 8.4 Segment Generation

```typescript
private generateSegment(): TreeSegment {
  // Increase obstacle frequency over time
  const obstacleChance = Math.min(0.7, 0.3 + (this.state.chopCount * 0.005));

  if (Math.random() < obstacleChance) {
    // Avoid consecutive same-side obstacles (unfair)
    const lastObstacle = this.state.treeSegments[this.state.treeSegments.length - 1];
    if (lastObstacle.obstacle !== 'none') {
      // Force opposite side or none
      return {
        obstacle: Math.random() < 0.5
          ? (lastObstacle.obstacle === 'left' ? 'right' : 'left')
          : 'none'
      };
    }
    return { obstacle: Math.random() < 0.5 ? 'left' : 'right' };
  }

  return { obstacle: 'none' };
}
```

---

## 9. Input Handling

### 9.1 Keyboard Input

```typescript
class InputHandler {
  private readonly leftKeys = new Set(['ArrowLeft', 'KeyA', 'a', 'A']);
  private readonly rightKeys = new Set(['ArrowRight', 'KeyD', 'd', 'D']);

  private handleKeyDown = (e: KeyboardEvent): void => {
    // Prevent key repeat
    if (e.repeat) return;

    // Prevent scrolling
    if (this.leftKeys.has(e.code) || this.rightKeys.has(e.code)) {
      e.preventDefault();
    }

    if (this.leftKeys.has(e.code) || this.leftKeys.has(e.key)) {
      this.callbacks.onLeft();
    } else if (this.rightKeys.has(e.code) || this.rightKeys.has(e.key)) {
      this.callbacks.onRight();
    } else {
      this.callbacks.onAnyKey();
    }
  };
}
```

### 9.2 Touch Input

```typescript
private handleTouchStart = (e: TouchEvent): void => {
  e.preventDefault(); // Prevent double-tap zoom

  const touch = e.touches[0];
  const screenWidth = window.innerWidth;
  const touchX = touch.clientX;

  // Dead zone in center (optional, improves accuracy)
  const deadZone = screenWidth * 0.1; // 10% center dead zone
  const center = screenWidth / 2;

  if (touchX < center - deadZone / 2) {
    this.callbacks.onLeft();
  } else if (touchX > center + deadZone / 2) {
    this.callbacks.onRight();
  }
  // Touches in dead zone are ignored
};
```

### 9.3 Input Latency Optimization

```typescript
// Use passive: false for touch events to allow preventDefault
element.addEventListener('touchstart', this.handleTouchStart, { passive: false });

// Use keydown, not keyup, for immediate response
element.addEventListener('keydown', this.handleKeyDown);

// Process input immediately in handler, don't queue
// BAD:  inputQueue.push(event);
// GOOD: this.game.chop('left');
```

---

## 10. Rendering Specification

### 10.1 Canvas Setup

```typescript
class Renderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private scale: number = 1;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.setupCanvas();
  }

  private setupCanvas(): void {
    // Handle high DPI displays
    const dpr = window.devicePixelRatio || 1;
    const rect = this.canvas.getBoundingClientRect();

    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;

    this.ctx.scale(dpr, dpr);
    this.scale = dpr;

    // Optimize for pixel art style
    this.ctx.imageSmoothingEnabled = false;
  }
}
```

### 10.2 Game Dimensions

```typescript
// Logical game dimensions (scaled to fit screen)
const GAME_WIDTH = 400;
const GAME_HEIGHT = 600;

// Element sizes (in logical pixels)
const TREE_WIDTH = 80;
const SEGMENT_HEIGHT = 60;
const PLAYER_WIDTH = 60;
const PLAYER_HEIGHT = 80;
const BRANCH_WIDTH = 70;
const BRANCH_HEIGHT = 20;
```

### 10.3 Render Order (Back to Front)

```typescript
render(state: GameState): void {
  // 1. Clear canvas
  this.ctx.fillStyle = '#87CEEB'; // Sky blue
  this.ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

  // 2. Background elements (clouds, mountains)
  this.renderBackground();

  // 3. Tree trunk
  this.renderTree(state.treeSegments);

  // 4. Obstacles (branches)
  this.renderObstacles(state.treeSegments);

  // 5. Player
  this.renderPlayer(state.playerSide, state.isPlayerDead);

  // 6. UI overlay (score, timer)
  this.renderUI(state.score, state.timerValue);

  // 7. Screen effects (shake)
  this.applyScreenEffects();
}
```

### 10.4 Screen Shake Effect

```typescript
class Renderer {
  private shakeIntensity: number = 0;
  private shakeDecay: number = 0.9;

  triggerScreenShake(intensity: number = 5): void {
    this.shakeIntensity = intensity;
  }

  private applyScreenEffects(): void {
    if (this.shakeIntensity > 0.5) {
      const offsetX = (Math.random() - 0.5) * this.shakeIntensity;
      const offsetY = (Math.random() - 0.5) * this.shakeIntensity;

      this.ctx.translate(offsetX, offsetY);
      this.shakeIntensity *= this.shakeDecay;
    } else {
      this.shakeIntensity = 0;
    }
  }
}
```

### 10.5 Color Palette

```typescript
const COLORS = {
  sky: '#87CEEB',
  grass: '#228B22',
  treeTrunk: '#8B4513',
  treeBark: '#654321',
  branch: '#556B2F',
  player: '#FFD700',
  playerOutline: '#B8860B',
  timerFull: '#32CD32',
  timerLow: '#FF4500',
  scoreText: '#FFFFFF',
  scoreShadow: '#000000',
};
```

---

## 11. Audio System

### 11.1 Audio Manager

```typescript
class AudioManager {
  private sounds: Map<string, HTMLAudioElement[]> = new Map();
  private muted: boolean = false;
  private poolSize: number = 3; // Audio pool per sound

  async loadSounds(): Promise<void> {
    const soundFiles = {
      chop: '/sounds/chop.mp3',
      death: '/sounds/death.mp3',
      highscore: '/sounds/highscore.mp3',
    };

    for (const [name, path] of Object.entries(soundFiles)) {
      const pool: HTMLAudioElement[] = [];
      for (let i = 0; i < this.poolSize; i++) {
        const audio = new Audio(path);
        audio.preload = 'auto';
        pool.push(audio);
      }
      this.sounds.set(name, pool);
    }
  }

  play(soundName: string): void {
    if (this.muted) return;

    const pool = this.sounds.get(soundName);
    if (!pool) return;

    // Find available audio element
    const audio = pool.find(a => a.paused || a.ended) || pool[0];
    audio.currentTime = 0;
    audio.play().catch(() => {}); // Ignore autoplay errors
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
    localStorage.setItem('timber_muted', String(muted));
  }
}
```

### 11.2 Sound Specifications

| Sound | Trigger | Duration | Notes |
|-------|---------|----------|-------|
| chop | Successful chop | < 100ms | Short, satisfying thwack |
| death | Player dies | < 500ms | Comedic bonk/crash |
| highscore | New personal best | < 1s | Celebratory jingle |

---

## 12. Performance Requirements

### 12.1 Targets

| Metric | Target | Measurement |
|--------|--------|-------------|
| Frame Rate | 60 FPS | requestAnimationFrame timing |
| Input Latency | < 50ms | Input event to visual change |
| Initial Load | < 3s | DOMContentLoaded to interactive |
| Bundle Size | < 100KB | Gzipped JS + CSS |
| Memory Usage | < 50MB | Heap snapshot |

### 12.2 Optimization Strategies

```typescript
// 1. Object pooling for segments
class SegmentPool {
  private pool: TreeSegment[] = [];

  acquire(): TreeSegment {
    return this.pool.pop() || { obstacle: 'none' };
  }

  release(segment: TreeSegment): void {
    segment.obstacle = 'none';
    this.pool.push(segment);
  }
}

// 2. Avoid allocations in game loop
// BAD:
render() {
  const position = { x: 100, y: 200 }; // Allocation every frame
}

// GOOD:
private readonly tempPosition = { x: 0, y: 0 };
render() {
  this.tempPosition.x = 100;
  this.tempPosition.y = 200;
}

// 3. Use integer positions for Canvas
// BAD:  ctx.drawImage(img, 10.5, 20.7);
// GOOD: ctx.drawImage(img, 10, 21);
```

### 12.3 Loading Strategy

```typescript
// Critical path (blocking)
1. HTML shell
2. Minimal CSS (inline critical)
3. Game engine JS

// Deferred (non-blocking)
4. Sound files (load after first interaction)
5. Leaderboard data (fetch during gameplay)
6. Analytics (lazy load)
```

---

## 13. Security & Anti-Abuse

### 13.1 Score Validation

```typescript
// Client-side: Generate proof of play
interface ScoreProof {
  score: number;
  gameDuration: number;      // milliseconds
  chopTimestamps: number[];  // First 10 + last 10 timestamps
  sessionId: string;
}

// Server-side validation (Supabase Edge Function - future)
function validateScore(proof: ScoreProof): boolean {
  // 1. Check minimum game duration
  const minDuration = proof.score * 100; // ~100ms per chop minimum
  if (proof.gameDuration < minDuration) return false;

  // 2. Check chop timing (not humanly possible below 50ms)
  const intervals = getIntervals(proof.chopTimestamps);
  if (intervals.some(i => i < 50)) return false;

  // 3. Check session rate limiting
  // Max 10 submissions per session per hour

  return true;
}
```

### 13.2 Rate Limiting

```sql
-- Check submissions in last hour
CREATE OR REPLACE FUNCTION check_rate_limit(p_session_id TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (
    SELECT COUNT(*) < 10
    FROM scores
    WHERE session_id = p_session_id
    AND created_at > NOW() - INTERVAL '1 hour'
  );
END;
$$ LANGUAGE plpgsql;
```

### 13.3 Input Sanitization

```typescript
// Display name sanitization
function sanitizeDisplayName(name: string): string {
  return name
    .trim()
    .slice(0, 20)                    // Max length
    .replace(/[<>&"']/g, '')         // Remove HTML-sensitive chars
    .replace(/\s+/g, ' ')            // Collapse whitespace
    || 'Anonymous';                   // Fallback
}
```

---

## 14. Local Storage Schema

### 14.1 Keys and Structure

```typescript
const STORAGE_KEYS = {
  PLAYER_DATA: 'timber_player',
  SETTINGS: 'timber_settings',
} as const;

// Player data
interface StoredPlayerData {
  version: 1;
  bestScore: number;
  lastDisplayName: string;
  sessionId: string;
  totalGamesPlayed: number;
  lastPlayedAt: string; // ISO date
}

// Settings
interface StoredSettings {
  version: 1;
  muted: boolean;
}
```

### 14.2 Storage Manager

```typescript
class StorageManager {
  private readonly playerKey = 'timber_player';

  getPlayerData(): StoredPlayerData {
    try {
      const data = localStorage.getItem(this.playerKey);
      if (data) {
        return JSON.parse(data);
      }
    } catch {}

    // Return default
    return {
      version: 1,
      bestScore: 0,
      lastDisplayName: '',
      sessionId: this.generateSessionId(),
      totalGamesPlayed: 0,
      lastPlayedAt: new Date().toISOString(),
    };
  }

  savePlayerData(data: Partial<StoredPlayerData>): void {
    const current = this.getPlayerData();
    const updated = { ...current, ...data };
    localStorage.setItem(this.playerKey, JSON.stringify(updated));
  }

  private generateSessionId(): string {
    return crypto.randomUUID();
  }
}
```

---

## 15. File Structure

```
timber-game/
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
├── .env.example
├── .gitignore
│
├── public/
│   ├── favicon.ico
│   ├── og-image.png          # Social sharing image
│   └── sounds/
│       ├── chop.mp3
│       ├── death.mp3
│       └── highscore.mp3
│
├── src/
│   ├── main.ts               # Entry point
│   ├── style.css             # Minimal global styles
│   │
│   ├── game/
│   │   ├── Game.ts           # Main game orchestrator
│   │   ├── GameState.ts      # State types and initial state
│   │   ├── InputHandler.ts   # Keyboard/touch input
│   │   ├── Renderer.ts       # Canvas rendering
│   │   └── AudioManager.ts   # Sound effects
│   │
│   ├── entities/
│   │   ├── Player.ts         # Player logic
│   │   ├── Tree.ts           # Tree segment management
│   │   └── Timer.ts          # Timer logic
│   │
│   ├── services/
│   │   ├── ScoreManager.ts   # Score submission
│   │   ├── Leaderboard.ts    # Leaderboard fetching
│   │   ├── StorageManager.ts # Local storage
│   │   └── supabase.ts       # Supabase client
│   │
│   ├── ui/
│   │   ├── TitleScreen.ts    # Pre-game UI
│   │   ├── GameOverScreen.ts # Post-game UI
│   │   └── LeaderboardUI.ts  # Leaderboard display
│   │
│   ├── utils/
│   │   ├── constants.ts      # Game constants
│   │   ├── helpers.ts        # Utility functions
│   │   └── types.ts          # Shared types
│   │
│   └── assets/
│       └── sprites/          # If using sprite sheets
│
└── tests/
    ├── game.test.ts
    └── scoring.test.ts
```

---

## 16. Deployment

### 16.1 Vercel Configuration

```json
// vercel.json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "framework": "vite",
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=31536000, immutable"
        }
      ]
    },
    {
      "source": "/index.html",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=0, must-revalidate"
        }
      ]
    }
  ]
}
```

### 16.2 Environment Variables

```bash
# .env.example
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### 16.3 Build Commands

```json
// package.json scripts
{
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "lint": "eslint src --ext .ts",
    "typecheck": "tsc --noEmit"
  }
}
```

### 16.4 Deployment Checklist

- [ ] Environment variables set in Vercel dashboard
- [ ] Supabase RLS policies enabled
- [ ] CORS configured for production domain
- [ ] Error tracking setup (optional: Sentry)
- [ ] Analytics setup (optional: Plausible)
- [ ] Social meta tags configured
- [ ] Favicon and OG image uploaded

---

## 17. Testing Strategy

### 17.1 Unit Tests

```typescript
// Game logic tests
describe('Game', () => {
  it('should increase score on successful chop', () => {
    const game = new Game(mockCanvas);
    game.start();
    game.chop('left');
    expect(game.getState().score).toBe(1);
  });

  it('should trigger death on collision', () => {
    const game = new Game(mockCanvas);
    game.start();
    // Force obstacle on left
    game.getState().treeSegments[0].obstacle = 'left';
    game.chop('left');
    expect(game.getState().isPlayerDead).toBe(true);
  });

  it('should decrease timer over time', () => {
    const game = new Game(mockCanvas);
    game.start();
    const initialTimer = game.getState().timerValue;
    // Simulate time passing
    game.update(1000);
    expect(game.getState().timerValue).toBeLessThan(initialTimer);
  });
});
```

### 17.2 Integration Tests

```typescript
// Leaderboard integration
describe('Leaderboard', () => {
  it('should submit score to Supabase', async () => {
    const scoreManager = new ScoreManager();
    await scoreManager.submitScore({
      displayName: 'TestPlayer',
      score: 100,
      sessionId: 'test-session',
    });

    const leaderboard = await scoreManager.getLeaderboard();
    expect(leaderboard.some(e => e.score === 100)).toBe(true);
  });
});
```

### 17.3 Manual Testing Checklist

- [ ] Game loads in < 3 seconds
- [ ] Keyboard controls work (Arrow keys, A/D)
- [ ] Touch controls work (left/right tap)
- [ ] Timer decreases during gameplay
- [ ] Timer refills on chop
- [ ] Collision detection works correctly
- [ ] Score displays correctly
- [ ] Game over triggers on collision
- [ ] Game over triggers on timer expiry
- [ ] Score submission works
- [ ] Leaderboard displays correctly
- [ ] Local best score persists
- [ ] Sound effects play
- [ ] Mute toggle works
- [ ] Works on mobile Chrome/Safari
- [ ] Works on desktop Chrome/Firefox/Safari

---

## Appendix A: Supabase Setup Commands

```sql
-- Run in Supabase SQL Editor

-- 1. Create scores table
CREATE TABLE scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  display_name VARCHAR(20) NOT NULL DEFAULT 'Anonymous',
  score INTEGER NOT NULL CHECK (score >= 0),
  session_id VARCHAR(64) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create indexes
CREATE INDEX idx_scores_score_desc ON scores(score DESC);
CREATE INDEX idx_scores_session_created ON scores(session_id, created_at DESC);

-- 3. Enable RLS
ALTER TABLE scores ENABLE ROW LEVEL SECURITY;

-- 4. Create policies
CREATE POLICY "Scores are viewable by everyone"
ON scores FOR SELECT
USING (true);

CREATE POLICY "Anyone can submit scores"
ON scores FOR INSERT
WITH CHECK (true);

-- 5. Create rate limit function
CREATE OR REPLACE FUNCTION check_rate_limit(p_session_id TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (
    SELECT COUNT(*) < 10
    FROM scores
    WHERE session_id = p_session_id
    AND created_at > NOW() - INTERVAL '1 hour'
  );
END;
$$ LANGUAGE plpgsql;
```

---

## Appendix B: Performance Budget

| Asset Type | Budget | Actual (Target) |
|------------|--------|-----------------|
| HTML | 5 KB | < 3 KB |
| CSS | 10 KB | < 5 KB |
| JavaScript | 80 KB | < 60 KB |
| Sounds | 200 KB | < 150 KB |
| **Total** | **295 KB** | **< 220 KB** |

---

## Appendix C: Browser Support

| Browser | Version | Support Level |
|---------|---------|---------------|
| Chrome | 90+ | Full |
| Firefox | 88+ | Full |
| Safari | 14+ | Full |
| Edge | 90+ | Full |
| Chrome Mobile | 90+ | Full |
| Safari iOS | 14+ | Full |
| Samsung Internet | 14+ | Full |

---

*End of Technical Requirements Document*
