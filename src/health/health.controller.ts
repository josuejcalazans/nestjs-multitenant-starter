import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Public } from '../common/decorators/public.decorator';

@ApiTags('health')
@Controller()
export class HealthController {
  @Public()
  @Get('health')
  health(): { status: string; persistence: string; timestamp: string } {
    return {
      status: 'ok',
      persistence: process.env.PERSISTENCE ?? 'memory',
      timestamp: new Date().toISOString(),
    };
  }
}
