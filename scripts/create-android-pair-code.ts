import {
  closeAndroidDatabase,
  issueAndroidPairingCode,
} from '../src/server/androidIntegration';

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error('Set DATABASE_URL to the Neon PostgreSQL connection string first.');
  process.exitCode = 1;
} else {
  try {
    const { code, dashboardToken, expiresAt } = await issueAndroidPairingCode();
    console.log(`One-time Android pairing code (expires ${expiresAt.toISOString()}):`);
    console.log(code);
    console.log('Private dashboard access key (shown once; enter it on Device Protection):');
    console.log(dashboardToken);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error(`Could not create Android pairing code: ${message}`);
    process.exitCode = 1;
  } finally {
    await closeAndroidDatabase();
  }
}
