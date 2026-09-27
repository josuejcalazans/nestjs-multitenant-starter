import { randomUUID } from 'node:crypto';
import type {
  AuthRepository,
  CreateTaskInput,
  CreateTenantWithAdminInput,
  CreateUserInput,
  Repositories,
  TaskRecord,
  TaskRepository,
  TenantRecord,
  UpdateTaskInput,
  UserRecord,
} from './repository';

class MemoryAuthRepository implements AuthRepository {
  private readonly tenants = new Map<string, TenantRecord>();
  private readonly users = new Map<string, UserRecord>();

  async createTenantWithAdmin(
    input: CreateTenantWithAdminInput,
  ): Promise<{ tenant: TenantRecord; user: UserRecord }> {
    const tenant: TenantRecord = {
      id: randomUUID(),
      name: input.tenantName,
      createdAt: new Date(),
    };
    const user: UserRecord = {
      id: randomUUID(),
      email: input.email.toLowerCase(),
      passwordHash: input.passwordHash,
      name: input.name,
      role: 'ADMIN',
      tenantId: tenant.id,
      createdAt: new Date(),
    };
    this.tenants.set(tenant.id, tenant);
    this.users.set(user.id, user);
    return { tenant, user };
  }

  async createUser(input: CreateUserInput): Promise<UserRecord> {
    const user: UserRecord = {
      id: randomUUID(),
      email: input.email.toLowerCase(),
      passwordHash: input.passwordHash,
      name: input.name,
      role: input.role,
      tenantId: input.tenantId,
      createdAt: new Date(),
    };
    this.users.set(user.id, user);
    return user;
  }

  async findUserByEmail(email: string): Promise<UserRecord | null> {
    const normalized = email.toLowerCase();
    for (const user of this.users.values()) {
      if (user.email === normalized) return user;
    }
    return null;
  }
}

class MemoryTaskRepository implements TaskRepository {
  private readonly tasks = new Map<string, TaskRecord>();

  async list(tenantId: string): Promise<TaskRecord[]> {
    return [...this.tasks.values()].filter((task) => task.tenantId === tenantId);
  }

  async find(tenantId: string, taskId: string): Promise<TaskRecord | null> {
    const task = this.tasks.get(taskId);
    return task && task.tenantId === tenantId ? task : null;
  }

  async create(input: CreateTaskInput): Promise<TaskRecord> {
    const now = new Date();
    const task: TaskRecord = {
      id: randomUUID(),
      title: input.title,
      done: false,
      tenantId: input.tenantId,
      createdById: input.createdById,
      createdAt: now,
      updatedAt: now,
    };
    this.tasks.set(task.id, task);
    return task;
  }

  async update(
    tenantId: string,
    taskId: string,
    patch: UpdateTaskInput,
  ): Promise<TaskRecord | null> {
    const task = await this.find(tenantId, taskId);
    if (!task) return null;
    const updated: TaskRecord = {
      ...task,
      title: patch.title ?? task.title,
      done: patch.done ?? task.done,
      updatedAt: new Date(),
    };
    this.tasks.set(taskId, updated);
    return updated;
  }

  async remove(tenantId: string, taskId: string): Promise<boolean> {
    const task = await this.find(tenantId, taskId);
    if (!task) return false;
    return this.tasks.delete(taskId);
  }
}

export class MemoryRepositories implements Repositories {
  readonly auth: AuthRepository = new MemoryAuthRepository();
  readonly tasks: TaskRepository = new MemoryTaskRepository();
}
