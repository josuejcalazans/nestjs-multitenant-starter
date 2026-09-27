import { SetMetadata } from '@nestjs/common';
import type { Role } from '../tenant-context';
import { ROLES_METADATA } from './metadata';

export const Roles = (...roles: Role[]) => SetMetadata(ROLES_METADATA, roles);
