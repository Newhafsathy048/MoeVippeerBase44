import { describe, expect, it, beforeEach, afterAll } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'moe-store-'));
process.env.DATA_DIR = tempDir;
process.env.STORAGE_ENCRYPTION_KEY = 'vitest-secret-key';
const store = await import('./store.js');

describe('persistent connection store', () => {
  beforeEach(() => { fs.rmSync(tempDir, { recursive: true, force: true }); });
  afterAll(() => fs.rmSync(tempDir, { recursive: true, force: true }));

  it('round-trips encrypted values without exposing plaintext', () => {
    const encrypted = store.encrypt('private-access-token');
    expect(encrypted).not.toContain('private-access-token');
    expect(store.decrypt(encrypted)).toBe('private-access-token');
  });

  it('writes and reads durable JSON state', () => {
    const state = { connections: [{ id: 'a', name: 'Test', authSecret: store.encrypt('secret') }], settings: {}, logs: [], notifications: [] };
    store.writeStore(state);
    expect(store.readStore().connections[0].id).toBe('a');
    expect(store.redactConnection(state.connections[0])).not.toHaveProperty('authSecret');
  });
});
