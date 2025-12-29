export enum GameScreen {
  TITLE = 'TITLE',
  PLAYING = 'PLAYING',
  GAME_OVER = 'GAME_OVER',
  LEADERBOARD = 'LEADERBOARD',
}

export type Side = 'left' | 'right';
export type ObstacleType = 'none' | 'left' | 'right';

export interface TreeSegment {
  obstacle: ObstacleType;
}

export interface GameState {
  screen: GameScreen;
  blocksChopped: number;
  playerSide: Side;
  treeSegments: TreeSegment[];
  progress: number; // 0-1 progress toward TARGET_BLOCKS
  elapsedTime: number; // milliseconds
  isPlayerDead: boolean;
  gameWon: boolean;
  lastChopTime: number;
}

export interface ScoreRecord {
  id: string;
  display_name: string;
  score: number;
  session_id: string;
  created_at: string;
}

export interface ScoreSubmission {
  display_name: string;
  score: number;
  session_id: string;
}

export interface LeaderboardEntry {
  rank: number;
  displayName: string;
  timeMs: number; // elapsed time in milliseconds
  isCurrentPlayer: boolean;
  date: Date;
}

export interface LocalPlayerData {
  version: number;
  bestTime: number; // best completion time in milliseconds (0 = no record)
  lastDisplayName: string;
  sessionId: string;
  totalGamesPlayed: number;
  lastPlayedAt: string;
}

export interface StoredSettings {
  version: number;
  muted: boolean;
}
