import { createServerClient } from '@supabase/ssr';

const cookieValue = process.env.COOKIE;
const supabase = createServerClient('https://sygwkbkrbowprdopnzgk.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN5Z3drYmtyYm93cHJkb3BuemdrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE1NzQ0NjYsImV4cCI6MjA3NzE1MDQ2Nn0.T8fbPhiKQmhzzfJew3ngaMrZafGy9J_mIqY4WA7SFlo', {
  cookies: {
    get(name) {
      if (name === 'sb-sygwkbkrbowprdopnzgk-auth-token') {
        return cookieValue;
      }
      return undefined;
    },
    set() {},
    remove() {},
  },
});

const { data, error } = await supabase.auth.getSession();
console.log('data', data);
console.log('error', error);
