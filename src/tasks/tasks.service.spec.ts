import { NotFoundException } from '@nestjs/common';
import { TenantContext } from '../common/tenant-context';
import { MemoryRepositories } from '../persistence/memory.repositories';
import { TasksService } from './tasks.service';

const admin = { userId: 'u-admin', tenantId: 'tenant-a', role: 'ADMIN' as const };
const other = { userId: 'u-other', tenantId: 'tenant-b', role: 'ADMIN' as const };

describe('TasksService', () => {
  let service: TasksService;

  beforeEach(() => {
    service = new TasksService(new MemoryRepositories());
  });

  it('creates and lists tasks scoped to the current tenant', async () => {
    const task = await TenantContext.run(admin, () => service.create({ title: 'A task' }));
    expect(task.tenantId).toBe('tenant-a');

    const listA = await TenantContext.run(admin, () => service.list());
    expect(listA).toHaveLength(1);

    const listB = await TenantContext.run(other, () => service.list());
    expect(listB).toHaveLength(0);
  });

  it('hides tasks from other tenants (404)', async () => {
    const task = await TenantContext.run(admin, () => service.create({ title: 'secret' }));

    await expect(TenantContext.run(other, () => service.find(task.id))).rejects.toThrow(
      NotFoundException,
    );
    await expect(TenantContext.run(other, () => service.remove(task.id))).rejects.toThrow(
      NotFoundException,
    );
  });

  it('updates only within the tenant', async () => {
    const task = await TenantContext.run(admin, () => service.create({ title: 'v1' }));

    await expect(
      TenantContext.run(other, () => service.update(task.id, { title: 'hacked' })),
    ).rejects.toThrow(NotFoundException);

    const updated = await TenantContext.run(admin, () =>
      service.update(task.id, { title: 'v2', done: true }),
    );
    expect(updated.title).toBe('v2');
    expect(updated.done).toBe(true);
  });

  it('throws when called outside a request context', () => {
    expect(() => service.list()).toThrow(/not established/);
  });
});
