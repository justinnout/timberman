import { GameState, GameScreen, TreeSegment, Side } from '../utils/types';
import {
  VISIBLE_SEGMENTS,
  TARGET_BLOCKS,
  OBSTACLE_CHANCE_BASE,
  OBSTACLE_CHANCE_INCREASE,
  MAX_OBSTACLE_CHANCE,
} from '../utils/constants';
import { Renderer } from './Renderer';
import { InputHandler } from './InputHandler';
import { AudioManager } from './AudioManager';

export interface GameCallbacks {
  onBlocksChange: (blocks: number) => void;
  onProgressChange: (progress: number) => void;
  onTimeChange: (elapsedMs: number) => void;
  onGameOver: (elapsedMs: number, won: boolean, isNewBest: boolean) => void;
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
  private bestTime: number = 0; // 0 means no best time yet

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
      blocksChopped: 0,
      playerSide: 'left',
      treeSegments: this.generateInitialSegments(),
      progress: 0,
      elapsedTime: 0,
      isPlayerDead: false,
      gameWon: false,
      lastChopTime: 0,
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

  private generateSegment(existingSegments: TreeSegment[], blocksChopped?: number): TreeSegment {
    const currentBlocks = blocksChopped ?? this.state?.blocksChopped ?? 0;
    const obstacleChance = Math.min(
      MAX_OBSTACLE_CHANCE,
      OBSTACLE_CHANCE_BASE + currentBlocks * OBSTACLE_CHANCE_INCREASE
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

    if (this.state.screen === GameScreen.PLAYING && !this.state.isPlayerDead && !this.state.gameWon) {
      this.update(deltaTime);
    }

    this.renderer.render(this.state);
    this.animationFrameId = requestAnimationFrame(this.loop);
  };

  private update(deltaTime: number): void {
    // Track elapsed time
    this.state.elapsedTime += deltaTime;
    this.callbacks.onTimeChange(this.state.elapsedTime);
  }

  private handleInput(side: Side): void {
    if (this.state.screen === GameScreen.TITLE || this.state.screen === GameScreen.GAME_OVER) {
      this.startGame();
      this.chop(side);
    } else if (this.state.screen === GameScreen.PLAYING && !this.state.isPlayerDead && !this.state.gameWon) {
      this.chop(side);
    }
  }

  private handleAnyKey(): void {
    if (this.state.screen === GameScreen.TITLE || this.state.screen === GameScreen.GAME_OVER) {
      this.startGame();
    }
  }

  private startGame(): void {
    this.state = this.createInitialState();
    this.state.screen = GameScreen.PLAYING;
    this.callbacks.onScreenChange(GameScreen.PLAYING);
    this.callbacks.onBlocksChange(0);
    this.callbacks.onProgressChange(0);
    this.callbacks.onTimeChange(0);
  }

  private chop(side: Side): void {
    // Move player
    this.state.playerSide = side;

    // Check collision with bottom segment
    const bottomSegment = this.state.treeSegments[0];
    if (bottomSegment.obstacle === side) {
      this.triggerDeath();
      return;
    }

    // Successful chop
    this.state.blocksChopped += 1;
    this.state.progress = this.state.blocksChopped / TARGET_BLOCKS;
    this.state.lastChopTime = performance.now();

    // Shift segments
    this.state.treeSegments.shift();
    this.state.treeSegments.push(this.generateSegment(this.state.treeSegments));

    // Effects
    this.audioManager.play('chop');
    this.renderer.triggerScreenShake();
    this.callbacks.onBlocksChange(this.state.blocksChopped);
    this.callbacks.onProgressChange(this.state.progress);

    // Check win condition
    if (this.state.blocksChopped >= TARGET_BLOCKS) {
      this.triggerVictory();
    }
  }

  private triggerVictory(): void {
    this.state.gameWon = true;

    this.audioManager.play('victory');

    // Check if new best time (lower is better, 0 means no previous best)
    const isNewBest = this.bestTime === 0 || this.state.elapsedTime < this.bestTime;
    if (isNewBest) {
      this.bestTime = this.state.elapsedTime;
    }

    // Delay before showing game over screen
    setTimeout(() => {
      this.state.screen = GameScreen.GAME_OVER;
      this.callbacks.onScreenChange(GameScreen.GAME_OVER);
      this.callbacks.onGameOver(this.state.elapsedTime, true, isNewBest);
    }, 500);
  }

  private triggerDeath(): void {
    this.state.isPlayerDead = true;

    this.audioManager.play('death');

    // Delay before showing game over screen
    setTimeout(() => {
      this.state.screen = GameScreen.GAME_OVER;
      this.callbacks.onScreenChange(GameScreen.GAME_OVER);
      this.callbacks.onGameOver(this.state.elapsedTime, false, false);
    }, 500);
  }

  setBestTime(timeMs: number): void {
    this.bestTime = timeMs;
  }

  getBestTime(): number {
    return this.bestTime;
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
    this.startGame();
  }

  destroy(): void {
    this.stop();
    this.renderer.destroy();
  }
}
