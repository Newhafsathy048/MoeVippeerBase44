# Integration notes

## WhatsApp Business Cloud API

Meta's current documentation states that WhatsApp Business Platform webhooks are HTTP requests containing JSON payloads for incoming messages, outgoing-message status, calls, and account events. Incoming message webhooks require the `whatsapp_business_messaging` permission; other business-account events may require `whatsapp_business_management`. Meta can retry webhook deliveries for up to seven days when the endpoint does not return HTTP 200, and retries can create duplicate notifications, so any Cloud API adapter must verify signatures, acknowledge quickly, and use idempotency keys based on webhook message IDs.

The current repository uses Baileys multi-device sessions rather than Cloud API webhooks. This is a deliberate first transport for the existing bot code. A production Cloud API adapter remains a separate task and should use Meta's official onboarding, system-user token, phone-number ID, webhook verification token, and app review permissions.

Sources: [Meta Webhooks](https://developers.facebook.com/documentation/business-messaging/whatsapp/webhooks/overview), [Meta Cloud API Get Started](https://developers.facebook.com/documentation/business-messaging/whatsapp/get-started).

## Fly.io persistence

The app's Fly configuration mounts `bot_data` at `/app/data` and sets `DATA_DIR=/app/data`, matching the store and per-connection session paths. Secrets must be set with Fly's secret manager. The service is configured as one always-running machine because active WhatsApp socket sessions and a file-backed store require a durable process and volume. Do not scale this file-backed version horizontally until the store uses a transactional external database.

Source: [Fly app configuration](https://fly.io/docs/reference/configuration/).
