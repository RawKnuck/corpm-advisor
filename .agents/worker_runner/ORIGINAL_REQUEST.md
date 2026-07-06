## 2026-07-05T22:29:03Z

You are a worker agent. Your task is to set up the E2E test infrastructure for the Sovereign Advisor Chatbot project under c:\Users\91620\Desktop\Second Brain.
Follow the Ponytail rule ("no frameworks, no fixtures"), meaning you will write lightweight, custom scripts using built-in APIs and Node.js standard libraries.

Implement the following files:
1. `tests/fixtures/db-cleaner.mjs`:
   - Connects to the database using `process.env.DATABASE_URL`.
   - Exports an async function `cleanDatabase()` that executes `TRUNCATE TABLE users, chats, messages CASCADE`.

2. `tests/fixtures/mock-gemini.mjs`:
   - Intercepts `globalThis.fetch`.
   - If the URL contains `generativelanguage.googleapis.com`, mock the response:
     - If the body contains `trigger-gemini-fail`, return a 500 error status response.
     - If the body contains `trigger-empty`, return a 200 response with an empty candidates array: `{"candidates": []}`.
     - Otherwise, return a standard successful response: `{"candidates": [{"content": {"parts": [{"text": "Mocked strategic advice: Remain prudent, preserve your resources, and evaluate the power dynamic before taking action."}]}}]}`, status 200.
   - For all other URLs, forward to the original global `fetch`.

3. `tests/helpers/test-client.mjs`:
   - Exports a class `TestClient` that takes a `baseUrl` in the constructor.
   - Maintains an in-memory cookie jar (`this.cookies = {}`).
   - Automatically parses `set-cookie` headers from responses (using `response.headers.getSetCookie()` or `response.headers.get('set-cookie')`) and updates its cookie jar.
   - Compiles and sets the `Cookie` header on outgoing requests.
   - Offers `async request(path, options = {})` wrapping the native global `fetch`.
   - Offers `async login(email, name)` to execute the NextAuth credentials flow:
     - Request GET `/api/auth/csrf` to extract the CSRF token and `next-auth.csrf-token` cookie.
     - Request POST `/api/auth/callback/credentials` with form-encoded body: `csrfToken`, `email`, `name`, `json=true`, and `callbackUrl=/`. Send the CSRF cookie in the request headers.
     - Verify status is 200, confirming session token cookie is obtained.
   - Offers `async logout()` to clear cookies and hit `/api/auth/signout`.

4. `tests/runner.mjs`:
   - Spawns the Next.js server on port 3001 using `npm run dev` (or `npx next dev`).
   - Sets environment variables for the server process:
     - `PORT=3001`
     - `NEXTAUTH_URL=http://localhost:3001`
     - `DATABASE_URL` (use the current DATABASE_URL from .env)
     - `NODE_OPTIONS=--import <absolute-path-to-mock-gemini.mjs>` (use path.resolve to get the absolute path).
   - Periodically checks health on `http://localhost:3001/api/auth/csrf` until it returns status 200 (timeout after 20 seconds).
   - Once the server is healthy, spawns `node --test tests/e2e/**/*.test.mjs` as a child process.
   - Ensures the Next.js server is killed cleanly (via SIGTERM/SIGINT) when the test runner finishes or crashes.
   - Exits with the same exit code as the test runner child process.

Ensure all code follows the strict linter rules and compiles correctly. Do not use require(), write in ESM style.
Make sure to check if you need to run `npm run build` or similar. Since we are testing in dev mode (`next dev`), compilation on spawn should be fast.
Write a report of the created files and verify that you can boot and shutdown the server cleanly by running a basic sanity check. Write your handoff to `c:\Users\91620\Desktop\Second%20Brain\.agents\worker_runner\handoff.md` and update `c:\Users\91620\Desktop\Second%20Brain\.agents\worker_runner\progress.md` with status.
