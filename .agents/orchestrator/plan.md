# Project Plan: LaTeX-Style Advisor Chatbot

## Objective
Build a multi-user, production-ready LaTeX-style advisor chatbot implementing Google OAuth login, dynamic sidebar chat history management, and a hosted database, using raw SQL queries and adhering to strict design rules.

## Architecture & Layout
- **Frontend**: Next.js (version 16.2.10, React 19) styled with Latin Modern Roman typography, cream paper background, justified text, and thin borders.
- **Backend API**:
  - `/api/auth/[...nextauth]` or equivalent for Google OAuth.
  - `/api/chat`: formulating counsel, referencing essays, saving to DB.
  - `/api/chats`: listing sessions, starting a session, deleting a session.
- **Database**: PostgreSQL (Neon or Supabase). Raw SQL queries only (no ORMs).
  - `users`: id (uuid/serial), email (text, unique), name (text), image (text), created_at (timestamp).
  - `chats`: id (uuid/serial), user_id (text/int), title (text), created_at (timestamp), updated_at (timestamp).
  - `messages`: id (uuid/serial), chat_id (uuid/serial), role (text: 'user'|'assistant'), content (text), created_at (timestamp).

## Milestones & Decomposition

### Milestone 1: DB & Authentication Infrastructure [In Progress]
- **Tasks**:
  - Install dependencies (`next-auth`, `pg`, `@types/pg`).
  - Create database client `src/lib/db.ts` utilizing connection pool and raw SQL queries.
  - Create database setup/migration script `src/scripts/setup-db.ts` to initialize tables `users`, `chats`, `messages` and run it.
  - Setup NextAuth/Auth.js configuration, restricting routes to authenticated users, and redirecting to the minimalist LaTeX-styled Login page.
- **Success Criteria**:
  - Dependencies installed.
  - Tables created and connection pool tested.
  - Login route redirects unauthenticated users and authenticates via NextAuth.

### Milestone 2: Chat API & Sidebar Frontend [Planned]
- **Tasks**:
  - Implement `/api/chats` to list threads, `/api/chats/[id]` to delete a thread and messages.
  - Modify `/api/chat` to load historical thread messages, save new messages, invoke Gemini API, and save assistant's response.
  - Implement collapsible sidebar on the left matching LaTeX styling.
  - Connect frontend sidebar to dynamic chat loading, starting new chat sessions, and deleting chat histories.
- **Success Criteria**:
  - Database stores and retrieves chat threads and messages via API routes.
  - Frontend sidebar functions seamlessly with all database interactions.

### Milestone 3: Testing, Hardening & Verification [Planned]
- **Tasks**:
  - Implement Tier 1-4 tests (happy path, boundaries, combinations, application-level).
  - Implement Tier 5 (adversarial hardening) checking for SQL injection risk and robust error responses.
  - Run build compilation (`npm run build`).
  - Run static analysis to verify no prisma imports are in API handlers and raw SQL is used.
- **Success Criteria**:
  - Full test suite passes.
  - Forensic Auditor audit is CLEAN.
