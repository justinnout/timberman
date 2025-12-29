# Supabase Leaderboard Setup Guide

This guide walks you through setting up Supabase for the Timber game leaderboard.

**Time required:** ~5 minutes

---

## Step 1: Create a Supabase Account

1. Go to [supabase.com](https://supabase.com)
2. Click **Start your project** (or **Sign In** if you have an account)
3. Sign up with GitHub, Google, or email

---

## Step 2: Create a New Project

1. Click **New Project**
2. Fill in the details:
   - **Name:** `timber-game` (or any name you prefer)
   - **Database Password:** Generate a strong password (save this somewhere safe)
   - **Region:** Choose the closest to your users
3. Click **Create new project**
4. Wait ~2 minutes for the project to provision

---

## Step 3: Run the Database Schema

1. In your Supabase dashboard, click **SQL Editor** in the left sidebar
2. Click **New query**
3. Open the file `supabase/schema.sql` from this project
4. Copy and paste the entire contents into the SQL Editor
5. Click **Run** (or press Cmd/Ctrl + Enter)
6. You should see "Success. No rows returned" - this is expected

**Verify it worked:**
```sql
SELECT * FROM scores LIMIT 5;
```
This should return an empty table (no errors).

---

## Step 4: Get Your API Credentials

1. In the left sidebar, click **Project Settings** (gear icon)
2. Click **API** in the settings menu
3. You'll need two values:
   - **Project URL** - looks like `https://xxxxx.supabase.co`
   - **anon public key** - a long string starting with `eyJ...`

---

## Step 5: Configure Environment Variables

1. In the project root, create a `.env` file:
   ```bash
   cp .env.example .env
   ```

2. Open `.env` and fill in your credentials:
   ```
   VITE_SUPABASE_URL=https://your-project-id.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```

3. Save the file

**Important:** Never commit `.env` to git - it's already in `.gitignore`

---

## Step 6: Test the Connection

1. Start the dev server:
   ```bash
   npm run dev
   ```

2. Open http://localhost:3000

3. Play a game until you lose

4. Enter a name and click **Submit Score**

5. You should see the leaderboard with your score!

**Verify in Supabase:**
- Go to **Table Editor** in your Supabase dashboard
- Click on the `scores` table
- You should see your submitted score

---

## Troubleshooting

### "Supabase credentials not configured" in console
- Make sure `.env` file exists in the project root
- Check that variable names are exactly `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
- Restart the dev server after creating/modifying `.env`

### Score not appearing in database
- Check the browser console for errors
- Verify RLS policies are enabled (Step 3)
- Make sure you're using the **anon** key, not the **service_role** key

### CORS errors
- Supabase handles CORS automatically for the anon key
- If you see CORS errors, double-check your Project URL

---

## Optional: View Leaderboard Data

In Supabase SQL Editor, run:

```sql
-- Top 10 scores
SELECT display_name, score, created_at
FROM scores
ORDER BY score DESC
LIMIT 10;

-- Total submissions
SELECT COUNT(*) FROM scores;

-- Scores by session (for rate limiting analysis)
SELECT session_id, COUNT(*) as submissions
FROM scores
GROUP BY session_id
ORDER BY submissions DESC
LIMIT 10;
```

---

## Next Steps

- **Production:** For a production deployment, consider:
  - Enabling rate limiting on the server side
  - Adding score validation
  - Setting up database backups

- **Analytics:** Supabase provides built-in analytics in the dashboard

---

Done! Your leaderboard is now live.
