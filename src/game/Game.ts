import { GameState, GameScreen, TreeSegment, Side } from '../utils/types';
import {
  VISIBLE_SEGMENTS,
  INITIAL_TIMER_VALUE,
  TIMER_DECAY_RATE,
  TIMER_REFILL_BASE,
  TIMER_REFILL_DECAY,
  MIN_TIMER_REFILL,
  OBSTACLE_CHANCE_BASE,
  OBSTACLE_CHANCE_INCREASE,
  MAX_OBSTACLE_CHANCE,
  TIMER_DECAY_INCREASE,
} from '../utils/constants';
import { clamp } from '../utils/helpers';
import { Renderer } from './Renderer';
import { InputHandler } from './InputHandler';
import { AudioManager } from './AudioManager';

export interface GameCallbacks {
  onScoreChange: (score: number) => void;
  onTimerChange: (value: number) => void;
  onGameOver: (score: number, isNewBest: boolean) => void;
  onScreenChange: (screen: GameScreen) => void;
}

export class Game {
  private state: GameState;
  private renderer: Renderer;
  private inputHandler: InputHandler;
  private audioManager: AudioManager;
  private callbacks: GameCallbacks;
  private animationFrameId: number | null = null;
  private lastFrameTime: number = 0;
  private bestScore: number = 0;

  constructor(
    canvas: HTMLCanvasElement,
    audioManager: AudioManager,
    callbacks: GameCallbacks
  ) {
    this.renderer = new Renderer(canvas);
    this.audioManager = audioManager;
    this.callbacks = callbacks;
    this.state = this.createInitialState();

    this.inputHandler = new InputHandler({
      onLeft: () => this.handleInput('left'),
      onRight: () => this.handleInput('right'),
      onAnyKey: () => this.handleAnyKey(),
    });
  }

  private createInitialState(): GameState {
    return {
      screen: GameScreen.TITLE,
      score: 0,
      playerSide: 'left',
      treeSegments: this.generateInitialSegments(),
      timerValue: INITIAL_TIMER_VALUE,
      timerDecayRate: TIMER_DECAY_RATE,
      chopCount: 0,
      isPlayerDead: false,
      lastChopTime: 0,
      deathReason: null,
    };
  }

  private generateInitialSegments(): TreeSegment[] {
    const segments: TreeSegment[] = [];

    // First few segments have no obstacles (safe start)
    for (let i = 0; i < 3; i++) {
      segments.push({ obstacle: 'none' });
    }

    // Remaining segments can have obstacles
    for (let i = 3; i < VISIBLE_SEGMENTS; i++) {
      segments.push(this.generateSegment(segments, 0));
    }

    return segments;
  }

  private generateSegment(existingSegments: TreeSegment[], chopCount?: number): TreeSegment {
    const currentChopCount = chopCount ?? this.state?.chopCount ?? 0;
    const obstacleChance = Math.min(
      MAX_OBSTACLE_CHANCE,
      OBSTACLE_CHANCE_BASE + currentChopCount * OBSTACLE_CHANCE_INCREASE
    );

    if (Math.random() < obstacleChance) {
      const lastSegment = existingSegments[existingSegments.length - 1];

      // Avoid consecutive same-side obstacles
      if (lastSegment && lastSegment.obstacle !== 'none') {
        if (Math.random() < 0.5) {
          return {
            obstacle: lastSegment.obstacle === 'left' ? 'right' : 'left',
          };
        }
        return { obstacle: 'none' };
      }

      return { obstacle: Math.random() < 0.5 ? 'left' : 'right' };
    }

    return { obstacle: 'none' };
  }

  start(): void {
    this.inputHandler.attach(document.body);
    this.lastFrameTime = performance.now();
    this.loop(this.lastFrameTime);
  }

  stop(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    this.inputHandler.detach();
  }

  private loop = (timestamp: number): void => {
    const deltaTime = Math.min(timestamp - this.lastFrameTime, 33.33);
    this.lastFrameTime = timestamp;

    if (this.state.screen === GameScreen.PLAYING && !this.state.isPlayerDead) {
      this.update(deltaTime);
    }

    this.renderer.render(this.state);
    this.animationFrameId = requestAnimationFrame(this.loop);
  };

  private update(deltaTime: number): void {
    // Timer decay with acceleration
    const decayMultiplier = 1 + this.state.chopCount * TIMER_DECAY_INCREASE;
    const decay = this.state.timerDecayRate * decayMultiplier * (deltaTime / 1000);

    this.state.timerValue = Math.max(0, this.state.timerValue - decay);
    this.callbacks.onTimerChange(this.state.timerValue);

    // Check timer death
    if (this.state.timerValue <= 0) {
      this.triggerDeath('timeout');
    }
  }

  private handleInput(side: Side): void {
    if (this.state.screen === GameScreen.TITLE) {
      this.startGame();
      this.chop(side);
    } else if (this.state.screen === GameScreen.PLAYING && !this.state.isPlayerDead) {
      this.chop(side);
    }
  }

  private handleAnyKey(): void {
    if (this.state.screen === GameScreen.TITLE) {
      this.startGame();
    }
  }

  private startGame(): void {
    console.log('startGame called, current screen:', this.state?.screen);
    this.state = this.createInitialState();
    this.state.screen = GameScreen.PLAYING;
    console.log('New state created, switching to PLAYING');
    this.callbacks.onScreenChange(GameScreen.PLAYING);
    this.callbacks.onScoreChange(0);
    this.callbacks.onTimerChange(INITIAL_TIMER_VALUE);
  }

  private chop(side: Side): void {
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

    // Refill timer with diminishing returns
    const refillAmount = Math.max(
      MIN_TIMER_REFILL,
      TIMER_REFILL_BASE - this.state.chopCount * TIMER_REFILL_DECAY
    );
    this.state.timerValue = clamp(this.state.timerValue + refillAmount, 0, 1);

    // Shift segments
    this.state.treeSegments.shift();
    this.state.treeSegments.push(this.generateSegment(this.state.treeSegments));

    // Effects
    this.audioManager.play('chop');
    this.renderer.triggerScreenShake();
    this.callbacks.onScoreChange(this.state.score);
    this.callbacks.onTimerChange(this.state.timerValue);
  }

  private triggerDeath(reason: 'collision' | 'timeout'): void {
    this.state.isPlayerDead = true;
    this.state.deathReason = reason;

    this.audioManager.play('death');

    const isNewBest = this.state.score > this.bestScore;
    if (isNewBest) {
      this.bestScore = this.state.score;
      this.audioManager.play('highscore');
    }

    // Delay before showing game over screen
    setTimeout(() => {
      this.state.screen = GameScreen.GAME_OVER;
      this.callbacks.onScreenChange(GameScreen.GAME_OVER);
      this.callbacks.onGameOver(this.state.score, isNewBest);
    }, 500);
  }

  setBestScore(score: number): void {
    this.bestScore = score;
  }

  getBestScore(): number {
    return this.bestScore;
  }

  getState(): Readonly<GameState> {
    return this.state;
  }

  setScreen(screen: GameScreen): void {
    this.state.screen = screen;
    this.callbacks.onScreenChange(screen);
  }

  reset(): void {
    this.state = this.createInitialState();
    this.callbacks.onScreenChange(GameScreen.TITLE);
  }

  playAgain(): void {
    console.log('Game.playAgain called');
    this.startGame();
  }

  destroy(): void {
    this.stop();
    this.renderer.destroy();
  }
}
