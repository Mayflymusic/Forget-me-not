# Forget Me Not

This repository hosts the full stack for the Forget Me Not project:

- `web/` – Next.js dashboard deployed on Vercel. Authenticates with Supabase, manages ESP “leaf” devices, and visualises touch events.
- `firmware/` (future) – place firmware sketches for the sender/receiver ESP8266 boards.
- `supabase/` (future) – check in SQL migrations or function source when you pull them down with the Supabase CLI.

## First-Time Setup

1. Clone the repo locally.
2. In the `web` directory copy `.env.example` → `.env.local` and fill in:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `NEXT_PUBLIC_TOUCH_EVENT_URL` (optional helper for the UI)
3. Install dependencies and run the dev server:

   ```bash
   cd web
   npm install
   npm run dev
   ```

4. Sign up/sign in with the same Supabase Auth provider you enabled in the dashboard.
5. Add your sender/receiver devices, create a pair, and confirm touch events populate after hitting the `touch-event` Edge Function.

## Deploying

1. Push this repo to GitHub (`Mayflymusic/Forget-me-not`).
2. In Vercel choose “Add New Project” → import the repo → set the root directory to `web`.
3. Configure the same Supabase environment variables in Vercel (Production + Preview).
4. Deploy. Commits to `main` redeploy automatically.

Supabase already contains the tables, policies, and Edge Function you created in the dashboard. When you have a local CLI setup, add migrations/functions under `supabase/` so they stay in version control.

## Next Steps

- Add firmware sketches under `firmware/sender` and `firmware/receiver` and compile with the Arduino CLI.
- Use the Supabase CLI to pull the current schema (`supabase db pull`) so migrations live in the repo.
- Wire up GitHub Actions for linting the web app and compiling firmware before merging to `main`.
