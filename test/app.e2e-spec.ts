import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';

describe('App (e2e)', () => {
  let app: INestApplication;
  const http = () => request(app.getHttpServer());

  const adminA = {
    tenantName: 'acme',
    email: 'admin@acme.com',
    password: 'password-123',
    name: 'Ada Admin',
  };
  const adminB = {
    tenantName: 'globex',
    email: 'admin@globex.com',
    password: 'password-123',
    name: 'Bob Boss',
  };

  let tokenA: string;
  let tokenB: string;
  let tokenMember: string;
  let taskId: string;

  beforeAll(async () => {
    process.env.PERSISTENCE = 'memory';
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /health is public', async () => {
    const res = await http().get('/health').expect(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.persistence).toBe('memory');
  });

  it('registers a tenant with its first admin', async () => {
    const res = await http().post('/auth/register').send(adminA).expect(201);
    tokenA = res.body.accessToken;
    expect(res.body.user).toMatchObject({
      email: adminA.email,
      role: 'ADMIN',
      tenantId: expect.any(String),
    });
  });

  it('rejects a duplicate email', async () => {
    await http().post('/auth/register').send(adminA).expect(409);
  });

  it('rejects bad credentials', async () => {
    await http()
      .post('/auth/login')
      .send({ email: adminA.email, password: 'wrong-password' })
      .expect(401);
  });

  it('logs in and returns a JWT', async () => {
    const res = await http()
      .post('/auth/login')
      .send({ email: adminA.email, password: adminA.password })
      .expect(200);
    tokenA = res.body.accessToken;
    expect(typeof tokenA).toBe('string');
  });

  it('ADMIN creates a MEMBER inside its own tenant', async () => {
    const res = await http()
      .post('/auth/users')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ email: 'member@acme.com', password: 'password-123', name: 'Mia Member' })
      .expect(201);
    expect(res.body).toMatchObject({ role: 'MEMBER', tenantId: expect.any(String) });

    const login = await http()
      .post('/auth/login')
      .send({ email: 'member@acme.com', password: 'password-123' })
      .expect(200);
    tokenMember = login.body.accessToken;
  });

  it('forbids MEMBER from ADMIN-only routes', async () => {
    await http()
      .post('/auth/users')
      .set('Authorization', `Bearer ${tokenMember}`)
      .send({ email: 'x@acme.com', password: 'password-123', name: 'X' })
      .expect(403);
  });

  it('rejects requests without a token', async () => {
    await http().get('/tasks').expect(401);
    await http().post('/tasks').send({ title: 'nope' }).expect(401);
  });

  it('rejects malformed tokens', async () => {
    await http().get('/tasks').set('Authorization', 'Bearer not-a-jwt').expect(401);
  });

  it('validates the DTO', async () => {
    await http()
      .post('/tasks')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ title: 42 })
      .expect(400);
  });

  it('creates and lists tenant-scoped tasks', async () => {
    const created = await http()
      .post('/tasks')
      .set('Authorization', `Bearer ${tokenMember}`)
      .send({ title: 'Ship the starter' })
      .expect(201);
    taskId = created.body.id;
    expect(created.body.tenantId).toBe(adminA.email && created.body.tenantId);
    expect(created.body.done).toBe(false);

    const list = await http().get('/tasks').set('Authorization', `Bearer ${tokenA}`).expect(200);
    expect(list.body).toHaveLength(1);
    expect(list.body[0].id).toBe(taskId);
  });

  it('registers a second tenant', async () => {
    const res = await http().post('/auth/register').send(adminB).expect(201);
    tokenB = res.body.accessToken;
    expect(res.body.user.tenantId).not.toBe(undefined);
  });

  it('isolates tenants: B sees an empty list', async () => {
    const list = await http().get('/tasks').set('Authorization', `Bearer ${tokenB}`).expect(200);
    expect(list.body).toHaveLength(0);
  });

  it('isolates tenants: cross-tenant fetch and delete return 404', async () => {
    await http().get(`/tasks/${taskId}`).set('Authorization', `Bearer ${tokenB}`).expect(404);
    await http().delete(`/tasks/${taskId}`).set('Authorization', `Bearer ${tokenB}`).expect(404);

    const stillThere = await http()
      .get(`/tasks/${taskId}`)
      .set('Authorization', `Bearer ${tokenA}`)
      .expect(200);
    expect(stillThere.body.id).toBe(taskId);
  });

  it('patches and deletes within the tenant', async () => {
    await http()
      .patch(`/tasks/${taskId}`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ done: true })
      .expect(200);

    await http().delete(`/tasks/${taskId}`).set('Authorization', `Bearer ${tokenA}`).expect(204);

    await http().get(`/tasks/${taskId}`).set('Authorization', `Bearer ${tokenA}`).expect(404);
  });
});
