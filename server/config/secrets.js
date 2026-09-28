/**
 * Secrets management.
 *
 * - Development: secrets come from the local .env file.
 * - QA/Production: loaded from Google Cloud Secret Manager.
 *   QA secrets are prefixed with QA_ in Secret Manager.
 */

const SECRET_NAMES = [
  'SESSION_SECRET',
  'DB_USER',
  'DB_PASSWORD',
  'DB_DATABASE',
  'DB_INSTANCE_UNIX_SOCKET',
  'INSTANCE_CONNECTION_NAME',
  'DEFAULT_CLIENT_URL',
  'GOOGLE_CLIENT_ID',
  'GOOGLE_CLIENT_SECRET',
  'APPLE_CLIENT_ID',
  'APPLE_TEAM_ID',
  'APPLE_KEY_ID',
  'APPLE_KEY',
  'EMAIL_ADDRESS',
  'EMAIL_PASSWORD',
  'CRON_SECRET',
  'FIREBASE_SERVICE_ACCOUNT_JSON',
  'STRIPE_SECRET_KEY',
  'STRIPE_PUBLISHABLE_KEY',
  'GOOGLE_CLOUD_STORAGE_BUCKET',
];

const QA_SHARED_FALLBACK = new Set([
  'DB_USER',
  'DB_PASSWORD',
  'DB_DATABASE',
  'DB_INSTANCE_UNIX_SOCKET',
  'INSTANCE_CONNECTION_NAME',
]);

const loadSecretVersion = async (client, project, secretId) => {
  const [version] = await client.accessSecretVersion({
    name: `projects/${project}/secrets/${secretId}/versions/latest`,
  });
  return version.payload.data.toString();
};

const initSecrets = async () => {
  const env = process.env.NODE_ENV || 'development';

  if (env === 'development' || env === 'test') {
    return;
  }

  const { SecretManagerServiceClient } = require('@google-cloud/secret-manager');
  const client = new SecretManagerServiceClient();
  const project = process.env.GOOGLE_CLOUD_PROJECT;
  const prefix = env === 'qa' ? 'QA_' : '';

  if (!project) {
    console.warn('GOOGLE_CLOUD_PROJECT not set; skipping Secret Manager load.');
    return;
  }

  await Promise.all(
    SECRET_NAMES.map(async (name) => {
      if (process.env[name] && String(process.env[name]).trim() !== '') {
        return;
      }
      try {
        process.env[name] = await loadSecretVersion(client, project, `${prefix}${name}`);
      } catch (err) {
        if (prefix === 'QA_' && QA_SHARED_FALLBACK.has(name)) {
          try {
            process.env[name] = await loadSecretVersion(client, project, name);
            return;
          } catch {
            // fall through
          }
        }
        console.warn(`Secret ${prefix}${name} not found; skipping.`);
      }
    })
  );
};

module.exports = { initSecrets };
