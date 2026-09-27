import { Global, Module } from '@nestjs/common';
import { REPOSITORIES, type Repositories } from './repository';

@Global()
@Module({
  providers: [
    {
      provide: REPOSITORIES,
      useFactory: async (): Promise<Repositories> => {
        const mode = process.env.PERSISTENCE ?? 'memory';
        if (mode === 'prisma') {
          const { PrismaRepositories } = await import('./prisma.repositories');
          return new PrismaRepositories();
        }
        const { MemoryRepositories } = await import('./memory.repositories');
        return new MemoryRepositories();
      },
    },
  ],
  exports: [REPOSITORIES],
})
export class PersistenceModule {}
