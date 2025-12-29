// Game dimensions (logical pixels)
export const GAME_WIDTH = 400;
export const GAME_HEIGHT = 600;

// Tree configuration
export const TREE_WIDTH = 80;
export const TREE_X = GAME_WIDTH / 2 - TREE_WIDTH / 2;
export const SEGMENT_HEIGHT = 50;
export const VISIBLE_SEGMENTS = 10;
export const TREE_BASE_Y = GAME_HEIGHT - 80;

// Branch/Obstacle configuration
export const BRANCH_WIDTH = 70;
export const BRANCH_HEIGHT = 25;

// Player configuration
export const PLAYER_WIDTH = 60;
export const PLAYER_HEIGHT = 80;
export const PLAYER_Y = TREE_BASE_Y - PLAYER_HEIGHT + 10;
export const PLAYER_OFFSET_X = 20; // Distance from tree center

// Timer configuration
export const INITIAL_TIMER_VALUE = 1.0;
export const TIMER_DECAY_RATE = 0.15; // Per second
export const TIMER_REFILL_BASE = 0.12;
export const TIMER_REFILL_DECAY = 0.0008; // Refill decreases per chop
export const MIN_TIMER_REFILL = 0.04;

// Difficulty scaling
export const OBSTACLE_CHANCE_BASE = 0.35;
export const OBSTACLE_CHANCE_INCREASE = 0.003; // Per chop
export const MAX_OBSTACLE_CHANCE = 0.75;
export const TIMER_DECAY_INCREASE = 0.002; // Per chop

// Colors
export const COLORS = {
  sky: '#87CEEB',
  skyGradientTop: '#4A90D9',
  skyGradientBottom: '#87CEEB',
  grass: '#228B22',
  grassDark: '#1B6B1B',
  treeTrunk: '#8B4513',
  treeBark: '#654321',
  treeBarkLight: '#A0522D',
  branch: '#6B8E23',
  branchDark: '#556B2F',
  player: '#FFD700',
  playerOutline: '#B8860B',
  playerShirt: '#E74C3C',
  timerFull: '#32CD32',
  timerMid: '#FFD700',
  timerLow: '#FF4500',
  white: '#FFFFFF',
  black: '#000000',
};

// Animation
export const SCREEN_SHAKE_INTENSITY = 6;
export const SCREEN_SHAKE_DECAY = 0.85;

// Audio
export const SOUNDS = {
  chop: 'chop',
  death: 'death',
  highscore: 'highscore',
} as const;

// Storage keys
export const STORAGE_KEYS = {
  PLAYER_DATA: 'timber_player',
  SETTINGS: 'timber_settings',
} as const;
