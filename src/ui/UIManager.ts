import { GameScreen, LeaderboardEntry } from '../utils/types';

export interface UIElements {
  titleScreen: HTMLElement;
  gameOverScreen: HTMLElement;
  leaderboardScreen: HTMLElement;
  hud: HTMLElement;
  scoreDisplay: HTMLElement;
  timerBar: HTMLElement;
  titleBestScore: HTMLElement;
  finalScore: HTMLElement;
  newBest: HTMLElement;
  nameInput: HTMLInputElement;
  submitScoreBtn: HTMLElement;
  playAgainBtn: HTMLElement;
  leaderboardBody: HTMLElement;
  leaderboardTable: HTMLElement;
  leaderboardLoading: HTMLElement;
  leaderboardPlayBtn: HTMLElement;
  leaderboardBackBtn: HTMLElement;
  playerRank: HTMLElement;
  muteBtn: HTMLElement;
  muteIcon: HTMLElement;
}

export class UIManager {
  private elements: UIElements;

  constructor() {
    this.elements = this.getElements();
  }

  private getElements(): UIElements {
    return {
      titleScreen: document.getElementById('title-screen')!,
      gameOverScreen: document.getElementById('gameover-screen')!,
      leaderboardScreen: document.getElementById('leaderboard-screen')!,
      hud: document.getElementById('hud')!,
      scoreDisplay: document.getElementById('score-display')!,
      timerBar: document.getElementById('timer-bar')!,
      titleBestScore: document.getElementById('title-best-score')!,
      finalScore: document.getElementById('final-score')!,
      newBest: document.getElementById('new-best')!,
      nameInput: document.getElementById('name-input') as HTMLInputElement,
      submitScoreBtn: document.getElementById('submit-score-btn')!,
      playAgainBtn: document.getElementById('play-again-btn')!,
      leaderboardBody: document.getElementById('leaderboard-body')!,
      leaderboardTable: document.getElementById('leaderboard-table')!,
      leaderboardLoading: document.getElementById('leaderboard-loading')!,
      leaderboardPlayBtn: document.getElementById('leaderboard-play-btn')!,
      leaderboardBackBtn: document.getElementById('leaderboard-back-btn')!,
      playerRank: document.getElementById('player-rank')!,
      muteBtn: document.getElementById('mute-btn')!,
      muteIcon: document.getElementById('mute-icon')!,
    };
  }

  showScreen(screen: GameScreen): void {
    console.log('showScreen called with:', screen);
    // Hide all screens
    this.elements.titleScreen.classList.remove('active');
    this.elements.gameOverScreen.classList.remove('active');
    this.elements.leaderboardScreen.classList.remove('active');
    this.elements.hud.classList.remove('visible');

    // Show appropriate screen
    switch (screen) {
      case GameScreen.TITLE:
        this.elements.titleScreen.classList.add('active');
        break;
      case GameScreen.PLAYING:
        this.elements.hud.classList.add('visible');
        break;
      case GameScreen.GAME_OVER:
        this.elements.gameOverScreen.classList.add('active');
        break;
      case GameScreen.LEADERBOARD:
        this.elements.leaderboardScreen.classList.add('active');
        break;
    }
  }

  updateScore(score: number): void {
    this.elements.scoreDisplay.textContent = String(score);
  }

  updateTimer(value: number): void {
    const percentage = value * 100;
    this.elements.timerBar.style.width = `${percentage}%`;

    // Change color based on value
    if (value < 0.3) {
      this.elements.timerBar.classList.add('low');
    } else {
      this.elements.timerBar.classList.remove('low');
    }
  }

  showBestScore(score: number): void {
    if (score > 0) {
      this.elements.titleBestScore.textContent = `Best: ${score}`;
    } else {
      this.elements.titleBestScore.textContent = '';
    }
  }

  showGameOver(score: number, isNewBest: boolean): void {
    this.elements.finalScore.textContent = String(score);

    if (isNewBest) {
      this.elements.newBest.classList.add('visible');
    } else {
      this.elements.newBest.classList.remove('visible');
    }
  }

  setNameInputValue(name: string): void {
    this.elements.nameInput.value = name;
  }

  getNameInputValue(): string {
    return this.elements.nameInput.value.trim();
  }

  focusNameInput(): void {
    this.elements.nameInput.focus();
  }

  showLeaderboardLoading(): void {
    this.elements.leaderboardLoading.style.display = 'block';
    this.elements.leaderboardTable.classList.remove('loaded');
  }

  renderLeaderboard(entries: LeaderboardEntry[], playerScore?: number): void {
    this.elements.leaderboardLoading.style.display = 'none';
    this.elements.leaderboardTable.classList.add('loaded');

    const tbody = this.elements.leaderboardBody;
    tbody.innerHTML = '';

    if (entries.length === 0) {
      const row = document.createElement('tr');
      row.innerHTML = '<td colspan="3" style="text-align: center; color: #aaa;">No scores yet. Be the first!</td>';
      tbody.appendChild(row);
      return;
    }

    entries.forEach((entry) => {
      const row = document.createElement('tr');

      // Highlight if this is the player's recent score
      if (playerScore !== undefined && entry.score === playerScore) {
        row.classList.add('current-player');
      }

      row.innerHTML = `
        <td>${entry.rank}</td>
        <td>${this.escapeHtml(entry.displayName)}</td>
        <td>${entry.score}</td>
      `;
      tbody.appendChild(row);
    });
  }

  showPlayerRank(rank: number, score: number): void {
    if (rank > 0) {
      this.elements.playerRank.textContent = `Your score: ${score} (Rank #${rank})`;
    } else {
      this.elements.playerRank.textContent = '';
    }
  }

  updateMuteButton(isMuted: boolean): void {
    this.elements.muteIcon.textContent = isMuted ? '🔇' : '🔊';
  }

  onSubmitScore(callback: () => void): void {
    this.elements.submitScoreBtn.addEventListener('click', callback);
    this.elements.nameInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        callback();
      }
    });
  }

  onPlayAgain(callback: () => void): void {
    console.log('Setting up Play Again handlers, button:', this.elements.playAgainBtn);

    // Debug: check all event phases
    this.elements.playAgainBtn.addEventListener('mousedown', (e) => {
      console.log('Play Again mousedown', e.target);
    });
    this.elements.playAgainBtn.addEventListener('mouseup', (e) => {
      console.log('Play Again mouseup', e.target);
    });
    this.elements.playAgainBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      console.log('Play Again button clicked');
      callback();
    });
    this.elements.leaderboardPlayBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      console.log('Leaderboard Play button clicked');
      callback();
    });
  }

  onBackToTitle(callback: () => void): void {
    this.elements.leaderboardBackBtn.addEventListener('click', callback);
  }

  onMuteToggle(callback: () => void): void {
    this.elements.muteBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      callback();
    });
  }

  disableSubmitButton(): void {
    this.elements.submitScoreBtn.setAttribute('disabled', 'true');
    this.elements.submitScoreBtn.textContent = 'Submitting...';
  }

  enableSubmitButton(): void {
    this.elements.submitScoreBtn.removeAttribute('disabled');
    this.elements.submitScoreBtn.textContent = 'Submit Score';
  }

  hideSubmitButton(): void {
    this.elements.submitScoreBtn.style.display = 'none';
    this.elements.nameInput.parentElement!.style.display = 'none';
  }

  showSubmitButton(): void {
    this.elements.submitScoreBtn.style.display = 'block';
    this.elements.nameInput.parentElement!.style.display = 'block';
  }

  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}
