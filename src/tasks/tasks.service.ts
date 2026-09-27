import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { TenantContext } from '../common/tenant-context';
import { REPOSITORIES, type Repositories, type TaskRecord } from '../persistence/repository';
import type { CreateTaskDto, UpdateTaskDto } from './dto';

@Injectable()
export class TasksService {
  constructor(@Inject(REPOSITORIES) private readonly repos: Repositories) {}

  list(): Promise<TaskRecord[]> {
    const { tenantId } = TenantContext.get();
    return this.repos.tasks.list(tenantId);
  }

  async find(taskId: string): Promise<TaskRecord> {
    const { tenantId } = TenantContext.get();
    const task = await this.repos.tasks.find(tenantId, taskId);
    if (!task) throw new NotFoundException('Task not found');
    return task;
  }

  create(dto: CreateTaskDto): Promise<TaskRecord> {
    const { tenantId, userId } = TenantContext.get();
    return this.repos.tasks.create({ tenantId, createdById: userId, title: dto.title });
  }

  async update(taskId: string, dto: UpdateTaskDto): Promise<TaskRecord> {
    const { tenantId } = TenantContext.get();
    const task = await this.repos.tasks.update(tenantId, taskId, dto);
    if (!task) throw new NotFoundException('Task not found');
    return task;
  }

  async remove(taskId: string): Promise<void> {
    const { tenantId } = TenantContext.get();
    const removed = await this.repos.tasks.remove(tenantId, taskId);
    if (!removed) throw new NotFoundException('Task not found');
  }
}
