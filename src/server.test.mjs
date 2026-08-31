import { afterEach, describe, expect, it } from "vitest";
import { once } from "node:events";
import DashboardServer from "./server.js";
import * as store from "./storage/store.js";
import connectionManager from "./connections/manager.js";

let service;
let base;

async function start() {
  service = new DashboardServer();
  service.server.listen(0, "127.0.0.1");
  await once(service.server, "listening");
  base = `http://127.0.0.1:${service.server.address().port}`;
}

afterEach(async () => {
  if (service) await new Promise((resolve) => service.server.close(resolve));
  service = undefined;
});

describe("dashboard API", () => {
  it("returns a health response", async () => {
    await start();
    const response = await fetch(`${base}/api/health`);
    expect(response.status).toBe(200);
    expect((await response.json()).status).toBe("ok");
  });

  it("rejects webhook verification when token is not configured", async () => {
    await start();
    const response = await fetch(`${base}/webhooks/whatsapp?hub.verify_token=wrong&hub.challenge=123`);
    expect(response.status).toBe(403);
  });

  it("returns the dedicated filtered history for a connection and 404s unknown nodes", async () => {
    const connectionId = "history-test-node";
    store.writeStore({ connections: [{ id: connectionId, name: "History node", status: "disconnected" }], settings: {}, notificationPreferences: { connectionDrop: true, replyFailure: true, criticalError: true }, logs: [{ connectionId, type: "connection.reconnect_attempt", timestamp: 1 }, { connectionId: "other", type: "ignored", timestamp: 2 }], messages: [{ connectionId, text: "hello", timestamp: 3 }, { connectionId: "other", text: "ignored", timestamp: 4 }], notifications: [] });
    await start();
    const response = await fetch(`${base}/api/connections/${connectionId}/history`);
    expect(response.status).toBe(200);
    const history = await response.json();
    expect(history.logs).toHaveLength(1);
    expect(history.messages).toHaveLength(1);
    expect(history.logs.every((row) => row.connectionId === connectionId)).toBe(true);
    expect(history.messages.every((row) => row.connectionId === connectionId)).toBe(true);
    const missing = await fetch(`${base}/api/connections/missing/history`);
    expect(missing.status).toBe(404);
  });

  it("creates an encrypted session reference used for the auth path", async () => {
    store.writeStore({ connections: [], settings: {}, notificationPreferences: { connectionDrop: true, replyFailure: true, criticalError: true }, logs: [], messages: [], notifications: [] });
    const originalConnect = connectionManager.connect;
    connectionManager.connect = async () => {};
    try {
      const created = await connectionManager.create({ name: "Session node", phone: "255700000000" });
      const persisted = store.readStore().connections.find((row) => row.id === created.id);
      expect(persisted.sessionRef).not.toContain("sessions/");
      const sessionRef = store.decrypt(persisted.sessionRef);
      expect(sessionRef).toBe(`sessions/${created.id}`);
      expect(connectionManager.sessionPath(persisted)).toBe(`${store.DATA_DIR}/${sessionRef}`);
    } finally {
      connectionManager.connect = originalConnect;
    }
  });

  it("returns and updates persisted notification preferences", async () => {
    await start();
    const response = await fetch(`${base}/api/notification-preferences`);
    expect(response.status).toBe(200);
    expect((await response.json()).connectionDrop).toBeDefined();
    const updated = await fetch(`${base}/api/notification-preferences`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ connectionDrop: false, replyFailure: true, criticalError: false }) });
    expect(updated.status).toBe(200);
    expect(await updated.json()).toMatchObject({ connectionDrop: false, criticalError: false });
    const notifications = await fetch(`${base}/api/notifications`);
    expect(notifications.status).toBe(200);
    expect(Array.isArray(await notifications.json())).toBe(true);
    const invalid = await fetch(`${base}/api/notification-preferences`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ connectionDrop: "yes" }) });
    expect(invalid.status).toBe(400);
  });

  it("passes the decrypted session path into the auth loader during connect", async () => {
    const connectionId = "connect-path-node";
    const sessionRef = `sessions/${connectionId}`;
    store.writeStore({ connections: [{ id: connectionId, name: "Connect node", sessionRef: store.encrypt(sessionRef), status: "disconnected" }], settings: {}, notificationPreferences: { connectionDrop: true, replyFailure: true, criticalError: true }, logs: [], messages: [], notifications: [] });
    const originalLoad = connectionManager.loadAuthState;
    const originalFetch = connectionManager.fetchVersion;
    const originalSocket = connectionManager.createSocket;
    let receivedPath;
    connectionManager.loadAuthState = async (authPath) => { receivedPath = authPath; return { state: {}, saveCreds: () => {} }; };
    connectionManager.fetchVersion = async () => ({ version: [2, 0, 0] });
    connectionManager.createSocket = () => ({ ev: { on: () => {} } });
    try {
      await connectionManager.connect(connectionId);
      expect(receivedPath).toBe(`${store.DATA_DIR}/${sessionRef}`);
    } finally {
      connectionManager.sockets.delete(connectionId);
      connectionManager.loadAuthState = originalLoad;
      connectionManager.fetchVersion = originalFetch;
      connectionManager.createSocket = originalSocket;
    }
  });
});
