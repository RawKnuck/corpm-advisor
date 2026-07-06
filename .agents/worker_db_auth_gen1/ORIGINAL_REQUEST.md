## 2026-07-05T16:50:40Z
You are a replacement Worker agent (generation 1) for the DB & Auth infrastructure milestone.
The previous worker started the implementation but hung before completion.

Here is what has been done:
1. Environment variables added to `.env` (DATABASE_URL, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, NEXTAUTH_SECRET, NEXTAUTH_URL).
2. Dependencies added to `package.json` (`pg`, `next-auth`, `@types/pg`).
3. Database client created at `src/lib/db.ts`.
4. Migration script created at `src/scripts/setup-db.mjs`.

Your tasks:
1. Run the database migration script (`node src/scripts/setup-db.mjs`) and verify it creates the tables `users`, `chats`, and `messages` successfully in the local PostgreSQL database. If there are connection or other database errors, fix them.
2. Implement NextAuth configuration at `src/app/api/auth/[...nextauth]/route.ts`:
   - Google Provider (uses environment variables client ID and client secret).
   - Custom Credentials Provider (for local development/testing). This provider should accept an email and name, query the `users` table via raw SQL to check if the user exists. If not, insert them via raw SQL.
   - Implement `signIn` callback: when a user logs in (via Google or Credentials), execute a raw SQL query to insert them into `users` table if they do not exist (or update their profile if they do).
   - Export the NextAuth handler as GET and POST.
3. Protect routes: modify `src/app/page.tsx` or create middleware to protect pages `/` and `/chat/[id]`. If the session is missing, redirect the user to `/login`.
4. Create the LaTeX-style login page at `src/app/login/page.tsx` with a cream paper background, thin solid borders, justified text, and a "Login with Google" button. Also include a simple mock credentials form for development and test suites.
5. Run `npm run build` to verify the build compiles without errors.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A Forensic Auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Please write your implementation report in `c:\Users\91620\Desktop\Second Brain\.agents\worker_db_auth_gen1\changes.md` and handoff report in `c:\Users\91620\Desktop\Second Brain\.agents\worker_db_auth_gen1\handoff.md`, and notify me when complete.
