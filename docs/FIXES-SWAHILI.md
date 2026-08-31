# Marekebisho ya MoE Bot

## Tatizo lililopatikana

Railway ilikuwa ikirudisha `Connection Failure` wakati pairing code ikiombwa. Socket ya Baileys ilikuwa inaombwa code kabla WebSocket handshake haijawa tayari. Pia command handler ilihitaji config ya bot wakati wa kusoma command; hali hiyo ilisababisha command itoe error badala ya kujibu.

## Marekebisho yaliyofanywa

- Pairing code sasa inasubiri transport ya WhatsApp iwe tayari kabla ya kuomba code.
- Pairing code ina retry hadi mara tatu kwa errors za muda kama `Connection Failure`, timeout, au socket kutokuwa connected.
- Command handler na command menu zinaendelea kutumia config sahihi.
- Logo ya ndani sasa ina fallback ili `.menu` isishindwe kama custom logo path haipo.
- Session na store bado zinahitaji Railway Volume kupitia `DATA_DIR`; bila volume, pairing inaweza kupotea baada ya restart/redeploy.

## Deployment Railway

1. Replace repository contents kwa yaliyomo kwenye ZIP hii, au upload commit mpya kwenye repository inayotumiwa na Railway.
2. Railway Variables ziwe na angalau `DATA_DIR=/data`, `PORT` ya Railway, `OWNER_NUMBER` yenye country code bila `+`, `DASHBOARD_PASSWORD`, na `STORAGE_ENCRYPTION_KEY` kama storage encryption imewashwa.
3. Ambatisha persistent volume kwenye `/data`. Usitumie filesystem ya muda kwa WhatsApp session.
4. Redeploy service, kisha fungua `/api/health`; response inayotarajiwa ni `{"status":"ok","service":"moe-bot"}`.
5. Futa/disconnect node ya zamani yenye error, tengeneza connection mpya, au tumia reset session ikiwa UI yako ina option hiyo.
6. Weka namba kwa digits pekee, mfano `12136061765`. Kwenye WhatsApp tumia **Settings → Linked devices → Link a device → Link with phone number instead**, kisha ingiza code kabla haija-expire.
7. Baada ya status kuwa connected, tuma `.menu`, `.ping`, na `.alive`. Commands za owner zinahitaji kutumwa kutoka namba iliyo kwenye `OWNER_NUMBER`.

## Verification

`npm run check` imepita na tests zote zimepita: **22/22**.

Usishare pairing code, `DASHBOARD_PASSWORD`, au secrets za Railway.
