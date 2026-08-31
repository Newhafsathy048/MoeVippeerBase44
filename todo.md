# Project TODO

- [x] Treat the GitHub token shared in chat as compromised; do not use it in code, shell history, environment files, or deployment configuration.
- [x] Treat the compromised GitHub tokens as user-account security items, provide revoke/rotate instructions, and avoid all token use; actual revocation remains a user-side account action.
- [x] Review the initialized full-stack scaffold and identify reusable dashboard/auth components.
- [x] Verify WhatsApp Business Cloud API requirements, webhook behavior, permissions, and operational constraints; notes saved in docs/integration-notes.md.
- [x] Add persistent storage for connections, encrypted secret references, bot settings, dedicated message logs, notification preferences, and health status; document private-volume handling for Baileys session files.
- [x] Add backend endpoints for connection registration, status checks, safe disconnect, settings management, log retrieval, and connection activity.
- [x] Implement a production-safe WhatsApp webhook receiver with GET verification, HMAC signature checking, idempotent message IDs, quick acknowledgement, and persisted processing. (Outbound Cloud API replies remain a separate integration.)
- [x] Implement configurable bot response rules and safe error handling for connected accounts.
- [x] Implement connection health monitoring and persisted in-app owner notifications for drops and reply failures, with notification preference endpoints.
- [x] Build responsive mobile-and-desktop cyberpunk dashboard using the submitted brand/logo.
- [x] Add connection cards with connected, disconnected, and error states plus QR onboarding UI and scan instructions.
- [x] Add dashboard sections for overview metrics, activity logs, message logs, settings, notifications, and connection cards/details.
- [x] Add Fly.io deployment configuration and Railway alternative guidance without committing secrets.
- [x] Add and update Vitest coverage for persistent store, notification preferences, health API, webhook verification, and notification API validation (6 tests passing).
- [x] Run syntax checks, tests, install validation, and responsive visual verification.
- [x] Review todo.md, save the final checkpoint, and provide the project version with deployment instructions.
- [x] Use `https://github.com/Newhafsathy048/vipper-moe-bot.git` as the source repository instead of the initialized scaffold.
- [x] Remove scaffold files from the active project while preserving only the new repository contents and required project configuration.
- [x] Never use or store the GitHub token pasted in chat; verify no token-like value exists in the project after repository migration.
- [x] Build a real dashboard settings panel and replace prompt/alert placeholders with form controls.
- [x] Add a dedicated per-connection detail view beyond summary card metadata.
- [x] Add Vitest coverage for GET /api/notifications and PATCH /api/notification-preferences validation/error behavior.
- [x] Expand connection detail view with settings, reply mode/text, recent logs/messages, QR/pairing state, and health/error history.
- [x] Validate PATCH /api/notification-preferences payloads and return 400 for invalid values.
- [x] Extend notification preference tests with invalid payload and expected 400 response coverage.
- [x] Render actual per-connection recent log entries and recent message entries inside the connection detail panel.
- [x] Add per-connection health and error history with recent disconnect/reconnect/error timestamps and events.
- [x] Persist actual encrypted connection secret/auth references using the store encryption helpers, while keeping raw session files on private persistent storage.
- [x] Add explicit reconnect-attempt and reconnect-success history events and expose a dedicated per-connection history feed.
- [x] Persist the actual Baileys session reference through an encrypted mapping that the connection manager uses when opening auth state.
- [x] Add a dedicated per-connection history API for logs, messages, and health events instead of filtering only the global snapshot.
- [x] Add tests for encrypted session-reference mapping and per-connection history retrieval.
- [x] Add a test that verifies a created connection's encrypted sessionRef decrypts to the auth path used by connect().
- [x] Add API tests for per-connection history success and 404 cases with connectionId filtering.
- [x] Add a manager-level test that creates a connection and verifies connect() resolves the same decrypted session path used by useMultiFileAuthState.
- [x] Extend history API tests to verify both logs and messages are filtered to the requested connectionId.
- [x] Add a manager-level connect() test that mocks the auth loader and asserts the decrypted persisted session path is passed to it.

## App product workflow revision

- [x] Add a plain-language landing/onboarding screen that explains exactly what MoE Bot does and what the user must set up.
- [x] Add a guided first-run flow: add WhatsApp connection, scan QR/pair, choose reply mode, and test the bot.
- [x] Add an obvious live operation screen showing incoming messages, replies sent, failed replies, and connection health.
- [x] Add Base44/alternative-builder integration documentation explaining what can be built in the builder versus what must remain in the hosted bot backend.
- [x] Add a user-facing feature explanation and usage guide to the app.
- [x] Provide a minimal OpenAPI contract for Base44/custom app-builder integration with the MoE API.
- [x] Build a true in-app first-run onboarding checklist for add connection, QR pairing, response mode, and test-message verification.
- [x] Add explicit persisted onboarding progress states: created, paired, configured, and tested.

## Actual MoE bot scope

- [x] Make `.menu` render the exact MoE command categories and owner/contact information supplied by the user.
- [x] Verify and wire the basic, downloader, AI/tools, group-admin, fun, and owner-only command handlers to the active multi-connection manager.
- [x] Add clear unsupported-command/error responses and safe permission checks for owner-only and group-admin commands.
- [x] Ensure each authorized WhatsApp connection can run the same command set independently with isolated settings and sessions.
- [x] Use the submitted MoE portrait as the app/bot brand asset without exposing any QR or personal asset unnecessarily.
- [x] Update the app UI copy so it presents the actual bot commands and operational purpose, not only infrastructure controls.
- [x] Document how to use the bot through WhatsApp and how the companion app manages it.
- [x] Replace placeholder `.antilink` and non-persistent `.welcome` behavior with real per-group handling.
- [x] Persist per-connection bot settings and make owner controls operate on the selected connection independently.
- [x] Wire the submitted MoE portrait into the bot-side menu asset source as well as the app.
- [x] Add a visible in-app command catalog showing the requested MoE command categories and purposes.
- [x] Add focused deterministic verification for command registry, permissions, per-connection settings, and bot-side brand asset resolution.
- [x] Fix `.autoviewstatus` and `.antidelete` so their changed values are passed explicitly to per-connection settings persistence.
- [x] Make the WhatsApp `.menu` command resolve the submitted MoE portrait through the shared brand asset source instead of the removed local asset path.
- [x] Add focused tests for owner/group-admin permission enforcement, command registry/menu coverage, per-connection settings persistence, and brand asset resolution.
- [x] Make `.menu` fetch/use the shared configured MoE portrait source at runtime when no local asset path is configured.
- [x] Test `.autoviewstatus` and `.antidelete` through the actual messageHandler/owner command flow and verify per-connection persistence.
- [x] Make `.menu` resolve the synchronized local MoE brand asset by default, while the companion app uses the uploaded `/manus-storage/moe-brand_91e78bc3.png` portrait; test the actual default local path.

## WhatsApp 8-digit pairing code

- [x] Add a backend endpoint to request an official Baileys/WhatsApp pairing code for a selected connection and validated phone number.
- [x] Store pairing-code request state without persisting the temporary code as a long-term secret.
- [x] Add pairing-code UI with phone-number input, generate button, copy action, expiry/status guidance, and QR fallback.
- [x] Add validation and tests for pairing-code input, connection selection, backend errors, and successful code display.
- [x] Document the exact WhatsApp phone-number pairing steps for the user.
- [x] Test invalid pairing phone lengths and normalization against the manager validation.
- [x] Test pairing-code endpoint socket-unavailable errors and successful response payload with expiry.
- [x] Add deterministic verification that successful pairing response renders the code and enables copy state in the UI.
- [x] Add an HTTP endpoint integration test for POST /api/connections/:id/pairing-code success, invalid input, and socket-unavailable responses.
- [x] Add an executable UI-flow verification for generatePairingCode that asserts code visibility and Copy button state after a successful response.
- [x] Add an HTTP integration assertion that POST /api/connections/:id/pairing-code returns 400 when the selected WhatsApp socket is unavailable.

## Guided handoff

- [x] Prepare a simple user-facing setup checklist covering project access, backend hosting, persistent storage, secrets, and Base44 integration.
- [x] Provide copy-paste Base44 prompt and API mapping for the MoE app.
- [x] Provide a beginner-safe WhatsApp 8-digit pairing walkthrough and troubleshooting steps.
- [x] Clearly separate steps the user must perform in Fly.io/Railway/Base44 from steps already completed in the project.

## ZIP handoff

- [ ] Create a clean source ZIP containing the MoE BOT and companion app source files.
- [ ] Exclude node_modules, runtime data, sessions, logs, secrets, token-like values, and oversized unused assets.
- [ ] Add a phone-friendly GitHub upload guide for the ZIP contents.
- [ ] Verify archive contents and deliver the ZIP attachment.
