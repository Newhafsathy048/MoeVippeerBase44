import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const commands = require('./index');
const basic = require('./basic');
const config = require('../config');
const messageHandler = require('../handlers/messageHandler');
const { readStore, writeStore } = require('../storage/store');
const manager = require('../connections/manager');

function fakeMessage(text, remoteJid = '255700000001@s.whatsapp.net') {
  return { key: { remoteJid, participant: remoteJid }, pushName: 'Tester', message: { conversation: text } };
}

function fakeSocket() {
  const sent = [];
  return { sent, sendMessage: async (jid, payload) => { sent.push({ jid, payload }); return { key: { id: 'sent' } }; }, groupMetadata: async () => ({ participants: [] }) };
}

describe('MoE command contract', () => {
  it('registers every command shown in the requested menu', () => {
    const listed = Object.values(config.commands).flat();
    expect(listed.every((name) => typeof commands[name] === 'function')).toBe(true);
    expect(listed).toContain('menu');
    expect(listed).toContain('pair');
  });

  it('renders the requested category labels in menu output', async () => {
    const sock = fakeSocket();
    await commands.menu(sock, fakeMessage('.menu'), [], { getInfo: () => ({}) });
    const text = sock.sent.map((entry) => entry.payload.text || entry.payload.caption || '').join('\n');
    expect(text).toContain('BASIC COMMANDS');
    expect(text).toContain('DOWNLOADERS');
    expect(text).toContain('AI & TOOLS');
    expect(text).toContain('OWNER ONLY');
  });

  it('blocks owner-only commands for non-owner senders', async () => {
    const sock = fakeSocket();
    await messageHandler(sock, fakeMessage('.restart'), { restart: async () => { throw new Error('must not run'); } });
    expect(sock.sent.at(-1).payload.text).toContain('owner only');
  });

  it('blocks group-admin commands for non-admin group senders', async () => {
    const sock = fakeSocket();
    await messageHandler(sock, fakeMessage('.kick', '255700000001-123@g.us'), {});
    expect(sock.sent.at(-1).payload.text).toContain('group admins only');
  });

  it('persists settings independently on a selected connection', () => {
    const store = readStore();
    const id = 'settings-test-node';
    store.connections = store.connections.filter((item) => item.id !== id);
    store.connections.push({ id, name: 'Settings Test', phone: '255700000001', sessionRef: 'invalid', status: 'disconnected', replyMode: 'command', replyText: 'test' });
    writeStore(store);
    manager.settings(id, { autoViewStatus: true, antiDelete: true });
    const updated = readStore().connections.find((item) => item.id === id);
    expect(updated.autoViewStatus).toBe(true);
    expect(updated.antiDelete).toBe(true);
    const next = readStore();
    next.connections = next.connections.filter((item) => item.id !== id);
    writeStore(next);
  });

  it('uses the configured bot-side brand asset at runtime', async () => {
    const originalPath = config.branding.localLogoPath;
    config.branding.localLogoPath = new URL('../../../webdev-static-assets/moe/moe-brand.png', import.meta.url).pathname;
    const image = await basic.resolveBrandImage();
    expect(Buffer.isBuffer(image)).toBe(true);
    expect(image.length).toBeGreaterThan(1000);
    config.branding.localLogoPath = originalPath;
    const defaultImage = await basic.resolveBrandImage();
    expect(Buffer.isBuffer(defaultImage)).toBe(true);
    expect(config.branding.localLogoPath).toContain('public/assets/moe-logo.png');
    const source = readFileSync(new URL('./basic.js', import.meta.url), 'utf8');
    expect(config.branding.logoUrl).toContain('/manus-storage/moe-brand_91e78bc3.png');
    expect(source).not.toContain('public/assets/moe-profile.png');
  });

  it('persists owner settings through the actual command handler flow', async () => {
    const id = 'command-settings-flow';
    const store = readStore();
    store.connections = store.connections.filter((item) => item.id !== id);
    store.connections.push({ id, name: 'Flow Test', phone: '12136061765', sessionRef: 'invalid', status: 'connected', replyMode: 'command', replyText: 'test' });
    writeStore(store);
    const bot = { autoViewStatus: false, antiDelete: false, saveSettings: (patch) => manager.settings(id, patch) };
    const sock = fakeSocket();
    await messageHandler(sock, fakeMessage('.autoviewstatus on', '12136061765@s.whatsapp.net'), bot);
    await messageHandler(sock, fakeMessage('.antidelete on', '12136061765@s.whatsapp.net'), bot);
    const updated = readStore().connections.find((item) => item.id === id);
    expect(updated.autoViewStatus).toBe(true);
    expect(updated.antiDelete).toBe(true);
    const clean = readStore(); clean.connections = clean.connections.filter((item) => item.id !== id); writeStore(clean);
  });
});
