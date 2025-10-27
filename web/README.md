## Forget Me Not Dashboard

This app lets you authenticate with Supabase, register ESP8266 “leaf” devices, create sender/receiver pairs, and monitor touch events in real time. It is built with the Next.js App Router and Supabase Auth helpers so it can be deployed straight to Vercel.

## Local Development

```bash
cd web
cp .env.example .env.local   # fill in Supabase values
npm install
npm run dev
```

Browse to [http://localhost:3000](http://localhost:3000) and sign up or sign in with the same auth provider you enabled in Supabase.

## Environment Variables

| Key | Description |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL (`https://<project-ref>.supabase.co`) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public anon key from Settings → API |
| `NEXT_PUBLIC_TOUCH_EVENT_URL` | (Optional) Fully qualified URL of the deployed `touch-event` Edge Function |

When running server actions locally (insert/update/delete), make sure the Supabase policies allow the signed-in user to perform the action. The helpers use the anon key and session cookies and do **not** require the service-key.

## Supabase Checklist

1. Create the tables (`devices`, `pairs`, `events`) and policies supplied earlier in the Supabase SQL editor.
2. Enable Realtime on `public.events`.
3. Deploy the `touch-event` Edge Function and add the service role key plus URL in the function’s environment variables.
4. Invite or register users through Supabase Auth so they can sign in here.

## Deploying with Vercel

1. Push this repo to GitHub (the root contains `web` and will be picked up by Vercel).
2. In Vercel, “Add New Project” → import `Mayflymusic/Forget-me-not` → set **Root Directory** to `web`.
3. Configure the environment variables above for the `Production`, `Preview`, and optional `Development` environments.
4. Deploy. Every push to `main` will trigger a new Vercel build.

## Tooling

- `npm run lint` – ESLint with Next.js rules.
- `npm run build` – production build (set env vars first).
- `npm run dev` – local dev server.

Feel free to extend the UI with more device diagnostics, event filtering, or OTA provisioning workflows as you iterate on the firmware.
