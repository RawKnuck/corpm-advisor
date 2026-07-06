## 2026-07-05T16:57:07Z
<USER_REQUEST>
Inspect the codebase in c:\Users\91620\Desktop\Second Brain. Analyze the current API endpoints (auth, chat, and any others) and design a comprehensive plan for E2E testing.
Specifically:
1. Identify all existing API endpoints, their paths, methods, request/response formats, and current behavior.
2. Formulate the exact HTTP flow to authenticate a user using NextAuth credentials provider via a raw HTTP client (e.g. fetching csrf token from /api/auth/csrf, POSTing to /api/auth/callback/credentials, extracting cookies/next-auth.session-token).
3. Design exactly 60 test cases across 4 tiers covering:
   - Tier 1: Feature Coverage (auth, chats retrieval, chat creation, chat deletion, message history/Gemini interaction; >=5 cases each).
   - Tier 2: Boundary & Corner Cases (>=5 cases each).
   - Tier 3: Cross-Feature Combinations (pairwise interactions; >=5 cases).
   - Tier 4: Real-World Application Scenarios (complete flows; >=5 cases).
   For each test case, specify the ID, description, API path, method, payload, expected status code, and verification method.
4. Detail the custom Node.js test runner structure using only built-in APIs (no frameworks like Jest/Mocha).
5. Explain how the tests will run against a local Next.js server instance.
Write your detailed analysis report to `c:\Users\91620\Desktop\Second Brain\.agents\teamwork_preview_explorer_setup\analysis.md` and your handoff report to `c:\Users\91620\Desktop\Second Brain\.agents\teamwork_preview_explorer_setup\handoff.md`. Once complete, notify me of the results.
</USER_REQUEST>
