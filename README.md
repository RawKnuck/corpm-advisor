# The Sovereign Advisor

An AI-driven strategic consultant designed to provide counsel grounded in Machiavellian realism, historical power dynamics, and Robert Greene's 48 Laws of Power.

The application utilizes semantic search (Retrieval-Augmented Generation) to match user queries with a database of curated essays and laws, delivering precise context-aware strategic directives.

---

## 🛠️ Technology Stack

- **Framework**: Next.js (App Router, dynamic API routes)
- **Database**: Supabase PostgreSQL (utilizing the `pgvector` extension)
- **LLM Engine**: Google Gemini API (leveraging structured text generation and embeddings)
- **Authentication**: NextAuth.js (strictly enforced Google OAuth)
- **Aesthetic**: Custom academic LaTeX theme (with stable layouts and pulsing skeleton loaders)

---

## ⚡ Architectural Highlights

1. **Chunk-Level RAG**: A knowledge base of essays and laws segmented into semantically indexed vector chunks for highly precise context retrieval.
2. **RAG Caching**: Intelligent session state tracking that skips expensive vector searches and token injection on chat turns 2–10 of active conversations.
3. **Session-Level History Cap**: Context payload limited to a sliding window of the last 20 messages to ensure rapid response latencies and eliminate token bloat.
4. **Stable Page Transitions**: Zero-flash client-side session caching and instant scroll snapping to target the user's last query on mount.

---

## ⚙️ Setup & Installation

1. **Environment Config**: Create a `.env` file in the root directory:
   ```env
   DATABASE_URL=your_postgres_connection_string
   GEMINI_API_KEY=your_gemini_api_key
   GOOGLE_CLIENT_ID=your_google_oauth_client_id
   GOOGLE_CLIENT_SECRET=your_google_oauth_client_secret
   NEXTAUTH_SECRET=your_nextauth_jwt_secret
   NEXTAUTH_URL=http://localhost:3000
   ```

2. **Install Dependencies**:
   ```bash
   npm install
   ```

3. **Database Migration & Seeding**:
   ```bash
   node src/scripts/migrate-add-chunks-table.mjs
   node src/scripts/migrate-add-rag-cache.mjs
   node src/scripts/seed-chunks.mjs
   ```

4. **Run Development Server**:
   ```bash
   npm run dev
   ```
