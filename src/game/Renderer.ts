import { GameState, Side, TreeSegment } from '../utils/types';
import {
  GAME_WIDTH,
  GAME_HEIGHT,
  TREE_WIDTH,
  TREE_X,
  SEGMENT_HEIGHT,
  TREE_BASE_Y,
  BRANCH_WIDTH,
  BRANCH_HEIGHT,
  PLAYER_WIDTH,
  PLAYER_HEIGHT,
  PLAYER_Y,
  PLAYER_OFFSET_X,
  COLORS,
  SCREEN_SHAKE_INTENSITY,
  SCREEN_SHAKE_DECAY,
} from '../utils/constants';

export class Renderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private scale: number = 1;
  private shakeIntensity: number = 0;
  private shakeOffsetX: number = 0;
  private shakeOffsetY: number = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not get 2D context');
    this.ctx = ctx;
    this.setupCanvas();
    window.addEventListener('resize', this.handleResize);
  }

  private setupCanvas = (): void => {
    const container = this.canvas.parentElement;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;

    // Set canvas size
    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;

    // Set display size
    this.canvas.style.width = `${rect.width}px`;
    this.canvas.style.height = `${rect.height}px`;

    // Calculate scale to fit game in canvas
    const scaleX = rect.width / GAME_WIDTH;
    const scaleY = rect.height / GAME_HEIGHT;
    this.scale = Math.min(scaleX, scaleY) * dpr;

    // Disable image smoothing for crisp pixels
    this.ctx.imageSmoothingEnabled = false;
  };

  private handleResize = (): void => {
    this.setupCanvas();
  };

  triggerScreenShake(intensity: number = SCREEN_SHAKE_INTENSITY): void {
    this.shakeIntensity = intensity;
  }

  render(state: GameState): void {
    const ctx = this.ctx;

    // Save context state
    ctx.save();

    // Apply scaling and centering
    const canvasWidth = this.canvas.width;
    const canvasHeight = this.canvas.height;
    const scaledWidth = GAME_WIDTH * this.scale;
    const scaledHeight = GAME_HEIGHT * this.scale;
    const offsetX = (canvasWidth - scaledWidth) / 2;
    const offsetY = (canvasHeight - scaledHeight) / 2;

    // Apply screen shake
    this.updateShake();
    const shakeX = this.shakeOffsetX * this.scale;
    const shakeY = this.shakeOffsetY * this.scale;

    ctx.translate(offsetX + shakeX, offsetY + shakeY);
    ctx.scale(this.scale, this.scale);

    // Clear and draw background
    this.drawBackground();

    // Draw game elements
    this.drawGround();
    this.drawTree(state.treeSegments);
    this.drawPlayer(state.playerSide, state.isPlayerDead);

    // Restore context
    ctx.restore();
  }

  private updateShake(): void {
    if (this.shakeIntensity > 0.5) {
      this.shakeOffsetX = (Math.random() - 0.5) * this.shakeIntensity;
      this.shakeOffsetY = (Math.random() - 0.5) * this.shakeIntensity;
      this.shakeIntensity *= SCREEN_SHAKE_DECAY;
    } else {
      this.shakeIntensity = 0;
      this.shakeOffsetX = 0;
      this.shakeOffsetY = 0;
    }
  }

  private drawBackground(): void {
    const ctx = this.ctx;

    // Sky gradient
    const gradient = ctx.createLinearGradient(0, 0, 0, GAME_HEIGHT);
    gradient.addColorStop(0, COLORS.skyGradientTop);
    gradient.addColorStop(1, COLORS.skyGradientBottom);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    // Simple clouds
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    this.drawCloud(50, 80, 40);
    this.drawCloud(280, 120, 50);
    this.drawCloud(150, 50, 35);
  }

  private drawCloud(x: number, y: number, size: number): void {
    const ctx = this.ctx;
    ctx.beginPath();
    ctx.arc(x, y, size * 0.5, 0, Math.PI * 2);
    ctx.arc(x + size * 0.4, y - size * 0.1, size * 0.4, 0, Math.PI * 2);
    ctx.arc(x + size * 0.8, y, size * 0.45, 0, Math.PI * 2);
    ctx.fill();
  }

  private drawGround(): void {
    const ctx = this.ctx;
    const groundY = TREE_BASE_Y + 20;

    // Main grass
    ctx.fillStyle = COLORS.grass;
    ctx.fillRect(0, groundY, GAME_WIDTH, GAME_HEIGHT - groundY);

    // Darker grass line
    ctx.fillStyle = COLORS.grassDark;
    ctx.fillRect(0, groundY, GAME_WIDTH, 5);
  }

  private drawTree(segments: TreeSegment[]): void {
    const ctx = this.ctx;

    // Draw stump base
    ctx.fillStyle = COLORS.treeTrunk;
    ctx.fillRect(TREE_X - 10, TREE_BASE_Y, TREE_WIDTH + 20, 30);

    // Draw trunk segments from bottom to top
    segments.forEach((segment, index) => {
      const y = TREE_BASE_Y - (index + 1) * SEGMENT_HEIGHT;
      this.drawTrunkSegment(y);

      // Draw branch if there's an obstacle
      if (segment.obstacle !== 'none') {
        this.drawBranch(y, segment.obstacle);
      }
    });

    // Tree top (leaves)
    const topY = TREE_BASE_Y - segments.length * SEGMENT_HEIGHT;
    this.drawTreeTop(topY);
  }

  private drawTrunkSegment(y: number): void {
    const ctx = this.ctx;

    // Main trunk
    ctx.fillStyle = COLORS.treeTrunk;
    ctx.fillRect(TREE_X, y, TREE_WIDTH, SEGMENT_HEIGHT + 2);

    // Bark detail (left)
    ctx.fillStyle = COLORS.treeBark;
    ctx.fillRect(TREE_X + 5, y + 5, 8, SEGMENT_HEIGHT - 10);

    // Bark detail (right)
    ctx.fillStyle = COLORS.treeBarkLight;
    ctx.fillRect(TREE_X + TREE_WIDTH - 15, y + 10, 10, SEGMENT_HEIGHT - 20);
  }

  private drawBranch(y: number, side: 'left' | 'right'): void {
    const ctx = this.ctx;

    const branchY = y + SEGMENT_HEIGHT / 2 - BRANCH_HEIGHT / 2;
    let branchX: number;

    if (side === 'left') {
      branchX = TREE_X - BRANCH_WIDTH;
    } else {
      branchX = TREE_X + TREE_WIDTH;
    }

    // Branch shadow
    ctx.fillStyle = COLORS.branchDark;
    ctx.fillRect(branchX, branchY + 3, BRANCH_WIDTH, BRANCH_HEIGHT);

    // Main branch
    ctx.fillStyle = COLORS.branch;
    ctx.fillRect(branchX, branchY, BRANCH_WIDTH, BRANCH_HEIGHT - 3);

    // Branch leaves
    ctx.fillStyle = '#3D5C2B';
    const leafX = side === 'left' ? branchX - 15 : branchX + BRANCH_WIDTH - 10;
    ctx.beginPath();
    ctx.arc(leafX + 12, branchY + BRANCH_HEIGHT / 2, 18, 0, Math.PI * 2);
    ctx.fill();
  }

  private drawTreeTop(y: number): void {
    const ctx = this.ctx;
    const centerX = TREE_X + TREE_WIDTH / 2;

    ctx.fillStyle = '#2D5A27';

    // Layer 1 (bottom, widest)
    ctx.beginPath();
    ctx.moveTo(centerX - 60, y + 20);
    ctx.lineTo(centerX + 60, y + 20);
    ctx.lineTo(centerX, y - 40);
    ctx.closePath();
    ctx.fill();

    // Layer 2 (middle)
    ctx.beginPath();
    ctx.moveTo(centerX - 45, y - 20);
    ctx.lineTo(centerX + 45, y - 20);
    ctx.lineTo(centerX, y - 70);
    ctx.closePath();
    ctx.fill();

    // Layer 3 (top)
    ctx.beginPath();
    ctx.moveTo(centerX - 30, y - 50);
    ctx.lineTo(centerX + 30, y - 50);
    ctx.lineTo(centerX, y - 90);
    ctx.closePath();
    ctx.fill();
  }

  private drawPlayer(side: Side, isDead: boolean): void {
    const ctx = this.ctx;

    const centerX = TREE_X + TREE_WIDTH / 2;
    let playerX: number;

    if (side === 'left') {
      playerX = centerX - PLAYER_OFFSET_X - PLAYER_WIDTH - TREE_WIDTH / 2;
    } else {
      playerX = centerX + PLAYER_OFFSET_X + TREE_WIDTH / 2;
    }

    const playerY = PLAYER_Y;

    ctx.save();

    // Flip player based on side
    if (side === 'right') {
      ctx.translate(playerX + PLAYER_WIDTH / 2, 0);
      ctx.scale(-1, 1);
      ctx.translate(-(playerX + PLAYER_WIDTH / 2), 0);
    }

    // Death animation - tilt
    if (isDead) {
      const tiltDirection = side === 'left' ? -1 : 1;
      ctx.translate(playerX + PLAYER_WIDTH / 2, playerY + PLAYER_HEIGHT);
      ctx.rotate(tiltDirection * 0.5);
      ctx.translate(-(playerX + PLAYER_WIDTH / 2), -(playerY + PLAYER_HEIGHT));
    }

    // Body (shirt)
    ctx.fillStyle = COLORS.playerShirt;
    ctx.fillRect(playerX + 15, playerY + 25, 30, 35);

    // Head
    ctx.fillStyle = '#FDBF6F';
    ctx.beginPath();
    ctx.arc(playerX + PLAYER_WIDTH / 2, playerY + 15, 15, 0, Math.PI * 2);
    ctx.fill();

    // Hard hat
    ctx.fillStyle = COLORS.player;
    ctx.beginPath();
    ctx.arc(playerX + PLAYER_WIDTH / 2, playerY + 10, 16, Math.PI, 0);
    ctx.fill();
    ctx.fillRect(playerX + 10, playerY + 8, 40, 5);

    // Legs
    ctx.fillStyle = '#4A4A4A';
    ctx.fillRect(playerX + 18, playerY + 58, 10, 22);
    ctx.fillRect(playerX + 32, playerY + 58, 10, 22);

    // Axe
    ctx.fillStyle = '#8B4513';
    ctx.fillRect(playerX + 45, playerY + 30, 25, 5); // Handle

    ctx.fillStyle = '#C0C0C0';
    ctx.beginPath();
    ctx.moveTo(playerX + 65, playerY + 20);
    ctx.lineTo(playerX + 75, playerY + 32);
    ctx.lineTo(playerX + 65, playerY + 45);
    ctx.lineTo(playerX + 60, playerY + 32);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  }

  clear(): void {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  destroy(): void {
    window.removeEventListener('resize', this.handleResize);
  }
}
