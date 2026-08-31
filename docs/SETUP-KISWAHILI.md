# MoE BOT — Mwongozo wa Kuweka App kwa Base44

## Kwanza: kazi ya kila sehemu

MoE BOT ina sehemu mbili. Backend ndiyo inayobeba WhatsApp connections, 8-digit pairing code, commands, sessions za multilogin, replies, logs na notifications. Base44 ni app ya mbele unayoiona kwenye simu au computer; inaonyesha buttons, status, settings na history. Base44 haitakiwi kubeba Baileys sessions moja kwa moja.

## Kile kilichokwishaandaliwa

Project ina `.menu` yenye categories ulizotoa, command handlers, owner/group permissions, multilogin sessions, QR fallback, 8-digit pairing endpoint, settings kwa kila connection, logs, notifications, command catalog, logo ya MoE, OpenAPI contract na deployment notes. Hakuna GitHub token inayohitajika kwa repository hii ya public.

## Hatua ya 1 — Fungua project

Fungua project version uliyopewa na u-review code. Usibadilishe mafaili ya `src/` kama hujui JavaScript; kwa matumizi ya kawaida utatumia dashboard na Base44. Kwenye dashboard, kitufe cha **Add connection** huunda WhatsApp node mpya.

## Hatua ya 2 — Host backend

Chaguo linalopendekezwa ni Fly.io kwa sababu WhatsApp session inahitaji process inayoendelea na storage ya kudumu. Tengeneza Fly app kutoka kwenye repository hii, kisha tengeneza persistent volume iliyomountiwa kwenye `/app/data`. Weka secrets hizi kwenye Fly Secrets, siyo kwenye GitHub:

| Secret | Maana |
|---|---|
| `DASHBOARD_PASSWORD` | Password ya kulinda dashboard/API |
| `STORAGE_ENCRYPTION_KEY` | Key ndefu ya encryption ya stored references |
| `OWNER_NUMBER` | Namba ya owner bila `+`, mfano `12136061765` |
| `OWNER_NAME` | `Moe Hafsathy` |
| `MOE_LOGO_URL` | Optional; local MoE asset ipo tayari |
| `META_VERIFY_TOKEN` | Optional, kwa Meta Cloud API webhook |
| `META_APP_SECRET` | Optional, kwa Meta Cloud API signature verification |

Baada ya deploy, hakikisha URL ya backend inafungua `/api/health`. Mfano wa URL: `https://moe-bot.fly.dev`. Railway inaweza kutumika badala yake, lakini lazima uongeze persistent storage na uweke Start Command `npm start`.

## Hatua ya 3 — Tengeneza Base44 app

Kwenye Base44 chagua **Create New App** na tumia prompt hii:

```text
Create a responsive mobile and desktop app called MoE Bot Command Center.
Use a black cyberpunk design with neon violet, pink and electric cyan accents.
Use the MoE portrait as the logo.
Create screens for Overview, WhatsApp Connections, Add Connection, 8-digit Pairing Code, Bot Commands, Bot Rules, Message Logs, Event Logs, Notifications and Settings.
Connect the app to an external MoE backend through a Custom OpenAPI integration.
The app must list connections, create a connection, request an 8-digit WhatsApp pairing code, show connected/disconnected/error status, edit reply settings, show logs and notifications, disconnect a node, and confirm a test message.
Never expose backend secrets in browser code.
``` 

## Hatua ya 4 — Unganisha Base44 na backend

Ndani ya Base44 fungua **Integrations → Custom OpenAPI Integration**. Tumia faili `docs/moe-api.openapi.yaml` kutoka project hii. Weka Base URL kuwa URL halisi ya Fly.io/Railway backend yako. Endpoints muhimu ni `/api/status`, `/api/connections`, `/api/connections/{id}/pairing-code`, `/api/connections/{id}/settings`, `/api/connections/{id}/history`, `/api/notifications` na `/api/notification-preferences`.

Kama Base44 inaomba authentication, tumia API gateway/password iliyolindwa na backend; usiweke `STORAGE_ENCRYPTION_KEY`, Meta secret, au Baileys session data ndani ya Base44 frontend.

## Hatua ya 5 — Pair WhatsApp kwa code 8

Kwenye Base44 au dashboard, bonyeza **Add connection**, weka jina na namba ya WhatsApp yenye country code bila `+` na spaces, kwa mfano `12136061765`, kisha bonyeza **Create node**. Kwenye modal bonyeza **Generate pairing code**. Code ya muda itaonekana pamoja na **Copy code**.

Kwenye WhatsApp ya simu yenye hiyo namba fungua **WhatsApp → Settings → Linked devices → Link a device → Link with phone number instead**. Ingiza code ya tarakimu/herufi 8 kabla haija-expire. Rudi kwenye app usubiri status iwe `connected`. Kisha tuma `.menu` kwenye WhatsApp hiyo.

## Hatua ya 6 — Kujaribu bot

Tuma `.ping` na `.alive` kuthibitisha connection. Tuma `.menu` kuona list ya commands. Kwa group, hakikisha bot ni admin kabla ya kutumia `.tagall`, `.kick`, `.promote`, `.demote`, `.antilink` au `.welcome`. Commands `.restart`, `.antidelete`, `.autoviewstatus` na `.pair` zinapaswa kutumiwa na owner pekee.

## Ikiwa code haionekani

Hakikisha namba imeandikwa na country code, bila `+`, spaces au dash. Hakikisha node imeundwa kwanza na socket iko tayari. Jaribu tena baada ya sekunde chache; kama bado haipatikani tumia QR fallback. Usitume pairing code kwa mtu mwingine kwa sababu inaruhusu ku-link WhatsApp account.

## Kumbukumbu ya usalama

Token mbili za GitHub zilizowahi kutumwa kwenye chat hazikutumiwa wala kuhifadhiwa, lakini zinapaswa ku-revoke kwenye GitHub account kwa sababu zilionekana hadharani. Kwa repository public hii, Base44 na Fly deployment hazihitaji GitHub token yako.

## Hatua ya 7 — Ku-upload mafaili GitHub kwa simu

1. Pakua ZIP ya `MoE-BOT-Base44-Source.zip` kwenye simu na ifungue/extract kwa Files app.
2. Fungua GitHub kwenye browser, ingia kwenye account yako, kisha fungua repository `Newhafsathy048/vipper-moe-bot`.
3. Bonyeza **Add file → Upload files**. Chagua mafaili na folders zilizomo ndani ya ZIP iliyofunguliwa; usi-upload folder ya ZIP yenyewe ikiwa GitHub haitambui contents zake.
4. Kama repository ina mafaili ya zamani, tumia **Add file → Upload files** kupakia source mpya kwenye root, kisha chagua **Commit changes**. Usifute `data`, session files au secrets kama zipo kwenye server; ZIP hii tayari haizibebi.
5. Andika ujumbe wa commit kama `Rebuild MoE BOT with multilogin and pairing code`, kisha bonyeza **Commit changes**.
6. Baada ya upload, fungua `package.json` na `src/index.js` kuthibitisha mafaili yapo kwenye root. Usipakie `node_modules`, `.env`, GitHub tokens, Baileys sessions au logs.

Kama GitHub mobile app haionyeshi upload option vizuri, tumia Chrome/Safari na uwashe **Desktop site**. ZIP hii imeandaliwa ikiwa na source ya kupakiwa, siyo runtime data; baada ya upload utahitaji ku-connect repo hiyo kwenye Fly.io/Railway na kuweka environment variables kwenye hosting secret manager.
