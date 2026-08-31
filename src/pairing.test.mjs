import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { createServer } from 'node:http';
import { describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const manager = require('./connections/manager');
const { readStore, writeStore } = require('./storage/store');
const DashboardServer = require('./server');

describe('WhatsApp pairing code flow', () => {
  it('requests an official code on the selected connection without persisting the code', async () => {
    const id = 'pairing-test-node';
    const store = readStore();
    store.connections = store.connections.filter((item) => item.id !== id);
    store.connections.push({ id, name: 'Pair Test', phone: '', sessionRef: 'invalid', status: 'disconnected', onboarding: { created: true, paired: false, configured: false, tested: false } });
    writeStore(store);
    manager.sockets.set(id, { requestPairingCode: async (phone) => { expect(phone).toBe('12136061765'); return 'AB12CD34'; } });
    const result = await manager.requestPairingCode(id, '+1 213 606 1765');
    expect(result.code).toBe('AB12CD34');
    expect(result.expiresAt).toBeGreaterThan(Date.now());
    expect(manager.pairingCodeStatus(id)).toMatchObject({ expiresAt: result.expiresAt });
    expect(readStore().connections.find((item) => item.id === id).pairingCode).toBeUndefined();
    manager.sockets.delete(id);
    const clean = readStore(); clean.connections = clean.connections.filter((item) => item.id !== id); writeStore(clean);
  });

  it('rejects invalid pairing numbers before calling WhatsApp', async () => {
    const id = 'pairing-invalid-node'; const store = readStore(); store.connections = store.connections.filter((item) => item.id !== id); store.connections.push({ id, name: 'Invalid Pair', phone: '', sessionRef: 'invalid', status: 'disconnected' }); writeStore(store);
    manager.sockets.set(id, { requestPairingCode: async () => { throw new Error('must not call WhatsApp'); } });
    await expect(manager.requestPairingCode(id, '123')).rejects.toThrow('valid WhatsApp number');
    await expect(manager.requestPairingCode(id, '1234567890123456')).rejects.toThrow('valid WhatsApp number');
    manager.sockets.delete(id); const clean = readStore(); clean.connections = clean.connections.filter((item) => item.id !== id); writeStore(clean);
  });

  it('reports socket-unavailable errors and returns a successful API-shaped result', async () => {
    const id = 'pairing-api-node'; const store = readStore(); store.connections = store.connections.filter((item) => item.id !== id); store.connections.push({ id, name: 'API Pair', phone: '', sessionRef: 'invalid', status: 'disconnected' }); writeStore(store);
    manager.sockets.set(id, {});
    await expect(manager.requestPairingCode(id, '12136061765')).rejects.toThrow('socket is ready');
    manager.sockets.set(id, { requestPairingCode: async () => 'ZX90YU12' });
    const result = await manager.requestPairingCode(id, '12136061765');
    expect(result).toMatchObject({ connectionId: id, code: 'ZX90YU12' }); expect(result.expiresAt).toBeGreaterThan(Date.now());
    manager.sockets.delete(id); const clean = readStore(); clean.connections = clean.connections.filter((item) => item.id !== id); writeStore(clean);
  });

  it('exposes generate and copy controls in the dashboard modal', () => {
    const html = readFileSync(new URL('../public/index.html', import.meta.url), 'utf8');
    expect(html).toContain('Generate pairing code');
    expect(html).toContain('Copy code');
    expect(html).toContain('/pairing-code');
    expect(html).toContain("$('#pairCode').textContent=d.code");
    expect(html).toContain("$('#copyPair').onclick=()=>navigator.clipboard?.writeText(d.code)");
    expect(html).toContain('Link with phone number instead');
  });

  it('serves pairing success and errors through the HTTP endpoint', async () => {
    const id = 'pairing-http-node'; const store = readStore(); store.connections = store.connections.filter((item) => item.id !== id); store.connections.push({ id, name: 'HTTP Pair', phone: '', sessionRef: 'invalid', status: 'disconnected' }); writeStore(store);
    const original = manager.requestPairingCode;
    manager.requestPairingCode = async (connectionId, phone) => { if (phone === 'bad') throw new Error('valid WhatsApp number'); return { connectionId, code: 'HTTP1234', expiresAt: Date.now() + 600000 }; };
    const dashboard = new DashboardServer(); await new Promise((resolve) => dashboard.server.listen(0, resolve)); const address = dashboard.server.address(); const base = `http://127.0.0.1:${address.port}`;
    const success = await fetch(`${base}/api/connections/${id}/pairing-code`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ phone: '12136061765' }) }); const successBody = await success.json();
    expect(success.status).toBe(200); expect(successBody).toMatchObject({ connectionId: id, code: 'HTTP1234' }); expect(successBody.expiresAt).toBeGreaterThan(Date.now());
    const failure = await fetch(`${base}/api/connections/${id}/pairing-code`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ phone: 'bad' }) }); expect(failure.status).toBe(400); expect((await failure.json()).error).toContain('valid WhatsApp number');
    manager.requestPairingCode = async () => { throw new Error('Pairing code is unavailable until the WhatsApp socket is ready'); };
    const unavailable = await fetch(`${base}/api/connections/${id}/pairing-code`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ phone: '12136061765' }) }); expect(unavailable.status).toBe(400); expect((await unavailable.json()).error).toContain('socket is ready');
    await new Promise((resolve) => dashboard.server.close(resolve)); manager.requestPairingCode = original; const clean = readStore(); clean.connections = clean.connections.filter((item) => item.id !== id); writeStore(clean);
  });

  it('runs the pairing UI flow and makes the code visible/copyable', async () => {
    const html = readFileSync(new URL('../public/index.html', import.meta.url), 'utf8'); const script = html.match(new RegExp('<script>([\\s\\S]*)<\\/script>'))[1];
    const elements = new Map(); const make = (value = '') => ({ value, textContent: '', innerHTML: '', style: {}, disabled: false, onclick: null, classList: { add() {}, remove() {} }, reset() {}, scrollIntoView() {} });
    const selectors = ['#pairPhone','#pairBtn','#pairCode','#copyPair','#pairHint','#onboardingSteps','#confirmTest','#activeCount','#totalCount','#eventCount','#uptime','#connections','#logs','#messages','#notifications','#prefDrop','#prefReply','#prefCritical','#modal','#qrBox','#qrImage','#form','#addBtn','#cancelBtn','#refreshBtn','#logsBtn','#rulesBtn','#savePrefs','#connectionDetails']; selectors.forEach((selector) => elements.set(selector, make()));
    const document = { querySelector: (selector) => elements.get(selector) || make(), addEventListener() {} };
    const context = { document, console, setInterval() {}, WebSocket: class {}, location: { protocol: 'http:', host: 'localhost' }, fetch: async (url) => url === '/api/status' ? { json: async () => ({ connections: [], logs: [], messages: [], notifications: [] }) } : { ok: true, json: async () => ({ code: 'UI123456', expiresAt: Date.now() + 600000 }) } };
    vm.createContext(context); vm.runInContext(script, context); await context.showQr('ui-node'); elements.get('#pairPhone').value = '12136061765'; await context.generatePairingCode();
    expect(elements.get('#pairCode').textContent).toBe('UI123456'); expect(elements.get('#pairCode').style.display).toBe('block'); expect(elements.get('#copyPair').style.display).toBe('inline-block');
  });
});
