# 🟣 MoE Bot — Complete WhatsApp Multi-Device Bot

> Built with Baileys & Node.js for fast WhatsApp automation.

## 🚀 ONE-COMMAND DEPLOY

### Option A: Local Setup + Deploy (Recommended)

```bash
# 1. Extract ZIP and cd into folder
cd moe-bot-complete

# 2. Run setup (installs deps, creates .env)
./setup.sh

# 3. Edit .env with your settings
nano .env

# 4. Add your assets
#    - public/assets/moe-profile.jpg
#    - public/assets/moe-qr.png
#    - public/assets/menu-audio.m4a

# 5. Deploy to Fly.io
./deploy.sh
```

### Option B: GitHub Actions (Auto-Deploy)

1. Push code to GitHub
2. Add `FLY_API_TOKEN` to GitHub Secrets
3. Every push to `main` auto-deploys!

---

## 📁 Project Structure

```
moe-bot/
├── src/                      # Backend (Node.js + Baileys)
│   ├── index.js              # Entry point
│   ├── bot.js                # WhatsApp connection
│   ├── server.js             # Dashboard API
│   ├── config.js             # Configuration
│   ├── commands/             # 30+ commands
│   ├── handlers/             # Message & group handlers
│   └── utils/                # Logger & helpers
├── public/                   # Dashboard UI
│   ├── index.html            # Dark theme dashboard
│   └── assets/               # Your images & audio
├── .github/workflows/        # GitHub Actions CI/CD
│   └── deploy.yml            # Auto-deploy to Fly.io
├── package.json
├── Dockerfile
├── fly.toml                  # Fly.io config
├── setup.sh                  # ⭐ First-time setup
├── deploy.sh                 # ⭐ One-click deploy
├── start.sh / stop.sh        # Management scripts
├── .env.example
├── .gitignore
└── README.md
```

---

## 📋 Available Commands (30+)

| Category | Commands |
|----------|----------|
| **Basic** | `.menu` `.ping` `.alive` `.owner` `.song` `.sticker` `.toimg` `.vv` `.translate` `.weather` |
| **Downloaders** | `.tiktok` `.ig` `.fb` `.play` `.ymp4` `.pin` `.ytsearch` |
| **AI & Tools** | `.ai` `.manus` |
| **Group Admin** | `.tagall` `.hidetag` `.kick` `.promote` `.demote` `.antilink` `.welcome` |
| **Fun** | `.8ball` `.quote` |
| **Owner** | `.restart` `.autoviewstatus` `.antidelete` `.pair` |

---

## 🔌 API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/health` | GET | Health check |
| `/api/status` | GET | Bot status, uptime, QR |
| `/api/pair` | POST | Request pairing code `{ phone }` |
| `/api/messages` | GET | Recent messages (inbox) |
| `/api/qr` | GET | Current QR code |
| `/api/restart` | POST | Restart bot |
| `/api/commands` | GET | Commands list |
| `/ws` | WS | Real-time WebSocket |

---

## ⚙️ Environment Variables (.env)

```env
# Required
OWNER_NUMBER=12136061765
OWNER_NAME=Moe Hafsathy
OWNER_EMAIL=nahsathy@gmail.com

# Optional — for AI commands
OPENAI_API_KEY=sk-your-openai-key

# Bot settings
BOT_NAME=MoE
PREFIX=.
AUTO_READ_STATUS=false
ANTI_DELETE=false

# Dashboard
PORT=3000
DASHBOARD_PASSWORD=your-secure-password
```

---

## 🛠️ Manual Deployment (Without Scripts)

```bash
# 1. Install Fly CLI
curl -L https://fly.io/install.sh | sh
fly auth login

# 2. Create volume (MUHIMU!)
fly volumes create bot_data --size 1 --region jnb --app moe-bot

# 3. Set secrets
fly secrets set OWNER_NUMBER=12136061765
fly secrets set OPENAI_API_KEY=sk-your-key

# 4. Deploy
fly deploy

# 5. Open
fly open
```

---

## 🐛 Troubleshooting

| Problem | Solution |
|---------|----------|
| "Pairing code failed" | Use country code, no `+` or spaces. Wait for QR first. |
| "Module not found" | Run `npm install`. Some deps need native compilation. |
| Bot disconnects | Check `fly logs`. May need more memory. |
| Dashboard blank | Ensure assets are in `public/assets/`. |
| AI commands fail | Set `OPENAI_API_KEY` in `.env`. |

---

## 📜 License

MIT — Built with ❤️ by Moe Hafsathy


## Current multi-connection architecture

The service now runs a connection manager that gives every authorized WhatsApp account its own Baileys auth directory under `DATA_DIR/sessions/<connection-id>`. The dashboard can register nodes, connect or disconnect them, configure reply behavior, retrieve QR onboarding data, and inspect persisted event, message, and notification data. The JSON store is intended for a single Fly.io machine with its mounted volume; do not run multiple replicas until the store is replaced with a transactional database.

Set `STORAGE_ENCRYPTION_KEY` to a long random value in the deployment secret store. The application encrypts secret fields before persistence and redacts them from API responses. Baileys session files still live on the mounted private volume; treat that volume and its backups as sensitive, and rotate/delete sessions when an account is unlinked.

## Fly.io deployment

Create the application using the included `fly.toml`, create the `bot_data` volume in the configured region, and set secrets through Fly's secret manager rather than committing `.env` files. At minimum configure `STORAGE_ENCRYPTION_KEY`, `DASHBOARD_PASSWORD`, and the owner settings required by your bot. Deploy with `fly deploy`, then verify `/api/health` and scan a QR code from the dashboard. The current configuration uses one always-running machine because WhatsApp connections need a durable process and persistent session storage.

## Railway alternative

If Fly.io is not used, create a Railway service from this repository, set the start command to `npm start`, expose port `3000`, and add the same secrets in Railway Variables. Attach Railway persistent storage and set `DATA_DIR` to that mounted path. Without persistent storage, every redeploy can invalidate WhatsApp sessions. Railway's ephemeral filesystem is therefore not suitable for production connections unless a persistent volume or external encrypted storage is configured.

## Security note

Never place GitHub, Meta, WhatsApp, OpenAI, Fly.io, or dashboard credentials in source files, commit messages, CI logs, or screenshots. Any token pasted into chat or a public issue must be revoked and replaced before repository or deployment automation is enabled.

## What MoE Bot actually does

MoE Bot is a WhatsApp automation control app. The owner adds one or more authorized WhatsApp accounts, scans the QR code from WhatsApp Linked Devices, selects a response mode, and defines the default reply. When a connected account receives a message, the worker records the incoming event, decides whether the message matches the selected mode, sends the configured reply when appropriate, and records the outgoing result. The dashboard exposes connection state, QR pairing, messages, event history, notifications, reply settings, and recovery activity.

### First-run workflow

1. Open the dashboard and choose **Add connection**.
2. Enter a display name and phone number, then choose **Commands only**, **Reply to every message**, or **Log only**.
3. Scan the QR code using WhatsApp → Linked devices → Link a device.
4. Wait for the node to change to **connected**.
5. Send a test message to the linked WhatsApp account. In command mode, messages beginning with `.` trigger the configured reply.
6. Use **Settings** on the node to update the response, and use the detail panel to inspect its messages, events, reconnect history, and errors.

## Using Base44 or another AI app builder

Base44 can be used as the user-facing app shell for this service: build pages for connections, settings, message activity, notifications, and account onboarding, then call the hosted MoE API through a custom OpenAPI integration or backend function. Base44 documentation describes backend functions for external API calls and custom OpenAPI integrations that proxy approved operations server-side so credentials are not exposed in the browser. Availability depends on the Base44 plan and workspace permissions.

The always-on WhatsApp session worker should remain on Fly.io, Railway, or another persistent host because QR-authenticated sessions, reconnect handling, and message listeners need a process and persistent storage. Base44 should call API endpoints such as `/api/status`, `/api/connections`, `/api/connections/:id/history`, `/api/notification-preferences`, and connection action endpoints. Do not place Baileys session files or provider secrets in Base44 frontend code.

A free-first setup is: keep this repository as the backend and dashboard, deploy the worker on Fly.io using the included persistent-volume configuration, and optionally recreate the visual frontend in Base44 using the API contract. If Base44 backend functions are unavailable on the selected plan, use the existing dashboard or another frontend that calls an authenticated API gateway. The current public repository does not require a GitHub token to read or run.

### Base44 references

- Base44 integrations overview: https://docs.base44.com/Integrations/Using-integrations
- Base44 custom OpenAPI integrations: https://docs.base44.com/documentation/integrations/using-custom-integrations

### 8-digit pairing code

After creating a node, open its **Settings** or **Show QR / pairing** panel. Enter the WhatsApp number with country code using digits only, such as `12136061765`, and choose **Generate pairing code**. The code is requested from the official WhatsApp/Baileys socket and is kept only in memory until it expires; it is not stored as a permanent secret.

On the WhatsApp phone, open **Settings → Linked devices → Link a device → Link with phone number instead**, then enter the eight-character code shown in the MoE modal before it expires. Wait for the connection to become `connected`. QR pairing remains available as a fallback. Never share a pairing code because it authorizes the WhatsApp account.
