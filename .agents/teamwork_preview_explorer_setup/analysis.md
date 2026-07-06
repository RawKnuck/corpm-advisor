# API & E2E Test Suite Analysis Report

This document details the analysis of the Second Brain (The Sovereign Advisor) Next.js API endpoints, formulates the NextAuth HTTP credentials authentication flow for raw HTTP clients, provides 60 comprehensive test cases divided across four testing tiers, and designs a native Node.js E2E test runner that runs without external testing frameworks.

---

## 1. API Endpoint Inventory & Behavior Analysis

The Second Brain application exposes several API endpoints for session management, chat sessions, and message retrieval/generation. Below is the inventory of all discovered API routes:

| Path | Method | Auth Required | Request Payload (JSON / URL-encoded) | Response Payload Schema | Status Codes |
|---|---|---|---|---|---|
| `/api/auth/csrf` | `GET` | No | None | `{"csrfToken": string}` | `200` |
| `/api/auth/callback/credentials` | `POST` | No | Form-encoded: `csrfToken`, `email`, `name`, `json=true` | `{"url": string}` (if `json=true`) | `200`, `302` (redirect if JSON is false), `401` |
| `/api/auth/session` | `GET` | No | None | `{"user": {"id", "email", "name", "image"}, "expires"}` or `{}` | `200` |
| `/api/auth/signout` | `POST` | No | Form-encoded: `csrfToken` | Redirect status or success response | `200`, `302` |
| `/api/chats` | `GET` | Yes | None | `{"chats": [{"id", "title", "created_at", "updated_at"}]}` | `200`, `401`, `500` |
| `/api/chats` | `POST` | Yes | Optional JSON: `{"title": string}` | `{"chat": {"id", "user_id", "title", "created_at", "updated_at"}}` | `200`, `401`, `500` |
| `/api/chats/[id]` | `DELETE` | Yes | None | `{"success": true}` | `200`, `401`, `403`, `404`, `500` |
| `/api/chats/[id]/messages` | `GET` | Yes | None | `{"messages": [{"id", "role", "content", "created_at"}]}` | `200`, `401`, `403`, `404`, `500` |
| `/api/chat` | `POST` | Yes | JSON: `{"chatId": string, "content": string}` | `{"text": string}` (Gemini response) | `200`, `400`, `401`, `403`, `404`, `500` |

---

### Detailed Endpoint Mechanics

#### A. `/api/auth/csrf` (GET)
- **Behavior**: Generates and returns a CSRF token used to prevent cross-site request forgery during state-changing NextAuth operations. Sets the `next-auth.csrf-token` cookie.
- **SQL Queries**: None.

#### B. `/api/auth/callback/credentials` (POST)
- **Behavior**: Validates user credentials. In `authorize()`, checks if the user exists in the `users` table. If not, creates the user. If they do exist, triggers the `signIn` callback which syncs/updates the user's `name` or `image` in the database. Returns cookies for session tracking.
- **SQL Queries**:
  - `SELECT * FROM users WHERE email = $1` (Check existence)
  - `INSERT INTO users (id, email, name, created_at) VALUES ($1, $2, $3, NOW()) RETURNING *` (Create new user)
  - `UPDATE users SET name = $1, image = $2 WHERE email = $3` (Sync existing user details)

#### C. `/api/chats` (GET)
- **Behavior**: Retrieves all chat sessions created by the currently logged-in user.
- **SQL Queries**:
  - `SELECT id, title, created_at, updated_at FROM chats WHERE user_id = $1 ORDER BY updated_at DESC`

#### D. `/api/chats` (POST)
- **Behavior**: Creates a new chat session. If a JSON body with a non-empty `title` is supplied, it uses it; otherwise, defaults the title to `'Strategic Consultation'`.
- **SQL Queries**:
  - `INSERT INTO chats (user_id, title, created_at, updated_at) VALUES ($1, $2, NOW(), NOW()) RETURNING *`

#### E. `/api/chats/[id]` (DELETE)
- **Behavior**: Checks existence and ownership of the chat session. If verified, deletes the session. (Database CASCADE handles the deletion of the associated messages automatically).
- **SQL Queries**:
  - `SELECT user_id FROM chats WHERE id = $1`
  - `DELETE FROM chats WHERE id = $1`

#### F. `/api/chats/[id]/messages` (GET)
- **Behavior**: Retrieves the chronological history of messages for the specified chat session.
- **SQL Queries**:
  - `SELECT user_id FROM chats WHERE id = $1` (Ownership check)
  - `SELECT id, role, content, created_at FROM messages WHERE chat_id = $1 ORDER BY created_at ASC`

#### G. `/api/chat` (POST)
- **Behavior**:
  1. Validates input schema (`chatId` and `content`).
  2. Verifies that the chat session exists and belongs to the authenticated user.
  3. Saves the user's message to the `messages` table.
  4. Reads `src/data/essays.json` and ranks essays against the user's query keywords to select the top 4 relevant ones.
  5. Formulates the prompt and system instructions combining Machiavelli/Greene personas and the selected essays.
  6. Fetches response from the Gemini API.
  7. Saves the Gemini model's response to the `messages` table.
  8. Updates the `chats` table's `updated_at` timestamp.
- **SQL Queries**:
  - `SELECT user_id FROM chats WHERE id = $1` (Ownership verification)
  - `INSERT INTO messages (chat_id, role, content, created_at) VALUES ($1, 'user', $2, NOW())`
  - `SELECT role, content FROM messages WHERE chat_id = $1 ORDER BY created_at ASC` (Get history)
  - `INSERT INTO messages (chat_id, role, content, created_at) VALUES ($1, 'assistant', $2, NOW())`
  - `UPDATE chats SET updated_at = NOW() WHERE id = $1`

---

## 2. NextAuth Raw HTTP Authentication Flow

To authenticate against NextAuth's `CredentialsProvider` without a browser, a raw HTTP client must simulate the browser client flow. The standard NextAuth REST flow relies on verifying the CSRF token and setting a session cookie.

### Step-by-Step Flow

```
   HTTP Client                                            Next.js Server
       │                                                         │
       │ 1. GET /api/auth/csrf                                   │
       ├────────────────────────────────────────────────────────>│
       │                                                         │
       │ 2. Returns JSON with csrfToken & Cookie:                │
       │    next-auth.csrf-token=<value>                         │
       │<────────────────────────────────────────────────────────┤
       │                                                         │
       │ 3. POST /api/auth/callback/credentials                  │
       │    Body: csrfToken=<token>&email=<email>&name=<name>... │
       │    Headers: Cookie: next-auth.csrf-token=<value>        │
       │             Content-Type: application/x-www-form-encoded│
       ├────────────────────────────────────────────────────────>│
       │                                                         │
       │ 4. Returns JSON confirming redirect & Cookie:           │
       │    next-auth.session-token=<token>                      │
       │<────────────────────────────────────────────────────────┤
       │                                                         │
       │ 5. GET /api/chats                                       │
       │    Headers: Cookie: next-auth.session-token=<token>     │
       ├────────────────────────────────────────────────────────>│
       │                                                         │
```

### Detailed HTTP Specification

#### Request 1: Fetch CSRF Token & Cookie
- **URL**: `http://localhost:3000/api/auth/csrf`
- **Method**: `GET`
- **Headers**:
  - `Accept: application/json`
- **Expected Status**: `200 OK`
- **Extraction Logic**:
  - Parse response JSON: extract `csrfToken` string.
  - Parse response `set-cookie` header: extract the value of `next-auth.csrf-token` cookie (format: `next-auth.csrf-token=token_hash%7Csignature; Path=/; ...`).

#### Request 2: Execute Credentials Call
- **URL**: `http://localhost:3000/api/auth/callback/credentials`
- **Method**: `POST`
- **Headers**:
  - `Content-Type: application/x-www-form-urlencoded`
  - `Cookie: next-auth.csrf-token=<extracted_cookie_value>`
- **Request Body** (URL-encoded):
  ```
  csrfToken=<extracted_token>&email=machiavelli@sovereign.advisor&name=Niccolo&json=true&callbackUrl=/
  ```
  *(Note: Sending `json=true` prevents the server from returning a `302 Redirect` and instructs NextAuth to return a `200 OK` JSON response instead).*
- **Expected Status**: `200 OK`
- **Extraction Logic**:
  - Parse response `set-cookie` header: extract `next-auth.session-token` (and other session metadata cookies if any).

#### Request 3: Authorized API Request
- **URL**: `http://localhost:3000/api/chats`
- **Method**: `GET`
- **Headers**:
  - `Cookie: next-auth.session-token=<session_token>`
- **Expected Status**: `200 OK`

---

## 3. Comprehensive 60 E2E Test Cases

Here is the design for exactly 60 test cases spanning the four requested tiers.

### Tier 1: Feature Coverage (30 Cases)

#### 1. Authentication (6 Cases)
| ID | Description | API Path | Method | Payload | Expected Status | Verification Method |
|---|---|---|---|---|---|---|
| `TC-T1-AUTH-01` | Get CSRF token successfully | `/api/auth/csrf` | `GET` | None | `200` | Check body contains `csrfToken` string and `set-cookie` contains `next-auth.csrf-token`. |
| `TC-T1-AUTH-02` | Authenticate credentials for a new user | `/api/auth/callback/credentials` | `POST` | Form: `csrfToken`, `email` (new), `name`, `json=true` | `200` | Verify `set-cookie` contains `next-auth.session-token`. Verify new user record exists in SQL database. |
| `TC-T1-AUTH-03` | Authenticate credentials for an existing user | `/api/auth/callback/credentials` | `POST` | Form: `csrfToken`, `email` (existing), `name`, `json=true` | `200` | Verify `set-cookie` contains `next-auth.session-token`. Verify name is synced in SQL database. |
| `TC-T1-AUTH-04` | Retrieve active session details | `/api/auth/session` | `GET` | None | `200` | Verify returned JSON contains `user` details matching credentials. |
| `TC-T1-AUTH-05` | Access session when unauthenticated | `/api/auth/session` | `GET` | None | `200` | Verify returned JSON is empty object `{}`. |
| `TC-T1-AUTH-06` | Sign out active session | `/api/auth/signout` | `POST` | Form: `csrfToken` | `200` | Verify session cookies are expired/unset in `set-cookie` header. |

#### 2. Chats Retrieval (6 Cases)
| ID | Description | API Path | Method | Payload | Expected Status | Verification Method |
|---|---|---|---|---|---|---|
| `TC-T1-CHTR-01` | Retrieve chats list for user with no chats | `/api/chats` | `GET` | None | `200` | Verify response body is `{"chats": []}`. |
| `TC-T1-CHTR-02` | Retrieve chats list for user with multiple chats | `/api/chats` | `GET` | None | `200` | Verify array matches database records and sorted by `updated_at DESC`. |
| `TC-T1-CHTR-03` | Block unauthenticated retrieval of chats | `/api/chats` | `GET` | None | `401` | Verify response body contains error `{"error": "Unauthorized"}`. |
| `TC-T1-CHTR-04` | Retrieve messages history for active chat | `/api/chats/[id]/messages` | `GET` | None | `200` | Verify response returns array of messages matching DB ordered by `created_at ASC`. |
| `TC-T1-CHTR-05` | Retrieve messages for a newly created chat | `/api/chats/[id]/messages` | `GET` | None | `200` | Verify response returns `{"messages": []}`. |
| `TC-T1-CHTR-06` | Block unauthenticated messages retrieval | `/api/chats/[id]/messages` | `GET` | None | `401` | Verify response is blocked with `401` status. |

#### 3. Chat Creation (6 Cases)
| ID | Description | API Path | Method | Payload | Expected Status | Verification Method |
|---|---|---|---|---|---|---|
| `TC-T1-CHTC-01` | Create chat session with default title | `/api/chats` | `POST` | None | `200` | Verify returned chat title is `'Strategic Consultation'`. Verify UUID is returned. |
| `TC-T1-CHTC-02` | Create chat session with custom title | `/api/chats` | `POST` | JSON: `{"title": "Job Interview Plan"}` | `200` | Verify returned chat title matches `"Job Interview Plan"`. |
| `TC-T1-CHTC-03` | Create chat with empty/whitespace title | `/api/chats` | `POST` | JSON: `{"title": "   "}` | `200` | Verify title falls back to default `'Strategic Consultation'` in database. |
| `TC-T1-CHTC-04` | Block unauthenticated chat creation | `/api/chats` | `POST` | JSON: `{"title": "Fail"}` | `401` | Verify status `401` and no chat record is inserted in the database. |
| `TC-T1-CHTC-05` | Create chat with long title (255 characters) | `/api/chats` | `POST` | JSON: `{"title": "A".repeat(255)}` | `200` | Verify database stores the full 255-character title without truncation errors. |
| `TC-T1-CHTC-06` | Create chat with HTML tags in title | `/api/chats` | `POST` | JSON: `{"title": "<b>Strategic</b>"}` | `200` | Verify title is stored as plain text including tags and returned exactly. |

#### 4. Chat Deletion (6 Cases)
| ID | Description | API Path | Method | Payload | Expected Status | Verification Method |
|---|---|---|---|---|---|---|
| `TC-T1-CHTD-01` | Delete active chat session successfully | `/api/chats/[id]` | `DELETE` | None | `200` | Verify response is `{"success": true}`. Check DB row is deleted. |
| `TC-T1-CHTD-02` | Block deletion of chat belonging to another user | `/api/chats/[id]` | `DELETE` | None | `403` | Verify `403 Forbidden` response. Verify DB row remains unchanged. |
| `TC-T1-CHTD-03` | Request deletion of non-existent chat UUID | `/api/chats/[id]` | `DELETE` | None | `404` | Verify `404` with error message `Chat not found`. |
| `TC-T1-CHTD-04` | Block unauthenticated chat deletion | `/api/chats/[id]` | `DELETE` | None | `401` | Verify `401 Unauthorized` and that chat exists in DB afterwards. |
| `TC-T1-CHTD-05` | Cascade deletion of messages on chat delete | `/api/chats/[id]` | `DELETE` | None | `200` | Verify chat is deleted and all messages linked to `chat_id` are deleted from DB. |
| `TC-T1-CHTD-06` | Handle invalid UUID format in delete route | `/api/chats/[invalid_uuid]` | `DELETE` | None | `500` | Verify server handles PostgreSQL UUID syntax error gracefully (returns `500` error). |

#### 5. Message History & Gemini Interaction (6 Cases)
| ID | Description | API Path | Method | Payload | Expected Status | Verification Method |
|---|---|---|---|---|---|---|
| `TC-T1-GEM-01` | Send message and receive advisor response | `/api/chat` | `POST` | JSON: `{"chatId", "content": "How do I ask for a raise?"}` | `200` | Verify response JSON contains `text` (advisory output). Check both user message and assistant reply exist in DB. |
| `TC-T1-GEM-02` | Block unauthenticated message submission | `/api/chat` | `POST` | JSON: `{"chatId", "content": "Hello"}` | `401` | Verify request returns `401`. Verify no message is saved. |
| `TC-T1-GEM-03` | Block message submission to another user's chat | `/api/chat` | `POST` | JSON: `{"chatId" (other's), "content": "Hello"}` | `403` | Verify response is `403 Forbidden`. Verify no messages are saved. |
| `TC-T1-GEM-04` | Submit message to non-existent chat UUID | `/api/chat` | `POST` | JSON: `{"chatId" (non-existent), "content": "Hello"}` | `404` | Verify response is `404` with error `Chat not found.`. |
| `TC-T1-GEM-05` | Submit message with missing `chatId` field | `/api/chat` | `POST` | JSON: `{"content": "Hello"}` | `400` | Verify response status `400` with `Invalid chatId or content.`. |
| `TC-T1-GEM-06` | Submit message with missing `content` field | `/api/chat` | `POST` | JSON: `{"chatId"}` | `400` | Verify response status `400` with `Invalid chatId or content.`. |

---

### Tier 2: Boundary & Corner Cases (12 Cases)

| ID | Description | API Path | Method | Payload | Expected Status | Verification Method |
|---|---|---|---|---|---|---|
| `TC-T2-BND-01` | Login with missing email field | `/api/auth/callback/credentials` | `POST` | Form: `csrfToken`, `name`, `json=true` | `401` | Verify session is not created and returns authentication error. |
| `TC-T2-BND-02` | Login with missing name field | `/api/auth/callback/credentials` | `POST` | Form: `csrfToken`, `email`, `json=true` | `401` | Verify session is not created. |
| `TC-T2-BND-03` | Submit chat creation with completely malformed JSON body | `/api/chats` | `POST` | String: `"{invalid_json"` | `200` | Verify server handles JSON parse error, defaults title, and returns chat successfully. |
| `TC-T2-BND-04` | Submit message send with malformed JSON body | `/api/chat` | `POST` | String: `"{invalid_json"` | `500`/`400` | Verify server returns 400 or 500 error gracefully without crashing. |
| `TC-T2-BND-05` | Retrieve messages with invalid UUID syntax for ID | `/api/chats/[invalid_uuid]/messages` | `GET` | None | `500` | Verify server returns `500 Internal Server Error` (or `400`) due to DB UUID syntax error. |
| `TC-T2-BND-06` | Send empty string message to advisor | `/api/chat` | `POST` | JSON: `{"chatId", "content": ""}` | `400` | Verify returns `400 Bad Request`. |
| `TC-T2-BND-07` | Send massive content body (50KB text) | `/api/chat` | `POST` | JSON: `{"chatId", "content": "A".repeat(50000)}` | `200` | Verify server accepts and processes request. (Gemini prompt truncation/handling is tested). |
| `TC-T2-BND-08` | Gemini API returns HTTP 500 server error | `/api/chat` | `POST` | JSON: `{"chatId", "content": "trigger-gemini-fail"}` | `500` | Verify endpoint returns `{"error": "Gemini API call failed."}`. Check user message is saved but assistant message is not. |
| `TC-T2-BND-09` | Gemini API returns empty content array or null candidate | `/api/chat` | `POST` | JSON: `{"chatId", "content": "trigger-empty"}` | `200` | Verify fallback string `"No response generated."` is saved in DB and returned. |
| `TC-T2-BND-10` | SQL Injection string in chat title payload | `/api/chats` | `POST` | JSON: `{"title": "x'; DROP TABLE chats; --"}` | `200` | Verify SQL injection is treated as a literal string. Verify database tables are not dropped. |
| `TC-T2-BND-11` | SQL Injection string in email field | `/api/auth/callback/credentials` | `POST` | Form: `csrfToken`, `email`: `"x' OR '1'='1"`, `name` | `200`/`401` | Verify SQL injection string is safely parameterized. Verify user is stored literally as `x' OR '1'='1`. |
| `TC-T2-BND-12` | Chat session message context limit boundary (50 messages) | `/api/chat` | `POST` | JSON: `{"chatId", "content": "Follow-up"}` | `200` | Verify that message history is successfully fetched and formatted into the Gemini call context. |

---

### Tier 3: Cross-Feature Combinations (10 Cases)

| ID | Description | API Path | Method | Payload | Expected Status | Verification Method |
|---|---|---|---|---|---|---|
| `TC-T3-COM-01` | Create new chat session -> Verify chat appears first in list | `/api/chats` -> `/api/chats` | `POST` -> `GET` | JSON: `{"title": "Seq Test"}` | `200` | Verify the GET response contains the created chat ID at index 0 of `chats`. |
| `TC-T3-COM-02` | Create chat -> Delete chat -> Verify chat is removed from list | `/api/chats` -> `/api/chats/[id]` -> `/api/chats` | `POST` -> `DELETE` -> `GET` | None | `200` | Verify the deleted chat ID is no longer present in the chats retrieval list. |
| `TC-T3-COM-03` | Create chat -> Send message -> Verify message history | `/api/chats` -> `/api/chat` -> `/api/chats/[id]/messages` | `POST` -> `POST` -> `GET` | JSON | `200` | Verify that the messages history endpoint returns exactly 2 messages (1 user, 1 assistant). |
| `TC-T3-COM-04` | Create chat -> Send message -> Verify chat `updated_at` moves to top | `/api/chats` -> `/api/chat` -> `/api/chats` | `POST` -> `POST` -> `GET` | JSON | `200` | Verify the chat's `updated_at` is modified. Verify it is now sorted first in the `/api/chats` list. |
| `TC-T3-COM-05` | Authenticate User A -> Create Chat -> Authenticate User B -> Access Chat A | `/api/chats/[id]/messages` | `GET` | None (User B session) | `403` | Verify User B receives a `403 Forbidden` response when accessing User A's chat messages. |
| `TC-T3-COM-06` | Authenticate User A -> Create Chat -> Authenticate User B -> Send message to Chat A | `/api/chat` | `POST` | JSON: `{"chatId": "Chat-A", "content": "Hi"}` | `403` | Verify User B receives `403 Forbidden` on posting messages. Verify message is not saved. |
| `TC-T3-COM-07` | Authenticate User A -> Create Chat -> Authenticate User B -> Delete Chat A | `/api/chats/[id]` | `DELETE` | None (User B session) | `403` | Verify User B receives `403 Forbidden` on deleting. Verify Chat A is still in DB. |
| `TC-T3-COM-08` | Send multiple messages -> Verify message chronological order | `/api/chat` -> `/api/chats/[id]/messages` | `POST` -> `GET` | JSON | `200` | Verify message list returns messages ordered precisely by `created_at ASC`. |
| `TC-T3-COM-09` | Delete chat session -> Try to send message to deleted chat ID | `/api/chats/[id]` -> `/api/chat` | `DELETE` -> `POST` | JSON: `{"chatId", "content"}` | `404` | Verify sending a message to a deleted chat ID returns `404 Not Found`. |
| `TC-T3-COM-10` | Delete chat session -> Try to retrieve messages | `/api/chats/[id]` -> `/api/chats/[id]/messages` | `DELETE` -> `GET` | None | `404` | Verify message retrieval of a deleted chat ID returns `404 Not Found`. |

---

### Tier 4: Real-World Application Scenarios (8 Cases)

#### `TC-T4-RWS-01`: Standard New User Session
- **Flow**:
  1. Retrieve CSRF token from `/api/auth/csrf`.
  2. Authenticate credentials for email `newuser@sovereign.advisor`, name `New User` via `/api/auth/callback/credentials`.
  3. Verify session details using `/api/auth/session`.
  4. Create a new chat session using `/api/chats` (default title).
  5. Send message `"How to handle an aggressive colleague?"` to `/api/chat`.
  6. Retrieve messages history from `/api/chats/[id]/messages` and confirm length = 2.
  7. Retrieve all user chats from `/api/chats`.
  8. Delete the chat session using `/api/chats/[id]`.
  9. Perform sign out via `/api/auth/signout`.
- **Expected Status**: All sub-requests return `200`.
- **Verification**: Database contains user, but chat is deleted. Cookies cleared on signout.

#### `TC-T4-RWS-02`: Multi-turn Strategic Consultation
- **Flow**:
  1. Login user -> Create chat session -> Retrieve initial empty history.
  2. Send query: `"My boss is taking credit for my code."` -> Wait for Gemini advisor response.
  3. Send follow-up: `"Should I confront him directly or go to HR?"` -> Wait for second Gemini response.
  4. Fetch message history for the chat.
- **Expected Status**: `200` for all calls.
- **Verification**: Message history returns exactly 4 messages (chronological: user, assistant, user, assistant). The system instruction utilizes essays regarding corporate politics.

#### `TC-T4-RWS-03`: Session Resumption & Reordering
- **Flow**:
  1. Login user -> Create Chat A -> Create Chat B.
  2. Retrieve `/api/chats` (Chat B is first, Chat A is second).
  3. Resume Chat A by sending message `"Continuing my thoughts on negotiation."` to Chat A.
  4. Retrieve `/api/chats` again.
- **Expected Status**: `200` for all calls.
- **Verification**: Chat A's `updated_at` must be updated. In the list, Chat A must now appear first, followed by Chat B.

#### `TC-T4-RWS-04`: Clean Slate Scenario
- **Flow**:
  1. Login user -> Get current chats list.
  2. Iterate and send `DELETE` request for every chat returned.
  3. Call GET `/api/chats` to verify list is empty.
  4. Create new chat and verify list contains exactly one item.
- **Expected Status**: `200` for all calls.
- **Verification**: DB query returns 0 chats after loop, and exactly 1 chat after creation.

#### `TC-T4-RWS-05`: Parallel Session Management
- **Flow**:
  1. Login user.
  2. Create Chat A with title `"Salary Negotiation"`.
  3. Create Chat B with title `"Board Presentation"`.
  4. Send message `"I need a 20% bump."` to Chat A.
  5. Send message `"Slide 3 is weak."` to Chat B.
  6. Fetch Chat A messages -> verify 2 messages.
  7. Fetch Chat B messages -> verify 2 messages.
- **Expected Status**: `200` for all calls.
- **Verification**: Chat A messages contains "bump", Chat B messages contains "Slide 3". No cross-pollution of messages between sessions.

#### `TC-T4-RWS-06`: Multi-user Isolation Flow
- **Flow**:
  1. Login User A -> Create Chat A -> Send message -> Logout.
  2. Login User B -> Create Chat B -> Send message.
  3. Call `/api/chats` as User B (verify only Chat B returns).
  4. Try to access Chat A messages as User B (verify `403 Forbidden`).
  5. Logout User B -> Login User A.
  6. Call `/api/chats` as User A (verify only Chat A returns).
- **Expected Status**: `403` for cross-read, `200` for others.
- **Verification**: User A and User B cannot read or list each other's chats.

#### `TC-T4-RWS-07`: Database Connection Recovery Handler
- **Flow**:
  1. Login user.
  2. Temporarily pause or kill database pool connection (or inject query failure via mock helper).
  3. Send request to `/api/chats`.
  4. Verify server returns `500` without crashing.
  5. Re-enable database pool connection.
  6. Send request to `/api/chats` again.
- **Expected Status**: `500` during failure, `200` after recovery.
- **Verification**: Tests recover and read database successfully.

#### `TC-T4-RWS-08`: Session Expiry & Re-authentication
- **Flow**:
  1. Login user -> extract session token.
  2. Send requests to `/api/chats` -> verify `200`.
  3. Manually clear session token cookie (simulating expiry).
  4. Send request to `/api/chats` -> verify `401`.
  5. Authenticate again -> send request to `/api/chats` -> verify `200`.
- **Expected Status**: `200` -> `401` -> `200`.
- **Verification**: Session token is validated dynamically on every endpoint request.

---

## 4. Custom Node.js Test Runner Architecture

We will implement a custom, lightweight test runner using Node.js's built-in `node:test` runner and `node:assert` assertion engine. This avoids any dependencies on Jest or Mocha, keeping the setup minimal and extremely fast.

### Directory Structure

```
tests/
├── fixtures/
│   ├── db-cleaner.js         # Cleans tables between tests
│   └── mock-gemini.js        # Global fetch interceptor for Gemini API
├── helpers/
│   └── test-client.js        # Cookie Jar HTTP Client wrapper
├── e2e/
│   ├── auth.test.js          # E2E tests for authentication
│   ├── chats.test.js         # E2E tests for chat listing/creation/deletion
│   └── messages.test.js      # E2E tests for message retrieval & Gemini call
└── runner.js                 # Server orchestrator & test executor
```

---

### Implementation Code

#### 1. Custom HTTP Client (`tests/helpers/test-client.js`)

This helper simulates a browser's Cookie Jar. It automatically tracks cookies like `next-auth.csrf-token` and `next-auth.session-token` and applies them to outgoing requests.

```javascript
// ponytail: Built-in HTTP client wrapper for session & cookie tracking
import assert from 'node:assert';

export class TestClient {
  constructor(baseUrl) {
    this.baseUrl = baseUrl;
    this.cookies = {};
  }

  // Parse and store Set-Cookie headers
  updateCookies(setCookieHeaders) {
    if (!setCookieHeaders) return;
    const headers = Array.isArray(setCookieHeaders) ? setCookieHeaders : [setCookieHeaders];
    for (const header of headers) {
      const parts = header.split(';')[0].split('=');
      if (parts.length >= 2) {
        const key = parts[0].trim();
        const val = parts.slice(1).join('=').trim();
        this.cookies[key] = val;
      }
    }
  }

  // Compile stored cookies into Cookie header format
  getCookieHeader() {
    return Object.entries(this.cookies)
      .map(([k, v]) => `${k}=${v}`)
      .join('; ');
  }

  // Clear cookie jar (simulates logout)
  clearCookies() {
    this.cookies = {};
  }

  // Wrap global fetch to automatically handle cookies
  async request(path, options = {}) {
    const url = `${this.baseUrl}${path}`;
    const headers = { ...options.headers };

    const cookieStr = this.getCookieHeader();
    if (cookieStr) {
      headers['Cookie'] = cookieStr;
    }

    const response = await fetch(url, { ...options, headers });

    // Extract cookies from response
    // Node.js v18/v20 has response.headers.getSetCookie()
    if (typeof response.headers.getSetCookie === 'function') {
      this.updateCookies(response.headers.getSetCookie());
    } else {
      const setCookie = response.headers.get('set-cookie');
      if (setCookie) {
        this.updateCookies(setCookie);
      }
    }

    return response;
  }

  // Perform full credentials authentication flow
  async login(email, name) {
    // 1. Get CSRF Token
    const csrfRes = await this.request('/api/auth/csrf');
    assert.strictEqual(csrfRes.status, 200, 'CSRF endpoint must return 200');
    const { csrfToken } = await csrfRes.json();

    // 2. Perform authentication request
    const params = new URLSearchParams();
    params.append('csrfToken', csrfToken);
    params.append('email', email);
    params.append('name', name);
    params.append('json', 'true');
    params.append('callbackUrl', '/');

    const callbackRes = await this.request('/api/auth/callback/credentials', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    assert.strictEqual(callbackRes.status, 200, 'Credentials callback must return 200');
    return callbackRes;
  }

  async logout() {
    const csrfRes = await this.request('/api/auth/csrf');
    const { csrfToken } = await csrfRes.json();

    const params = new URLSearchParams();
    params.append('csrfToken', csrfToken);

    const logoutRes = await this.request('/api/auth/signout', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });
    this.clearCookies();
    return logoutRes;
  }
}
```

---

#### 2. Database Cleaner (`tests/fixtures/db-cleaner.js`)

This fixture ensures that tests start with a clean slate, avoiding state pollution between runs.

```javascript
// ponytail: database utility to wipe tables for test isolation
import pg from 'pg';

const connectionString = process.env.DATABASE_URL;

export async function cleanDatabase() {
  if (!connectionString) {
    throw new Error('DATABASE_URL is not configured.');
  }
  const pool = new pg.Pool({ connectionString });
  const client = await pool.connect();
  try {
    // Truncate all tables cascading to dependencies (deletes messages, chats, and users)
    await client.query('TRUNCATE TABLE users, chats, messages CASCADE');
  } finally {
    client.release();
    await pool.end();
  }
}
```

---

#### 3. Gemini API Mock Interceptor (`tests/fixtures/mock-gemini.js`)

Because Next.js runs in a child process, standard test-runner mocks do not work. We inject this mock script using Node.js's global `--import` flag in `NODE_OPTIONS` when spinning up the Next.js process. This intercepts the server's external fetch calls.

```javascript
// ponytail: mock Gemini API responses inside the Next.js server runtime without code edits
const originalFetch = globalThis.fetch;

globalThis.fetch = async function (url, options) {
  const urlStr = typeof url === 'string' ? url : url.toString();

  // Intercept the Google Gemini API endpoint
  if (urlStr.includes('generativelanguage.googleapis.com')) {
    // Check if we want to simulate a failure
    if (options.body && options.body.includes('trigger-gemini-fail')) {
      return new Response('Mocked Gemini Error', {
        status: 500,
        statusText: 'Internal Server Error',
      });
    }

    if (options.body && options.body.includes('trigger-empty')) {
      return new Response(JSON.stringify({ candidates: [] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Default successful strategic advice mock
    return new Response(
      JSON.stringify({
        candidates: [
          {
            content: {
              parts: [
                {
                  text: 'Mocked strategic advice: Remain prudent, preserve your resources, and evaluate the power dynamic before taking action.',
                },
              ],
            },
          },
        ],
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  // Forward all other requests
  return originalFetch(url, options);
};

console.log('>>> Gemini API global fetch interceptor loaded in Next.js Server process.');
```

---

## 5. Next.js Server Lifecycle & Runner Execution

The orchestrator script manages spinning up the Next.js server on a distinct port, running the E2E test suite, and shutting it down cleanly.

### Runner Script (`tests/runner.js`)

```javascript
// ponytail: orchestrate Next.js server lifecycle and execute native Node tests
import { spawn } from 'node:child_process';
import http from 'node:http';
import path from 'node:path';
import { cleanDatabase } from './fixtures/db-cleaner.js';

const TEST_PORT = 3001;
const baseUrl = `http://localhost:${TEST_PORT}`;
let serverProcess = null;

// Helper to check if server is active
function checkServerHealth() {
  return new Promise((resolve) => {
    const req = http.get(`${baseUrl}/api/auth/csrf`, (res) => {
      if (res.statusCode === 200) {
        resolve(true);
      } else {
        resolve(false);
      }
    });
    req.on('error', () => resolve(false));
    req.end();
  });
}

// Wait for server to boot with timeout
async function waitForServer(timeoutMs = 15000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const active = await checkServerHealth();
    if (active) return true;
    await new Promise((r) => setTimeout(r, 500));
  }
  return false;
}

// Clean up server process
function cleanup() {
  if (serverProcess) {
    console.log('Shutting down local Next.js server...');
    serverProcess.kill('SIGTERM');
    serverProcess = null;
  }
}

async function run() {
  try {
    console.log('Preparing test database...');
    await cleanDatabase();

    console.log('Spawning Next.js server on port:', TEST_PORT);

    // Set environment variables for the Next.js child process
    const env = {
      ...process.env,
      PORT: TEST_PORT.toString(),
      NEXTAUTH_URL: baseUrl,
      NODE_ENV: 'test',
      // Force loading the Gemini interceptor mockup
      NODE_OPTIONS: `--import ${path.resolve('./tests/fixtures/mock-gemini.js')}`,
    };

    // Spawn server process
    serverProcess = spawn('npm', ['run', 'start'], {
      env,
      shell: true,
      stdio: 'inherit',
    });

    // Ensure server exits when runner crashes/closes
    process.on('exit', cleanup);
    process.on('SIGINT', () => { cleanup(); process.exit(1); });
    process.on('SIGTERM', () => { cleanup(); process.exit(1); });

    console.log('Waiting for Next.js server to become healthy...');
    const healthy = await waitForServer();
    if (!healthy) {
      throw new Error('Next.js server failed to respond within timeout.');
    }
    console.log('Server is healthy! Initiating E2E test suite.');

    // Execute tests using Node's built-in test runner
    const testRunner = spawn('node', ['--test', 'tests/e2e/**/*.test.js'], {
      env: { ...process.env, TEST_BASE_URL: baseUrl },
      shell: true,
      stdio: 'inherit',
    });

    testRunner.on('close', (code) => {
      cleanup();
      process.exit(code);
    });
  } catch (err) {
    console.error('Test execution failed during setup:', err);
    cleanup();
    process.exit(1);
  }
}

run();
```

### Example Test File (`tests/e2e/auth.test.js`)

Below is a demonstration of how the `node:test` framework handles test cases:

```javascript
import { test, describe, before, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { TestClient } from '../helpers/test-client.js';
import { cleanDatabase } from '../fixtures/db-cleaner.js';

const baseUrl = process.env.TEST_BASE_URL || 'http://localhost:3001';

describe('Authentication Flow E2E', () => {
  let client;

  before(async () => {
    await cleanDatabase();
  });

  beforeEach(() => {
    client = new TestClient(baseUrl);
  });

  test('TC-T1-AUTH-01: Get CSRF token successfully', async () => {
    const res = await client.request('/api/auth/csrf');
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.ok(body.csrfToken, 'CSRF Token should be defined');
    assert.ok(client.cookies['next-auth.csrf-token'], 'CSRF Cookie should be set');
  });

  test('TC-T1-AUTH-02: Authenticate credentials for a new user', async () => {
    const res = await client.login('niccolo@florence.gov', 'Niccolo');
    assert.strictEqual(res.status, 200);
    
    // Verify session token was set
    assert.ok(client.cookies['next-auth.session-token'], 'Session token cookie should be set');

    // Confirm session endpoint reflects active credentials
    const sessionRes = await client.request('/api/auth/session');
    const session = await sessionRes.json();
    assert.strictEqual(session.user.email, 'niccolo@florence.gov');
    assert.strictEqual(session.user.name, 'Niccolo');
  });
});
```

---

## 6. How to Run E2E Tests on Local Next.js Instance

To run E2E testing against the server locally, developers can execute:

1. **Build Next.js Production Assets** (ensuring all route bundles exist):
   ```powershell
   npm run build
   ```
2. **Execute Test Runner**:
   ```powershell
   node tests/runner.js
   ```
This script handles the server bootstrap, executes the 60 custom assertions, prints execution reports directly to stdout, and tears down the Next.js process upon completion.
