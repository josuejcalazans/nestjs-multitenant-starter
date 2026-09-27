import { PrismaClient } from '@prisma/client';
import type {
  AuthRepository,
  CreateTaskInput,
  CreateTenantWithAdminInput,
  CreateUserInput,
  Repositories,
  TaskRecord,
  TaskRepository,
  UpdateTaskInput,
  UserRecord,
} from './repository';

class PrismaAuthRepository implements AuthRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async createTenantWithAdmin(
    input: CreateTenantWithAdminInput,
  ): Promise<{ tenant: { id: string; name: string; createdAt: Date }; user: UserRecord }> {
    return this.prisma.$transaction(async (tx) => {
      const tenant = await tx.tenant.create({ data: { name: input.tenantName } });
      const user = await tx.user.create({
        data: {
          email: input.email.toLowerCase(),
          passwordHash: input.passwordHash,
          name: input.name,
          role: 'ADMIN',
          tenantId: tenant.id,
        },
      });
      return { tenant, user };
    });
  }

  async createUser(input: CreateUserInput): Promise<UserRecord> {
    return this.prisma.user.create({
      data: {
        email: input.email.toLowerCase(),
        passwordHash: input.passwordHash,
        name: input.name,
        role: input.role,
        tenantId: input.tenantId,
      },
    });
  }

  async findUserByEmail(email: string): Promise<UserRecord | null> {
    return this.prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  }
}

class PrismaTaskRepository implements TaskRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async list(tenantId: string): Promise<TaskRecord[]> {
    return this.prisma.task.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async find(tenantId: string, taskId: string): Promise<TaskRecord | null> {
    return this.prisma.task.findFirst({ where: { id: taskId, tenantId } });
  }

  async create(input: CreateTaskInput): Promise<TaskRecord> {
    return this.prisma.task.create({
      data: {
        title: input.title,
        tenantId: input.tenantId,
        createdById: input.createdById,
      },
    });
  }

  async update(
    tenantId: string,
    taskId: string,
    patch: UpdateTaskInput,
  ): Promise<TaskRecord | null> {
    const existing = await this.find(tenantId, taskId);
    if (!existing) return null;
    return this.prisma.task.update({
      where: { id: taskId },
      data: {
        ...(patch.title !== undefined ? { title: patch.title } : {}),
        ...(patch.done !== undefined ? { done: patch.done } : {}),
      },
    });
  }

  async remove(tenantId: string, taskId: string): Promise<boolean> {
    const existing = await this.find(tenantId, taskId);
    if (!existing) return false;
    await this.prisma.task.delete({ where: { id: taskId } });
    return true;
  }
}

export class PrismaRepositories implements Repositories {
  private readonly prisma = new PrismaClient();

  readonly auth: AuthRepository = new PrismaAuthRepository(this.prisma);
  readonly tasks: TaskRepository = new PrismaTaskRepository(this.prisma);
}
