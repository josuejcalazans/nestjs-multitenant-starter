import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ROLES_METADATA } from '../decorators/metadata';
import type { AuthenticatedRequest } from './jwt-auth.guard';
import type { Role } from '../tenant-context';

@Injectable()
export class RolesGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const roles = Reflect.getMetadata(ROLES_METADATA, context.getHandler()) as Role[] | undefined;
    if (!roles || roles.length === 0) return true;

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    if (!request.user) {
      throw new UnauthorizedException('Authentication required');
    }
    if (!roles.includes(request.user.role)) {
      throw new ForbiddenException(`This action requires one of: ${roles.join(', ')}`);
    }
    return true;
  }
}
