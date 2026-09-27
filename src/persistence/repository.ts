import type { Role } from '../common/tenant-context';

export const REPOSITORIES = 'REPOSITORIES';

export interface TenantRecord {
  id: string;
  name: string;
  createdAt: Date;
}

export interface UserRecord {
  id: string;
  email: string;
  passwordHash: string;
  name: string;
  role: Role;
  tenantId: string;
  createdAt: Date;
}

export interface TaskRecord {
  id: string;
  title: string;
  done: boolean;
  tenantId: string;
  createdById: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateTenantWithAdminInput {
  tenantName: string;
  email: string;
  passwordHash: string;
  name: string;
}

export interface CreateUserInput {
  tenantId: string;
  email: string;
  passwordHash: string;
  name: string;
  role: Role;
}

export interface CreateTaskInput {
  tenantId: string;
  createdById: string;
  title: string;
}

export interface UpdateTaskInput {
  title?: string;
  done?: boolean;
}

export interface AuthRepository {
  createTenantWithAdmin(
    input: CreateTenantWithAdminInput,
  ): Promise<{ tenant: TenantRecord; user: UserRecord }>;
  createUser(input: CreateUserInput): Promise<UserRecord>;
  findUserByEmail(email: string): Promise<UserRecord | null>;
}

export interface TaskRepository {
  list(tenantId: string): Promise<TaskRecord[]>;
  find(tenantId: string, taskId: string): Promise<TaskRecord | null>;
  create(input: CreateTaskInput): Promise<TaskRecord>;
  update(tenantId: string, taskId: string, patch: UpdateTaskInput): Promise<TaskRecord | null>;
  remove(tenantId: string, taskId: string): Promise<boolean>;
}

export interface Repositories {
  auth: AuthRepository;
  tasks: TaskRepository;
}
