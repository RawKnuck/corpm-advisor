# Handoff Report - Chat API & Sidebar Frontend

This report documents the implementation of **Milestone 2: Chat API & Sidebar Frontend** for The Sovereign Advisor.

## 1. Observation
- We observed that the database uses standard PostgreSQL with a pg pool client in `src/lib/db.ts` with schema defined in `src/scripts/setup-db.mjs`.
- The database contains `chats` and `messages` tables:
  - `chats` table: `id` (UUID), `user_id` (VARCHAR), `title` (VARCHAR), `created_at` (TIMESTAMPTZ), `updated_at` (TIMESTAMPTZ).
  - `messages` table: `id` (UUID), `chat_id` (UUID REFERENCES chats(id)), `role` (VARCHAR), `content` (TEXT), `created_at` (TIMESTAMPTZ).
- The Next.js App Router dynamic routing expects page dynamic parameters as Promise objects in Next.js 16.
- The build originally failed during type checking due to `.next` dev server cached routes configuration:
  > `.next/dev/types/validator.ts:5:79`
  > `Type error: File 'C:/Users/91620/Desktop/Second Brain/.next/dev/types/routes.d.ts' is not a module.`
- After cleaning the `.next` directory, the build runs from scratch.

## 2. Logic Chain
- To implement chat session management and history, we created the following REST API endpoints:
  - `GET /api/chats`: queries `chats` using user ID from the NextAuth session, sorted by `updated_at DESC`.
  - `POST /api/chats`: inserts a new row in the `chats` table with user ID and title.
  - `DELETE /api/chats/[id]`: verifies session user matches chat session owner, and executes raw SQL delete.
  - `GET /api/chats/[id]/messages`: verifies owner, fetches all messages associated with the chat ID, sorted by `created_at ASC`.
- To support conversational memory and Machiavellian advice context:
  - We updated `POST /api/chat` to write the incoming user message to the database, query the entire historical thread (alternating `user` and `model` roles), retrieve the most relevant essays based on the user's current query, run Gemini, and save the assistant's reply to the database. We also updated the `updated_at` column of the chat session to bring the active chat to the top of the list.
- To display sessions on the frontend:
  - We designed a `Sidebar` component (`src/components/Sidebar.tsx`) that mounts on page load, fetches `/api/chats`, and renders them in reverse chronological order. It has interactive buttons to toggle collapse, start new chats, delete chats, and log out.
  - We updated the main page (`src/app/page.tsx`) to check authentication client-side on mount and transition into a dynamic route when the user submits their first query.
  - We created a dynamic chat page (`src/app/chat/[id]/page.tsx`) that loads conversation history on load and continues the chat session.
  - We adjusted `src/app/globals.css` and `src/app/login/page.tsx` layouts to align background styling (`#fcfbfa`) and borders consistent with LaTeX rules without breaking login centering.

## 3. Caveats
- The Gemini API key needs to be configured in `.env` for the chatbot to reply.
- We assumed the NextAuth configuration already populates user records properly (which is handled inside `src/app/api/auth/[...nextauth]/route.ts`).

## 4. Conclusion
- The chat session management, history storage, advisor response integration, and collapsible sidebar are fully implemented using raw SQL database queries and Next.js 16 conventions.

## 5. Verification Method
- Build validation command: `npm run build`
- Verify DB queries do not use ORMs by inspecting:
  - `src/app/api/chats/route.ts`
  - `src/app/api/chats/[id]/route.ts`
  - `src/app/api/chats/[id]/messages/route.ts`
  - `src/app/api/chat/route.ts`
- Confirm pages have consistent LaTeX visual design by checking layout structures.
