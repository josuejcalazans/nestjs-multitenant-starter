import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { TenantContext } from '../tenant-context';
import type { AuthenticatedRequest } from '../guards/jwt-auth.guard';

@Injectable()
export class TenantContextInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') return next.handle();

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const actor = request.user;
    if (!actor) return next.handle();

    return new Observable((subscriber) => {
      TenantContext.run({ userId: actor.sub, tenantId: actor.tenantId, role: actor.role }, () =>
        next.handle().subscribe(subscriber),
      );
    });
  }
}
