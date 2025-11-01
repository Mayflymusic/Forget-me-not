import { createServerClient } from '@supabase/ssr';

const SUPABASE_URL = 'https://sygwkbkrbowprdopnzgk.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN5Z3drYmtyYm93cHJkb3BuemdrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE1NzQ0NjYsImV4cCI6MjA3NzE1MDQ2Nn0.T8fbPhiKQmhzzfJew3ngaMrZafGy9J_mIqY4WA7SFlo';

const cookieJar = new Map();

const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  cookies: {
    get(name) {
      return null;
    },
    set(name, value, options) {
      cookieJar.set(name, { value, options });
    },
    remove(name, options) {
      cookieJar.set(name, { value: '', options: { ...options, maxAge: 0 } });
    },
  },
});

try {
  const { error } = await supabase.auth.signInWithPassword({
    email: 'mayflymusic42@gmail.com',
    password: 'dhbw2026!#C',
  });
  console.log('error', error);
} catch (error) {
  console.error('exception', error);
}

console.log('cookieJar', Array.from(cookieJar.entries()).map(([name, { options }]) => ({ name, options })));
