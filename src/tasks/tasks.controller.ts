import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { TaskRecord } from '../persistence/repository';
import { CreateTaskDto, UpdateTaskDto } from './dto';
import { TasksService } from './tasks.service';

@ApiTags('tasks')
@ApiBearerAuth()
@Controller('tasks')
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Get()
  @ApiOperation({ summary: 'List tasks of the current tenant' })
  list(): Promise<TaskRecord[]> {
    return this.tasksService.list();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Fetch a task (404 across tenants)' })
  find(@Param('id') id: string): Promise<TaskRecord> {
    return this.tasksService.find(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a task in the current tenant' })
  create(@Body() dto: CreateTaskDto): Promise<TaskRecord> {
    return this.tasksService.create(dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a task' })
  update(@Param('id') id: string, @Body() dto: UpdateTaskDto): Promise<TaskRecord> {
    return this.tasksService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiOperation({ summary: 'Delete a task' })
  async remove(@Param('id') id: string): Promise<void> {
    await this.tasksService.remove(id);
  }
}
