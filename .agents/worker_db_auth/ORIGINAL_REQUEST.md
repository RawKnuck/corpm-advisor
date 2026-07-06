## 2026-07-05T16:26:30Z

You are a Worker agent. Your task is to implement Milestone 1: DB & Authentication Infrastructure.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A Forensic Auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Detailed Instructions:
1. Initialize the environment variables in c:\Users\91620\Desktop\Second Brain\.env by appending:
   DATABASE_URL="postgres://postgres:postgres@localhost:51214/template1?sslmode=disable"
   GOOGLE_CLIENT_ID="mock-google-client-id"
   GOOGLE_CLIENT_SECRET="mock-google-client-secret"
   NEXTAUTH_SECRET="some-random-secret-key-at-least-32-chars-long"
   NEXTAUTH_URL="http://localhost:3000"
2. Install the following npm dependencies (package.json):
   - `pg` and dev dependency `@types/pg`
   - `next-auth`
3. Create `src/lib/db.ts` as a database client. It should create a `Pool` from `pg` using the `DATABASE_URL` environment variable and expose a method `query(text, params)` to execute queries. Ensure it handles connection errors gracefully.
4. Create a database migration/setup script in plain JS/MJS `src/scripts/setup-db.mjs`. It should execute raw SQL queries to create the following tables if they do not exist:
   - `users`: id VARCHAR(255) PRIMARY KEY (or UUID/serial, but VARCHAR(255) fits next-auth provider sub IDs perfectly), email VARCHAR(255) UNIQUE, name VARCHAR(255), image VARCHAR(255), created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP.
   - `chats`: id UUID PRIMARY KEY DEFAULT gen_random_uuid(), user_id VARCHAR(255) REFERENCES users(id) ON DELETE CASCADE, title VARCHAR(255) NOT NULL, created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP.
   - `messages`: id UUID PRIMARY KEY DEFAULT gen_random_uuid(), chat_id UUID REFERENCES chats(id) ON DELETE CASCADE, role VARCHAR(50) NOT NULL (e.g. 'user' or 'assistant'), content TEXT NOT NULL, created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP.
   Run this script and verify the tables are successfully created.
5. Create NextAuth API handler at `src/app/api/auth/[...nextauth]/route.ts`.
   - Configure it with the Google Provider.
   - Also configure a credentials/mock provider for local development/testing. This credential provider should allow passing an email and name, check if a user exists in the `users` table via raw SQL, and if not, insert them via raw SQL.
   - Implement `signIn` callback: when a user logs in (via Google or Credentials), execute a raw SQL query to insert them into `users` table if they do not exist (or update their profile if they do).
   - Export the NextAuth handler as GET and POST.
6. Restrict pages: Modify `src/app/page.tsx` or set up Next.js authentication checks. If a user is not logged in, redirect them to `/login`.
7. Create a LaTeX-styled Login page at `src/app/login/page.tsx` with a cream paper background, thin solid borders, justified text, and a "Login with Google" button. Also include a simple mock credentials form for development and test suites.
8. Verify that the build still compiles successfully by running `npm run build`.

Please write your implementation report in `c:\Users\91620\Desktop\Second Brain\.agents\worker_db_auth\changes.md` and handoff report in `c:\Users\91620\Desktop\Second Brain\.agents\worker_db_auth\handoff.md`, and notify me when complete.
