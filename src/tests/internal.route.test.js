jest.mock('../../server/services/pushService', () => ({
  sendReminders: jest.fn(),
}));

const pushService = require('../../server/services/pushService');
const internalRoutes = require('../../server/routes/internal');

const invoke = (secretHeader, envSecret = 'cron-secret', env = 'production') => {
  const previousSecret = process.env.CRON_SECRET;
  const previousEnv = process.env.NODE_ENV;
  if (envSecret == null) delete process.env.CRON_SECRET;
  else process.env.CRON_SECRET = envSecret;
  process.env.NODE_ENV = env;
  const router = internalRoutes();
  return new Promise((resolve) => {
    const req = {
      method: 'POST',
      url: '/reminders',
      headers: secretHeader ? { 'x-cron-secret': secretHeader } : {},
      get(name) {
        if (name === 'x-cron-secret') return this.headers['x-cron-secret'];
        if (name === 'authorization') return this.headers.authorization;
        return undefined;
      },
    };
    const finish = (payload) => {
      if (previousSecret === undefined) delete process.env.CRON_SECRET;
      else process.env.CRON_SECRET = previousSecret;
      process.env.NODE_ENV = previousEnv;
      resolve(payload);
    };
    const res = {
      statusCode: 200,
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(payload) {
        finish({ status: this.statusCode || 200, body: payload });
        return this;
      },
    };
    router(req, res, (err) => {
      finish({ status: err?.status || 500, body: { error: err?.message } });
    });
  });
};

describe('internal reminders route', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('rejects a missing cron secret outside development', async () => {
    const missing = await invoke(undefined, 'cron-secret', 'production');
    const wrong = await invoke('nope', 'cron-secret', 'qa');
    expect(missing.status).toBe(401);
    expect(wrong.status).toBe(401);
    expect(pushService.sendReminders).not.toHaveBeenCalled();
  });

  test('sends reminders when the scheduler presents the secret', async () => {
    pushService.sendReminders.mockResolvedValue({ reminded: 2 });
    const result = await invoke('cron-secret', 'cron-secret', 'production');
    expect(result).toEqual({ status: 200, body: { reminded: 2 } });
    expect(pushService.sendReminders).toHaveBeenCalledTimes(1);
  });

  test('allows a development call when no secret is configured', async () => {
    pushService.sendReminders.mockResolvedValue({ reminded: 0 });
    const result = await invoke(undefined, null, 'development');
    expect(result.status).toBe(200);
  });
});
