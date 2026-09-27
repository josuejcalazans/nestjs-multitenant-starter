import { ExecutionContext, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { Roles } from '../decorators/roles.decorator';
import { RolesGuard } from './roles.guard';
import type { AuthenticatedRequest } from './jwt-auth.guard';

function mockContext(handler: unknown, user?: AuthenticatedRequest['user']): ExecutionContext {
  const request = { user } as AuthenticatedRequest;
  return {
    getHandler: () => handler,
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
}

class ExampleController {
  @Roles('ADMIN')
  adminOnly(): void {}

  open(): void {}
}

describe('RolesGuard', () => {
  const guard = new RolesGuard();

  it('allows routes without @Roles', () => {
    expect(guard.canActivate(mockContext(ExampleController.prototype.open))).toBe(true);
  });

  it('allows a user with the required role', () => {
    const context = mockContext(ExampleController.prototype.adminOnly, {
      sub: 'u1',
      tenantId: 't1',
      role: 'ADMIN',
      email: 'a@b.c',
      name: 'A',
    });
    expect(guard.canActivate(context)).toBe(true);
  });

  it('rejects a user with the wrong role', () => {
    const context = mockContext(ExampleController.prototype.adminOnly, {
      sub: 'u2',
      tenantId: 't1',
      role: 'MEMBER',
      email: 'm@b.c',
      name: 'M',
    });
    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });

  it('rejects when there is no authenticated user', () => {
    expect(() => guard.canActivate(mockContext(ExampleController.prototype.adminOnly))).toThrow(
      UnauthorizedException,
    );
  });
});
