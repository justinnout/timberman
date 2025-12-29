import { Game } from './game/Game';
import { AudioManager } from './game/AudioManager';
import { UIManager } from './ui/UIManager';
import { StorageManager } from './services/StorageManager';
import { ScoreManager } from './services/ScoreManager';
import { GameScreen } from './utils/types';
import './style.css';

class TimberGame {
  private game: Game;
  private audioManager: AudioManager;
  private uiManager: UIManager;
  private storageManager: StorageManager;
  private scoreManager: ScoreManager;
  private currentScore: number = 0;

  constructor() {
    this.audioManager = new AudioManager();
    this.uiManager = new UIManager();
    this.storageManager = new StorageManager();
    this.scoreManager = new ScoreManager();

    const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
    if (!canvas) {
      throw new Error('Canvas element not found');
    }

    this.game = new Game(canvas, this.audioManager, {
      onScoreChange: this.handleScoreChange,
      onTimerChange: this.handleTimerChange,
      onGameOver: this.handleGameOver,
      onScreenChange: this.handleScreenChange,
    });

    this.setupUI();
    this.initialize();
  }

  private initialize(): void {
    // Load best score
    const bestScore = this.storageManager.getBestScore();
    this.game.setBestScore(bestScore);
    this.uiManager.showBestScore(bestScore);

    // Load last display name
    const lastName = this.storageManager.getLastDisplayName();
    if (lastName) {
      this.uiManager.setNameInputValue(lastName);
    }

    // Update mute button
    this.uiManager.updateMuteButton(this.audioManager.isMuted());

    // Start game loop
    this.game.start();
  }

  private setupUI(): void {
    // Submit score handler
    this.uiManager.onSubmitScore(async () => {
      await this.submitScore();
    });

    // Play again handlers
    this.uiManager.onPlayAgain(() => {
      this.playAgain();
    });

    // Back to title handler
    this.uiManager.onBackToTitle(() => {
      this.game.reset();
      this.uiManager.showBestScore(this.storageManager.getBestScore());
    });

    // Mute toggle
    this.uiManager.onMuteToggle(() => {
      const isMuted = this.audioManager.toggleMute();
      this.uiManager.updateMuteButton(isMuted);
    });
  }

  private handleScoreChange = (score: number): void => {
    this.currentScore = score;
    this.uiManager.updateScore(score);
  };

  private handleTimerChange = (value: number): void => {
    this.uiManager.updateTimer(value);
  };

  private handleGameOver = (score: number, isNewBest: boolean): void => {
    this.currentScore = score;

    // Update storage
    if (isNewBest) {
      this.storageManager.setBestScore(score);
    }
    this.storageManager.incrementGamesPlayed();

    // Show game over screen
    this.uiManager.showGameOver(score, isNewBest);

    // Show/hide submit button based on Supabase config
    if (this.scoreManager.isConfigured()) {
      this.uiManager.showSubmitButton();
    } else {
      this.uiManager.hideSubmitButton();
    }
  };

  private handleScreenChange = (screen: GameScreen): void => {
    this.uiManager.showScreen(screen);

    if (screen === GameScreen.GAME_OVER) {
      // Focus name input after a short delay
      setTimeout(() => {
        this.uiManager.focusNameInput();
      }, 100);
    }
  };

  private async submitScore(): Promise<void> {
    const displayName = this.uiManager.getNameInputValue() || 'Anonymous';

    // Save display name for next time
    this.storageManager.setLastDisplayName(displayName);

    this.uiManager.disableSubmitButton();

    try {
      const success = await this.scoreManager.submitScore({
        display_name: displayName,
        score: this.currentScore,
        session_id: this.storageManager.getSessionId(),
      });

      if (success) {
        // Show leaderboard
        await this.showLeaderboard();
      } else {
        // Still show leaderboard even if submission failed
        await this.showLeaderboard();
      }
    } catch (err) {
      console.error('Error submitting score:', err);
      await this.showLeaderboard();
    }
  }

  private async showLeaderboard(): Promise<void> {
    this.game.setScreen(GameScreen.LEADERBOARD);
    this.uiManager.showLeaderboardLoading();

    try {
      const [leaderboard, rank] = await Promise.all([
        this.scoreManager.getLeaderboard(),
        this.scoreManager.getPlayerRank(this.currentScore),
      ]);

      this.uiManager.renderLeaderboard(leaderboard, this.currentScore);
      this.uiManager.showPlayerRank(rank, this.currentScore);
    } catch (err) {
      console.error('Error loading leaderboard:', err);
      this.uiManager.renderLeaderboard([]);
    }

    this.uiManager.enableSubmitButton();
  }

  private playAgain(): void {
    console.log('playAgain called');
    this.game.playAgain();
    this.uiManager.updateScore(0);
    this.uiManager.updateTimer(1);
  }
}

// Initialize game when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  console.log('DOM loaded, initializing game...');
  try {
    new TimberGame();
    console.log('Game initialized successfully');
  } catch (err) {
    console.error('Error initializing game:', err);
  }
});
