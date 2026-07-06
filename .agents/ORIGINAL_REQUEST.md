# Original User Request

## 2026-07-05T16:23:29Z

Build a multi-user, production-ready version of the classic LaTeX-style advisor chatbot, implementing Google OAuth login, dynamic sidebar chat history management, and a hosted database.

Working directory: c:\Users\91620\Desktop\Second Brain
Integrity mode: development

## Requirements

### R1. Google OAuth Authentication
- Implement secure user authentication using Google OAuth (recommended using Auth.js / NextAuth.js).
- Restrict chat routes and API endpoints to logged-in users only.
- Preserve a minimalist LaTeX-style "Login" page for unauthenticated visitors.

### R2. Raw SQL PostgreSQL Schema & Storage
- Setup tables for users, chats, and messages in a hosted PostgreSQL database (such as Supabase or Neon).
- All database operations (inserts, selects, joins, deletions) in Next.js API Route Handlers must be written in **raw SQL queries** (e.g. using `pg` or `@neondatabase/serverless` packages) to enable SQL skill development.
- Save chat metadata (title, created time) and individual user messages (role, content, timestamp) securely.

### R3. Sidebar Navigation Panel
- Add a collapsible, minimalist sidebar on the left side of the screen.
- Retrieve the current user's past chats from the database and list them in reverse chronological order.
- Allow users to click a chat to load its message history, start a new chat session, and delete old chat histories.

### R4. LaTeX Aesthetic Consistency
- Ensure the sidebar, login screen, and chat panels preserve the `Latin Modern Roman` typography, cream paper background, justified text alignments, and solid thin black borders. Do not use gradients or bento grids.

## Verification Plan

### Automated Checks
- **Build compilation**: Run `npm run build` to verify there are no TypeScript or compilation errors.
- **SQL static analysis**: Scan route files in `src/app/api/` to ensure no `@prisma/client` is imported and all queries use direct client executions (e.g. *.query or equivalent raw SQL).

### Manual Verification
- Deploy and verify Google login redirection.
- Create new chats, send messages, refresh the page, and check if past chats appear in the left sidebar.
- Run raw SQL SELECT queries inside the database cloud console (Supabase/Neon) to confirm chats/messages are written in tables.

## Acceptance Criteria

### Authentication & Sessions
- [ ] Users must be redirected to a clean, LaTeX-styled "Login" page when unauthenticated.
- [ ] Login must use Google OAuth, creating a user profile in the database.
- [ ] Logged-in users can securely log out, which clears the session and returns them to the login screen.

### Chat History Database
- [ ] Tables for `users`, `chats`, and `messages` are present in the PostgreSQL database.
- [ ] All chat routes use raw SQL statements to INSERT, SELECT, and DELETE records.
- [ ] Message history is preserved across page refreshes.

### Sidebar Navigation
- [ ] A collapsible sidebar is rendered on the left, styled to match the paper-like aesthetic.
- [ ] Sidebar dynamically lists all chat sessions for the logged-in user, ordered by last update.
- [ ] Users can start a new chat (creating a new database record) or delete an existing chat from the sidebar.

## Follow-up — 2026-07-06T03:24:33Z

Please resume the LaTeX-style advisor chatbot project. The state is fully preserved inside the `.agents/` folder in the workspace.
1. Read the persistent briefing at `.agents/BRIEFING.md`.
2. Read the project plan at `.agents/orchestrator/plan.md` and current progress at `.agents/orchestrator/progress.md`.
3. Spawn the Project Orchestrator subagent to resume execution, specifically finalizing the E2E testing track, running verification tests, compiling the production build, and conducting the victory audit.
4. Adhere strictly to the rules: raw SQL queries only, Next.js 16/React 19 conventions, and LaTeX paper styling.
