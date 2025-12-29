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
  score: number;
  playerSide: Side;
  treeSegments: TreeSegment[];
  timerValue: number;
  timerDecayRate: number;
  chopCount: number;
  isPlayerDead: boolean;
  lastChopTime: number;
  deathReason: 'collision' | 'timeout' | null;
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
  score: number;
  isCurrentPlayer: boolean;
  date: Date;
}

export interface LocalPlayerData {
  version: number;
  bestScore: number;
  lastDisplayName: string;
  sessionId: string;
  totalGamesPlayed: number;
  lastPlayedAt: string;
}

export interface StoredSettings {
  version: number;
  muted: boolean;
}
