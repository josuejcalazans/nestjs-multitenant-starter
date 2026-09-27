import { TenantContext } from './tenant-context';

describe('TenantContext', () => {
  it('returns the context inside run()', () => {
    const ctx = { userId: 'u1', tenantId: 't1', role: 'ADMIN' as const };
    TenantContext.run(ctx, () => {
      expect(TenantContext.get()).toEqual(ctx);
      expect(TenantContext.tryGet()).toEqual(ctx);
    });
  });

  it('propagates across await boundaries', async () => {
    const ctx = { userId: 'u2', tenantId: 't2', role: 'MEMBER' as const };
    await TenantContext.run(ctx, async () => {
      await new Promise((resolve) => setTimeout(resolve, 5));
      expect(TenantContext.get().tenantId).toBe('t2');
    });
  });

  it('throws outside run()', () => {
    expect(() => TenantContext.get()).toThrow(/not established/);
    expect(TenantContext.tryGet()).toBeUndefined();
  });

  it('restores the previous context after nested run()', () => {
    const outer = { userId: 'a', tenantId: 'outer', role: 'ADMIN' as const };
    const inner = { userId: 'b', tenantId: 'inner', role: 'MEMBER' as const };
    TenantContext.run(outer, () => {
      TenantContext.run(inner, () => {
        expect(TenantContext.get().tenantId).toBe('inner');
      });
      expect(TenantContext.get().tenantId).toBe('outer');
    });
  });
});
