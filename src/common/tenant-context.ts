import { AsyncLocalStorage } from 'node:async_hooks';

export type Role = 'ADMIN' | 'MEMBER';

export interface ActorContext {
  userId: string;
  tenantId: string;
  role: Role;
}

const storage = new AsyncLocalStorage<ActorContext>();

export const TenantContext = {
  run<T>(context: ActorContext, fn: () => T): T {
    return storage.run(context, fn);
  },

  get(): ActorContext {
    const context = storage.getStore();
    if (!context) {
      throw new Error(
        'TenantContext is not established — this method must run inside an authenticated HTTP request',
      );
    }
    return context;
  },

  tryGet(): ActorContext | undefined {
    return storage.getStore();
  },
};
