## 2026-07-05T22:25:42Z
You are a Worker agent. Your task is to implement Milestone 2: Chat API & Sidebar Frontend.

Detailed Instructions:
1. Implement the chats API endpoints using raw SQL database operations (no ORMs, no @prisma/client, use pg query client):
   - `GET /api/chats`: Retrieve all chat sessions for the logged-in user (from token session user ID) ordered by `updated_at` descending.
   - `POST /api/chats`: Create a new chat session for the logged-in user. Accept `{ title: string }` or generate a default title. Save to `chats` table.
   - `DELETE /api/chats/[id]`: Delete the chat session (verify user owns it) and all associated messages.
2. Implement the active chat history retrieval:
   - Create route `GET /api/chats/[id]/messages` or similar, or load history directly in the API.
3. Update the advisory chatbot route `POST /api/chat`:
   - It should accept `{ chatId: string, content: string }` or similar.
   - Verify the chat session exists and belongs to the user.
   - Save the user's message (`role: 'user'`) to the `messages` table via raw SQL.
   - Retrieve all historical messages for this chat session from the `messages` table via raw SQL, ordered by `created_at` ascending.
   - Extract keywords from the user's latest query, retrieve relevant essays from `essays.json`, and formulate the Gemini system instruction (reusing the essay search/prompt logic).
   - Call Google's Gemini API with the full conversation history (mapped to `user` and `model` parts).
   - Save the Gemini advisor's response (`role: 'assistant'`) to the `messages` table via raw SQL.
   - Return the advisor's response to the client.
4. Implement the Collapsible Sidebar on the frontend:
   - Place a collapsible sidebar on the left side of `/` page and `/chat/[id]` page (LaTeX styling, cream background, thin borders).
   - Fetch the list of past chats from `/api/chats` and display them in reverse chronological order.
   - Clicking a past chat should navigate the page to `/chat/[id]` where it loads that chat's message history and lets the user continue chatting.
   - Provide a "New Chat" button to create a new session and navigate to it.
   - Provide a "Delete" button next to each chat item in the sidebar, which calls `DELETE /api/chats/[id]` and refreshes the list.
5. Apply LaTeX consistency:
   - Ensure the sidebar, login page, and chat panels preserve the `Latin Modern Roman` typography, cream paper background (`#fcfbfa`), justified text alignment, and thin solid borders. No gradients or bento grids.
6. Verify the project build compiles with strict linter and typescript compilation (`npm run build`).

Please write your implementation report in `c:\Users\91620\Desktop\Second Brain\.agents\worker_chat_sidebar\changes.md` and handoff report in `c:\Users\91620\Desktop\Second Brain\.agents\worker_chat_sidebar\handoff.md`, and notify me when complete.
