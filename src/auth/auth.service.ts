import { ConflictException, Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { TenantContext, type Role } from '../common/tenant-context';
import type { TokenPayload } from '../common/guards/jwt-auth.guard';
import { REPOSITORIES, type Repositories, type UserRecord } from '../persistence/repository';
import type { CreateUserDto, LoginDto, RegisterDto } from './dto';

export interface PublicUser {
  id: string;
  email: string;
  name: string;
  role: Role;
  tenantId: string;
}

export interface AuthResponse {
  accessToken: string;
  user: PublicUser;
}

const SALT_ROUNDS = 10;

function toPublicUser(user: UserRecord): PublicUser {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    tenantId: user.tenantId,
  };
}

@Injectable()
export class AuthService {
  constructor(
    @Inject(REPOSITORIES) private readonly repos: Repositories,
    private readonly jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto): Promise<AuthResponse> {
    const existing = await this.repos.auth.findUserByEmail(dto.email);
    if (existing) throw new ConflictException('Email already registered');

    const passwordHash = await bcrypt.hash(dto.password, SALT_ROUNDS);
    const { user } = await this.repos.auth.createTenantWithAdmin({
      tenantName: dto.tenantName,
      email: dto.email,
      passwordHash,
      name: dto.name,
    });

    return this.respond(user);
  }

  async login(dto: LoginDto): Promise<AuthResponse> {
    const user = await this.repos.auth.findUserByEmail(dto.email);
    const valid = user ? await bcrypt.compare(dto.password, user.passwordHash) : false;
    if (!user || !valid) throw new UnauthorizedException('Invalid credentials');

    return this.respond(user);
  }

  async createUser(dto: CreateUserDto): Promise<PublicUser> {
    const { tenantId } = TenantContext.get();

    const existing = await this.repos.auth.findUserByEmail(dto.email);
    if (existing) throw new ConflictException('Email already registered');

    const passwordHash = await bcrypt.hash(dto.password, SALT_ROUNDS);
    const user = await this.repos.auth.createUser({
      tenantId,
      email: dto.email,
      passwordHash,
      name: dto.name,
      role: dto.role ?? 'MEMBER',
    });

    return toPublicUser(user);
  }

  private respond(user: UserRecord): AuthResponse {
    const accessToken = this.jwtService.sign({
      sub: user.id,
      tenantId: user.tenantId,
      role: user.role,
      email: user.email,
      name: user.name,
    } satisfies TokenPayload);

    return { accessToken, user: toPublicUser(user) };
  }
}
