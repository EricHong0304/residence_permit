const request = require('supertest');
const createApp = require('../app');
const { createDatabase, DEFAULT_ADMIN_PASSWORD, DEFAULT_ADMIN_USERNAME } = require('../db');

const TEST_JWT_SECRET = 'test-secret-key';

function buildApp() {
  const db = createDatabase({ memory: true });
  const config = {
    jwtSecret: TEST_JWT_SECRET,
    jwtExpiresIn: '2h',
    corsOrigins: []
  };
  const app = createApp({ db, config });
  return { app, db };
}

async function authenticateAndChangePassword(app, password = DEFAULT_ADMIN_PASSWORD) {
  const loginResponse = await request(app)
    .post('/api/auth/login')
    .send({ username: DEFAULT_ADMIN_USERNAME, password })
    .expect(200);

  expect(loginResponse.body.requiresPasswordChange).toBe(true);
  const initialToken = loginResponse.body.token;
  const newPassword = 'NewPassword123!';

  const changeResponse = await request(app)
    .post('/api/auth/change-password')
    .set('Authorization', `Bearer ${initialToken}`)
    .send({ currentPassword: password, newPassword })
    .expect(200);

  expect(changeResponse.body.requiresPasswordChange).toBe(false);
  return {
    token: changeResponse.body.token,
    password: newPassword
  };
}

describe('Backend integration flow', () => {
  let app;
  let db;

  beforeEach(() => {
    const stack = buildApp();
    app = stack.app;
    db = stack.db;
  });

  afterEach(() => {
    db.close();
  });

  test('first login requires password change and new token flow', async () => {
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({ username: DEFAULT_ADMIN_USERNAME, password: DEFAULT_ADMIN_PASSWORD })
      .expect(200);

    expect(loginResponse.body.token).toBeDefined();
    expect(loginResponse.body.requiresPasswordChange).toBe(true);

    const token = loginResponse.body.token;

    await request(app)
      .get('/api/stations')
      .set('Authorization', `Bearer ${token}`)
      .expect(403);

    const newPassword = 'Password456!';

    const changeResponse = await request(app)
      .post('/api/auth/change-password')
      .set('Authorization', `Bearer ${token}`)
      .send({ currentPassword: DEFAULT_ADMIN_PASSWORD, newPassword })
      .expect(200);

    expect(changeResponse.body.requiresPasswordChange).toBe(false);
    expect(changeResponse.body.token).toBeDefined();

    await request(app)
      .get('/api/stations')
      .set('Authorization', `Bearer ${changeResponse.body.token}`)
      .expect(200);

    await request(app)
      .post('/api/auth/login')
      .send({ username: DEFAULT_ADMIN_USERNAME, password: DEFAULT_ADMIN_PASSWORD })
      .expect(401);

    const relogResponse = await request(app)
      .post('/api/auth/login')
      .send({ username: DEFAULT_ADMIN_USERNAME, password: newPassword })
      .expect(200);

    expect(relogResponse.body.requiresPasswordChange).toBe(false);
  });

  test('station CRUD endpoints operate correctly', async () => {
    const { token } = await authenticateAndChangePassword(app);

    const createResponse = await request(app)
      .post('/api/stations')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Delta Station', location: 'West District' })
      .expect(201);

    expect(createResponse.body.name).toBe('Delta Station');
    const stationId = createResponse.body.id;

    const listResponse = await request(app)
      .get('/api/stations')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(Array.isArray(listResponse.body)).toBe(true);
    expect(listResponse.body.find(station => station.id === stationId)).toBeDefined();

    const detailResponse = await request(app)
      .get(`/api/stations/${stationId}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(detailResponse.body.name).toBe('Delta Station');

    const updateResponse = await request(app)
      .put(`/api/stations/${stationId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Echo Station', location: 'West Ridge' })
      .expect(200);

    expect(updateResponse.body.name).toBe('Echo Station');

    await request(app)
      .delete(`/api/stations/${stationId}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(204);

    await request(app)
      .get(`/api/stations/${stationId}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(404);
  });

  test('permit CRUD, statistics, and CSV flows', async () => {
    const { token } = await authenticateAndChangePassword(app);

    const stationsResponse = await request(app)
      .get('/api/stations')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    const stationA = stationsResponse.body[0];

    const createStationResponse = await request(app)
      .post('/api/stations')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Foxtrot Station', location: 'Central' })
      .expect(201);

    const stationB = createStationResponse.body;

    const permitOnePayload = {
      stationId: stationA.id,
      permitNumber: 'PR-001',
      holderName: 'Jane Doe',
      permitType: 'general',
      status: 'active',
      issuedAt: '2024-01-01T08:00:00.000Z',
      expiresAt: '2024-12-31T23:59:59.000Z',
      metadata: { region: 'north' }
    };

    const permitOne = await request(app)
      .post('/api/permits')
      .set('Authorization', `Bearer ${token}`)
      .send(permitOnePayload)
      .expect(201);

    expect(permitOne.body.stationId).toBe(stationA.id);
    confirmPermitShape(permitOne.body);

    const permitListAfterOne = await request(app)
      .get('/api/permits')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(permitListAfterOne.body.length).toBe(1);

    const permitDetail = await request(app)
      .get(`/api/permits/${permitOne.body.id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(permitDetail.body.permitNumber).toBe('PR-001');

    const updatedPermit = await request(app)
      .put(`/api/permits/${permitOne.body.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        ...permitOnePayload,
        status: 'expired',
        metadata: { region: 'north', note: 'Updated' }
      })
      .expect(200);

    expect(updatedPermit.body.status).toBe('expired');

    const permitTwoPayload = {
      stationId: stationB.id,
      permitNumber: 'PR-002',
      holderName: 'John Smith',
      permitType: 'hazmat',
      status: 'pending',
      issuedAt: '2024-01-02T09:00:00.000Z'
    };

    const permitTwo = await request(app)
      .post('/api/permits')
      .set('Authorization', `Bearer ${token}`)
      .send(permitTwoPayload)
      .expect(201);

    const permitThreePayload = {
      stationId: stationA.id,
      permitNumber: 'PR-003',
      holderName: 'Alex Roe',
      permitType: 'general',
      status: 'revoked',
      issuedAt: '2024-01-03T10:30:00.000Z'
    };

    const permitThree = await request(app)
      .post('/api/permits')
      .set('Authorization', `Bearer ${token}`)
      .send(permitThreePayload)
      .expect(201);

    const revokedList = await request(app)
      .get('/api/permits')
      .query({ status: 'revoked' })
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(revokedList.body.length).toBe(1);
    expect(revokedList.body[0].permitNumber).toBe('PR-003');

    const exportResponse = await request(app)
      .get('/api/permits/export')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(exportResponse.headers['content-type']).toMatch(/text\/csv/);
    expect(exportResponse.text).toContain('permit_number');
    expect(exportResponse.text).toContain('PR-001');

    const csvImport = [
      'station_id,permit_number,holder_name,permit_type,status,issued_at,expires_at',
      `${stationA.id},PR-004,Chris P.,general,active,2024-01-04T12:00:00.000Z,2024-12-31T23:59:59.000Z`
    ].join('\n');

    const importResponse = await request(app)
      .post('/api/permits/import')
      .set('Authorization', `Bearer ${token}`)
      .set('Content-Type', 'text/csv')
      .send(csvImport)
      .expect(200);

    expect(importResponse.body.inserted).toBe(1);
    expect(importResponse.body.errors).toEqual([]);

    const permitListAfterImport = await request(app)
      .get('/api/permits')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(permitListAfterImport.body.length).toBe(4);

    const summaryResponse = await request(app)
      .get('/api/stats/summary')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(summaryResponse.body).toMatchObject({
      totalPermits: 4,
      activePermits: 1,
      expiredPermits: 1,
      revokedPermits: 1,
      pendingPermits: 1
    });

    const timeseriesResponse = await request(app)
      .get('/api/stats/timeseries')
      .query({ start: '2024-01-01', end: '2024-01-04' })
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(timeseriesResponse.body.points).toHaveLength(4);
    expect(timeseriesResponse.body.points.map(point => point.total)).toEqual([1, 1, 1, 1]);

    const drilldownStation = await request(app)
      .get('/api/stats/drilldown')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    const stationRow = drilldownStation.body.rows.find(row => row.stationId === stationA.id);
    expect(stationRow.totals.total).toBeGreaterThanOrEqual(2);

    const drilldownStatus = await request(app)
      .get('/api/stats/drilldown')
      .query({ dimension: 'status' })
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    const statusTotals = Object.fromEntries(drilldownStatus.body.rows.map(row => [row.status, row.total]));
    expect(statusTotals).toMatchObject({
      active: 1,
      expired: 1,
      revoked: 1,
      pending: 1
    });

    const dailyResponse = await request(app)
      .get('/api/stats/daily')
      .query({ date: '2024-01-02' })
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(dailyResponse.body.total).toBe(1);
    expect(dailyResponse.body.byStatus.pending).toBe(1);
    expect(dailyResponse.body.permits[0].permitNumber).toBe('PR-002');

    await request(app)
      .delete(`/api/permits/${permitThree.body.id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(204);

    const permitListAfterDelete = await request(app)
      .get('/api/permits')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(permitListAfterDelete.body.length).toBe(3);
  });
});

function confirmPermitShape(permit) {
  expect(permit).toEqual(expect.objectContaining({
    id: expect.any(Number),
    stationId: expect.any(Number),
    permitNumber: expect.any(String),
    holderName: expect.any(String),
    permitType: expect.any(String),
    status: expect.any(String),
    issuedAt: expect.any(String)
  }));
}
