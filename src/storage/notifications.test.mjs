import { beforeEach, describe, expect, it } from "vitest";
import * as store from "./store.js";

describe('notification preferences', () => {
  beforeEach(() => {
    store.writeStore({ connections: [], settings: {}, notificationPreferences: { connectionDrop: false, replyFailure: true, criticalError: true }, logs: [], messages: [], notifications: [] });
  });

  it('persists the preference object and keeps disabled categories disabled at the store boundary', () => {
    const current = store.readStore();
    expect(current.notificationPreferences.connectionDrop).toBe(false);
    expect(current.notificationPreferences.replyFailure).toBe(true);
    store.addNotification({ type: 'reply.failed', level: 'critical', message: 'reply failed' });
    expect(store.readStore().notifications).toHaveLength(1);
  });
});
