# Project: Sovereign Advisor Chatbot

## Architecture
- **Client (UI)**: Next.js pages (App Router) using Tailwind v4. Restricts pages `/` (Chat) and dynamic chat routes `/chat/[id]` to authenticated users. Unauthenticated visitors are redirected to `/login` (LaTeX-styled).
- **Authentication**: Auth.js / NextAuth.js configured with Google Provider. User profiles are verified/saved in the database.
- **Database (PostgreSQL)**: Neon/Supabase PostgreSQL.
- **API Handlers**:
  - `/api/auth/[...nextauth]`: handle OAuth redirects, session tokens, user profile persistence in PostgreSQL using raw SQL.
  - `/api/chats`: CRUD operations for chat threads (create, list, delete) via raw SQL.
  - `/api/chat`: existing chatbot advice model invocation. Modified to load chat history from DB, save new user messages, invoke Gemini API with essay context, and save assistant responses.
- **Data flow**:
  1. User logs in via Google OAuth → session created.
  2. Main page `/` loads → retrieves past chats from `/api/chats` (raw SQL) and displays in collapsible sidebar.
  3. Clicking a chat thread loads history from `/api/chats/[id]/messages` (raw SQL) and routes to `/chat/[id]`.
  4. Sending a message → sends to `/api/chat` (body: `chatId`, `content`) → saves message to DB (raw SQL) → retrieves past messages of this thread (raw SQL) + matching essays → calls Gemini API → saves assistant response to DB (raw SQL) → returns response.
  5. Deleting a chat thread → sends `DELETE` request to `/api/chats/[id]` → deletes messages and chat row from DB (raw SQL).

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | DB & Authentication Infrastructure | Install dependencies, implement raw SQL database client, execute migrations (users, chats, messages tables), configure NextAuth with Google Provider, restrict routes, and design LaTeX-styled login page. | none | DONE |
| 2 | Chat API & Sidebar Frontend | Implement `/api/chats`, `/api/chats/[id]`, and updated `/api/chat` using raw SQL, and implement collapsible LaTeX sidebar and chat navigation. | M1 | DONE |
| 3 | Testing, Hardening & Verification | Setup E2E integration test suite, run static analysis and build scripts, run adversarial testing, verify the Forensic Auditor passes. | M2 | DONE |

## Interface Contracts
### API `GET /api/chats`
- Returns user's chat sessions ordered by last update (updated_at desc).
- **Response**: `200 OK` with JSON array of `{ id: string, title: string, updated_at: string }`.

### API `POST /api/chats`
- Creates a new chat thread.
- **Request Body**: `{ title: string }`
- **Response**: `200 OK` or `201 Created` with JSON `{ id: string, title: string }`.

### API `DELETE /api/chats/[id]`
- Deletes a chat session and all its messages.
- **Response**: `200 OK` with JSON `{ success: true }`.

### API `POST /api/chat`
- Processes user query, saves to DB, queries Gemini, saves model response.
- **Request Body**: `{ chatId: string, content: string }`
- **Response**: `200 OK` with JSON `{ text: string }`.

## Code Layout
- `src/app/page.tsx`: Landing page (redirects to `/login` if not authenticated, otherwise renders main chat UI).
- `src/app/login/page.tsx`: LaTeX-style Login Page.
- `src/app/chat/[id]/page.tsx`: Active chat session page.
- `src/app/api/chats/route.ts`: Chat session management endpoint.
- `src/app/api/chats/[id]/route.ts`: Chat session deletion endpoint.
- `src/app/api/chat/route.ts`: Core advisory chatbot message handler.
- `src/lib/db.ts`: Raw SQL database client (e.g. pg Pool wrapper).
- `src/lib/auth.ts`: NextAuth setup and callback hooks.
