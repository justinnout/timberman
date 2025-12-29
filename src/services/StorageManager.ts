import { LocalPlayerData } from '../utils/types';
import { STORAGE_KEYS } from '../utils/constants';
import { generateSessionId } from '../utils/helpers';

export class StorageManager {
  private readonly playerKey = STORAGE_KEYS.PLAYER_DATA;

  getPlayerData(): LocalPlayerData {
    try {
      const data = localStorage.getItem(this.playerKey);
      if (data) {
        const parsed = JSON.parse(data);
        // Ensure we have a session ID
        if (!parsed.sessionId) {
          parsed.sessionId = generateSessionId();
          this.savePlayerData(parsed);
        }
        return parsed;
      }
    } catch {
      // Ignore parse errors
    }

    // Return default data
    const defaultData: LocalPlayerData = {
      version: 1,
      bestTime: 0, // 0 means no best time yet
      lastDisplayName: '',
      sessionId: generateSessionId(),
      totalGamesPlayed: 0,
      lastPlayedAt: new Date().toISOString(),
    };

    this.savePlayerData(defaultData);
    return defaultData;
  }

  savePlayerData(data: Partial<LocalPlayerData>): void {
    try {
      const current = this.getPlayerDataRaw();
      const updated: LocalPlayerData = {
        version: 1,
        bestTime: data.bestTime ?? current?.bestTime ?? 0,
        lastDisplayName: data.lastDisplayName ?? current?.lastDisplayName ?? '',
        sessionId: data.sessionId ?? current?.sessionId ?? generateSessionId(),
        totalGamesPlayed: data.totalGamesPlayed ?? current?.totalGamesPlayed ?? 0,
        lastPlayedAt: data.lastPlayedAt ?? new Date().toISOString(),
      };
      localStorage.setItem(this.playerKey, JSON.stringify(updated));
    } catch {
      // Ignore storage errors
    }
  }

  private getPlayerDataRaw(): LocalPlayerData | null {
    try {
      const data = localStorage.getItem(this.playerKey);
      if (data) {
        return JSON.parse(data);
      }
    } catch {
      // Ignore
    }
    return null;
  }

  getBestTime(): number {
    return this.getPlayerData().bestTime;
  }

  setBestTime(timeMs: number): void {
    const current = this.getPlayerData();
    // Lower time is better; 0 means no previous time
    if (current.bestTime === 0 || timeMs < current.bestTime) {
      this.savePlayerData({ bestTime: timeMs });
    }
  }

  getLastDisplayName(): string {
    return this.getPlayerData().lastDisplayName;
  }

  setLastDisplayName(name: string): void {
    this.savePlayerData({ lastDisplayName: name });
  }

  getSessionId(): string {
    return this.getPlayerData().sessionId;
  }

  incrementGamesPlayed(): void {
    const current = this.getPlayerData();
    this.savePlayerData({
      totalGamesPlayed: current.totalGamesPlayed + 1,
      lastPlayedAt: new Date().toISOString(),
    });
  }
}
