# nestjs-multitenant-starter

![CI](https://github.com/josuejcalazans/nestjs-multitenant-starter/actions/workflows/ci.yml/badge.svg)

A production-shaped NestJS starter that demonstrates **multi-tenancy done explicitly**:
JWT claims carry the tenant, an `AsyncLocalStorage` context makes the tenant invisible
to business code, and every repository call is scoped at the data layer.

- **NestJS 12** + TypeScript strict
- **JWT auth** with global guard, `@Public` and `@Roles` decorators
- **Tenant isolation** via `TenantContext` (AsyncLocalStorage) — services never pass
  `tenantId` around manually
- **Pluggable persistence**: in-memory (default, zero dependencies) or **Prisma/PostgreSQL**,
  selected by the `PERSISTENCE` env var without changing a line of application code
- **Validation** (class-validator), consistent **error envelope** (exception filter),
  **Swagger** at `/docs`
- **Docker + docker-compose** (Postgres + API with `migrate deploy`)
- **Jest unit + e2e suites**, ESLint (flat config) + Prettier, GitHub Actions CI

## Why it looks this way

| Decision                                                | Reason                                                                                                      |
| ------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| Tenant lives in the JWT, not in headers/params          | Clients cannot claim another tenant by manipulating input                                                   |
| `AsyncLocalStorage` context set by a global interceptor | Business code (`TasksService`) reads `TenantContext.get()` — no `tenantId` plumbing, no forgotten parameter |
| Repositories take `tenantId` explicitly                 | The data layer is the enforcement point; an isolation regression is a diff you can review in one file       |
| `PERSISTENCE=memory` by default                         | `npm test` and e2e run instantly with no Docker; CI needs no services                                       |
| `PrismaRepositories` loaded with a dynamic `import()`   | The Prisma engine is only touched when you opt in — memory mode stays dependency-free                       |

## Quickstart

```bash
npm install

# option A — zero dependencies (default)
npm run dev

# option B — PostgreSQL
cp .env.example .env         # set PERSISTENCE=prisma
docker compose up -d db
npm run db:generate
npx prisma migrate dev
npm run dev
```

Swagger: <http://localhost:3000/docs> · Health: `GET /health`

## API

| Method             | Route            | Auth    | Notes                                                 |
| ------------------ | ---------------- | ------- | ----------------------------------------------------- |
| `POST`             | `/auth/register` | public  | Creates a tenant + its first `ADMIN`, returns JWT     |
| `POST`             | `/auth/login`    | public  | Returns JWT                                           |
| `POST`             | `/auth/users`    | `ADMIN` | Creates a user **inside the caller's tenant**         |
| `GET`              | `/tasks`         | JWT     | Lists the current tenant's tasks                      |
| `POST`             | `/tasks`         | JWT     | Creates a task (tenant + creator from JWT context)    |
| `GET/PATCH/DELETE` | `/tasks/:id`     | JWT     | Cross-tenant ids return **404**, never leak existence |

```bash
# register → create a task → list
curl -s localhost:3000/auth/register -H 'content-type: application/json' \
  -d '{"tenantName":"acme","email":"admin@acme.com","password":"password-123","name":"Ada"}' # → accessToken
TOKEN=...
curl -s localhost:3000/tasks -H "authorization: Bearer $TOKEN" \
  -H 'content-type: application/json' -d '{"title":"Ship it"}'
curl -s localhost:3000/tasks -H "authorization: Bearer $TOKEN"
```

## Multi-tenant model

```
JwtAuthGuard          → verifies token, puts { sub, tenantId, role } on the request
TenantContextInterceptor → runs the whole response pipeline inside TenantContext.run()
RolesGuard            → enforces @Roles("ADMIN") style rules
TasksService          → TenantContext.get() → repos.tasks.list(tenantId)
Prisma/Memory repo    → WHERE tenantId = …  (the actual enforcement point)
```

Test-driven proof: `src/tasks/tasks.service.spec.ts` and `test/app.e2e-spec.ts`
cover cross-tenant read/update/delete returning `404` and `MEMBER` hitting `403`.

## Scripts

| Script                            | Purpose                                                 |
| --------------------------------- | ------------------------------------------------------- |
| `npm run dev`                     | Watch mode via Nest CLI (`nest start --watch`)          |
| `npm run build` / `npm start`     | Compile to `dist/` and run                              |
| `npm test` / `npm run test:e2e`   | Unit + e2e (memory persistence)                         |
| `npm run lint` / `npm run format` | ESLint + Prettier                                       |
| `npm run db:*`                    | Prisma generate / migrate dev / migrate deploy / studio |
| `docker compose up`               | Postgres + API (`PERSISTENCE=prisma`, `migrate deploy`) |

## Production notes

- Set a real `JWT_SECRET` (the default is dev-only) and `PERSISTENCE=prisma` + `DATABASE_URL`.
- Add refresh tokens / token rotation before shipping auth as-is.
- `bcrypt` cost is fixed at 10 — tune per platform benchmarks.
- CORS is wide open in `main.ts` — tighten to your frontend origin.

## License

MIT — see [LICENSE](./LICENSE).
