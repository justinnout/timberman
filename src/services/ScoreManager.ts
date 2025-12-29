import { ScoreRecord, ScoreSubmission, LeaderboardEntry } from '../utils/types';
import { getSupabase, isSupabaseConfigured } from './supabase';
import { sanitizeDisplayName } from '../utils/helpers';

export class ScoreManager {
  private lastSubmittedScore: number | null = null;

  async submitScore(submission: ScoreSubmission): Promise<boolean> {
    const supabase = getSupabase();
    if (!supabase) {
      console.log('Supabase not configured, score not submitted');
      return false;
    }

    try {
      const sanitizedSubmission: ScoreSubmission = {
        display_name: sanitizeDisplayName(submission.display_name),
        score: submission.score,
        session_id: submission.session_id,
      };

      const { error } = await supabase
        .from('scores')
        .insert(sanitizedSubmission);

      if (error) {
        console.error('Error submitting score:', error);
        return false;
      }

      this.lastSubmittedScore = submission.score;
      return true;
    } catch (err) {
      console.error('Error submitting score:', err);
      return false;
    }
  }

  async getLeaderboard(limit: number = 50): Promise<LeaderboardEntry[]> {
    const supabase = getSupabase();
    if (!supabase) {
      return [];
    }

    try {
      const { data, error } = await supabase
        .from('scores')
        .select('*')
        .order('score', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Error fetching leaderboard:', error);
        return [];
      }

      return (data as ScoreRecord[]).map((record, index) => ({
        rank: index + 1,
        displayName: record.display_name,
        score: record.score,
        isCurrentPlayer: false,
        date: new Date(record.created_at),
      }));
    } catch (err) {
      console.error('Error fetching leaderboard:', err);
      return [];
    }
  }

  async getPlayerRank(score: number): Promise<number> {
    const supabase = getSupabase();
    if (!supabase) {
      return 0;
    }

    try {
      const { count, error } = await supabase
        .from('scores')
        .select('*', { count: 'exact', head: true })
        .gt('score', score);

      if (error) {
        console.error('Error getting player rank:', error);
        return 0;
      }

      return (count ?? 0) + 1;
    } catch (err) {
      console.error('Error getting player rank:', err);
      return 0;
    }
  }

  isConfigured(): boolean {
    return isSupabaseConfigured();
  }

  getLastSubmittedScore(): number | null {
    return this.lastSubmittedScore;
  }
}
