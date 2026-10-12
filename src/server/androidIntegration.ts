import { createHash, createPublicKey, randomBytes, verify } from 'node:crypto';
import postgres, { type Sql } from 'postgres';

export interface AndroidApiRequest {
  method?: string;
  headers: Readonly<Record<string, string | string[] | undefined>>;
  body?: unknown;
}

export interface AndroidApiResponse {
  status(code: number): this;
  json(body: Record<string, unknown>): unknown;
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const REASON_CODES = new Set([
  'EXTERNAL_LINK',
  'SUSPICIOUS_DOMAIN',
  'URGENCY',
  'CREDENTIAL_REQUEST',
  'BRAND_IMPERSONATION',
]);
const REQUEST_MAX_AGE_MS = 5 * 60 * 1000;
const EVENT_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;
const STATUS_MAX_AGE_MS = 75 * 1000;

let db: Sql | undefined;
let schemaReady: Promise<void> | undefined;

function getDatabase(): Sql {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL is not configured');
  }

  db ??= postgres(connectionString, {
    max: 1,
    idle_timeout: 20,
    connect_timeout: 10,
    prepare: false,
    ssl: 'require',
  });
  return db;
}

async function ensureSchema(): Promise<Sql> {
  const database = getDatabase();
  schemaReady ??= (async () => {
    await database`
      CREATE TABLE IF NOT EXISTS brandguard_android_pairing_codes (
        code_hash TEXT PRIMARY KEY,
        dashboard_token_hash TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        expires_at TIMESTAMPTZ NOT NULL,
        consumed_at TIMESTAMPTZ
      )
    `;
    await database`
      ALTER TABLE brandguard_android_pairing_codes
      ADD COLUMN IF NOT EXISTS dashboard_token_hash TEXT
    `;
    await database`
      CREATE TABLE IF NOT EXISTS brandguard_android_devices (
        device_id UUID PRIMARY KEY,
        public_key_pem TEXT NOT NULL,
        dashboard_token_hash TEXT,
        monitoring_enabled BOOLEAN NOT NULL DEFAULT FALSE,
        notification_access BOOLEAN NOT NULL DEFAULT FALSE,
        service_connected BOOLEAN NOT NULL DEFAULT FALSE,
        heartbeat_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `;
    await database`
      ALTER TABLE brandguard_android_devices
      ADD COLUMN IF NOT EXISTS dashboard_token_hash TEXT,
      ADD COLUMN IF NOT EXISTS monitoring_enabled BOOLEAN NOT NULL DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS notification_access BOOLEAN NOT NULL DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS service_connected BOOLEAN NOT NULL DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS heartbeat_at TIMESTAMPTZ
    `;
    await database`
      CREATE UNIQUE INDEX IF NOT EXISTS brandguard_android_dashboard_token_idx
      ON brandguard_android_devices (dashboard_token_hash)
      WHERE dashboard_token_hash IS NOT NULL
    `;
    await database`
      CREATE TABLE IF NOT EXISTS brandguard_android_request_nonces (
        device_id UUID NOT NULL REFERENCES brandguard_android_devices(device_id) ON DELETE CASCADE,
        nonce UUID NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        PRIMARY KEY (device_id, nonce)
      )
    `;
    await database`
      CREATE TABLE IF NOT EXISTS brandguard_android_threat_events (
        device_id UUID NOT NULL REFERENCES brandguard_android_devices(device_id) ON DELETE CASCADE,
        event_id UUID NOT NULL,
        risk_level TEXT NOT NULL CHECK (risk_level IN ('MEDIUM', 'HIGH')),
        reasons TEXT[] NOT NULL,
        detected_at TIMESTAMPTZ NOT NULL,
        received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        PRIMARY KEY (device_id, event_id)
      )
    `;
    await database`
      CREATE INDEX IF NOT EXISTS brandguard_android_events_detected_at_idx
      ON brandguard_android_threat_events (detected_at DESC)
    `;
    await database`
      DELETE FROM brandguard_android_request_nonces
      WHERE created_at < NOW() - INTERVAL '1 day'
    `;
    await database`
      DELETE FROM brandguard_android_pairing_codes
      WHERE expires_at < NOW() - INTERVAL '1 day'
    `;
  })();

  try {
    await schemaReady;
  } catch (error) {
    schemaReady = undefined;
    throw error;
  }
  return database;
}

export async function issueAndroidPairingCode(): Promise<{
  code: string;
  dashboardToken: string;
  expiresAt: Date;
}> {
  const database = await ensureSchema();
  const code = randomBytes(32).toString('base64url');
  const dashboardToken = randomBytes(32).toString('base64url');
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
  const codeHash = createHash('sha256').update(code).digest('hex');
  const dashboardTokenHash = createHash('sha256').update(dashboardToken).digest('hex');

  await database`
    INSERT INTO brandguard_android_pairing_codes
      (code_hash, dashboard_token_hash, expires_at)
    VALUES (${codeHash}, ${dashboardTokenHash}, ${expiresAt})
  `;
  return { code, dashboardToken, expiresAt };
}

export async function closeAndroidDatabase(): Promise<void> {
  if (!db) return;
  const database = db;
  db = undefined;
  schemaReady = undefined;
  await database.end({ timeout: 5 });
}

export async function handleAndroidPair(
  request: AndroidApiRequest,
  response: AndroidApiResponse
): Promise<unknown> {
  if (request.method !== 'POST') {
    return response.status(405).json({ error: 'Method not allowed' });
  }

  const body = asRecord(request.body);
  if (!body || !hasExactKeys(body, ['pairingCode', 'deviceId', 'publicKey'])) {
    return response.status(400).json({ error: 'Invalid pairing request' });
  }

  const pairingCode = body.pairingCode;
  const deviceId = body.deviceId;
  const publicKeyBase64 = body.publicKey;
  if (
    typeof pairingCode !== 'string' ||
    !/^[A-Za-z0-9_-]{40,50}$/.test(pairingCode) ||
    typeof deviceId !== 'string' ||
    !UUID_PATTERN.test(deviceId) ||
    typeof publicKeyBase64 !== 'string' ||
    !/^[A-Za-z0-9+/]+={0,2}$/.test(publicKeyBase64) ||
    publicKeyBase64.length > 2048
  ) {
    return response.status(400).json({ error: 'Invalid pairing request' });
  }

  let publicKeyPem: string;
  try {
    const publicKey = createPublicKey({
      key: Buffer.from(publicKeyBase64, 'base64'),
      format: 'der',
      type: 'spki',
    });
    if (
      publicKey.asymmetricKeyType !== 'ec' ||
      publicKey.asymmetricKeyDetails?.namedCurve !== 'prime256v1'
    ) {
      return response.status(400).json({ error: 'Unsupported device key' });
    }
    publicKeyPem = publicKey.export({ type: 'spki', format: 'pem' }).toString();
  } catch {
    return response.status(400).json({ error: 'Invalid device key' });
  }

  try {
    const database = await ensureSchema();
    const codeHash = createHash('sha256').update(pairingCode).digest('hex');
    const paired = await database.begin(async (transaction) => {
      const consumedCodes = await transaction`
        UPDATE brandguard_android_pairing_codes
        SET consumed_at = NOW()
        WHERE code_hash = ${codeHash}
          AND consumed_at IS NULL
          AND expires_at > NOW()
        RETURNING dashboard_token_hash
      `;
      if (consumedCodes.length === 0) return false;

      await transaction`
        INSERT INTO brandguard_android_devices
          (device_id, public_key_pem, dashboard_token_hash)
        VALUES
          (${deviceId}, ${publicKeyPem}, ${consumedCodes[0].dashboard_token_hash})
      `;
      return true;
    });

    if (!paired) {
      return response.status(401).json({ error: 'Pairing code is invalid or expired' });
    }
    return response.status(201).json({ paired: true, deviceId });
  } catch (error) {
    if (isUniqueViolation(error)) {
      return response.status(409).json({ error: 'Device is already paired' });
    }
    return reportServerError(response, 'Android pairing failed', error);
  }
}

export async function handleAndroidThreatEvent(
  request: AndroidApiRequest,
  response: AndroidApiResponse
): Promise<unknown> {
  if (request.method !== 'POST') {
    return response.status(405).json({ error: 'Method not allowed' });
  }

  const body = asRecord(request.body);
  if (!body || !hasExactKeys(body, ['eventId', 'riskLevel', 'reasons', 'timestamp'])) {
    return response.status(400).json({ error: 'Invalid threat summary' });
  }

  const eventId = body.eventId;
  const riskLevel = body.riskLevel;
  const reasons = body.reasons;
  const eventTimestamp = body.timestamp;
  if (
    typeof eventId !== 'string' ||
    !UUID_PATTERN.test(eventId) ||
    (riskLevel !== 'MEDIUM' && riskLevel !== 'HIGH') ||
    !Array.isArray(reasons) ||
    reasons.length < 1 ||
    reasons.length > REASON_CODES.size ||
    !reasons.every((reason): reason is string => typeof reason === 'string' && REASON_CODES.has(reason)) ||
    new Set(reasons).size !== reasons.length ||
    typeof eventTimestamp !== 'string' ||
    !isValidEventTimestamp(eventTimestamp)
  ) {
    return response.status(400).json({ error: 'Invalid threat summary' });
  }

  const auth = readAuthHeaders(request.headers);
  if (!auth) {
    return response.status(401).json({ error: 'Device authentication required' });
  }

  try {
    const database = await ensureSchema();
    const devices = await database`
      SELECT public_key_pem
      FROM brandguard_android_devices
      WHERE device_id = ${auth.deviceId}
    `;
    const publicKeyPem = devices[0]?.public_key_pem;
    if (typeof publicKeyPem !== 'string') {
      return response.status(401).json({ error: 'Device is not paired' });
    }

    const canonicalMessage = [
      'POST',
      '/api/android/events',
      auth.timestamp,
      auth.nonce,
      eventId,
      riskLevel,
      eventTimestamp,
      reasons.join(','),
    ].join('\n');
    if (!verifyRequestSignature(publicKeyPem, auth.signature, canonicalMessage)) {
      return response.status(401).json({ error: 'Device authentication failed' });
    }

    const accepted = await database.begin(async (transaction) => {
      const newNonces = await transaction`
        INSERT INTO brandguard_android_request_nonces (device_id, nonce)
        VALUES (${auth.deviceId}, ${auth.nonce})
        ON CONFLICT DO NOTHING
        RETURNING nonce
      `;
      if (newNonces.length === 0) return false;

      await transaction`
        INSERT INTO brandguard_android_threat_events
          (device_id, event_id, risk_level, reasons, detected_at)
        VALUES
          (${auth.deviceId}, ${eventId}, ${riskLevel}, ${reasons}, ${new Date(eventTimestamp)})
        ON CONFLICT (device_id, event_id) DO NOTHING
      `;
      await transaction`
        UPDATE brandguard_android_devices
        SET last_seen_at = NOW()
        WHERE device_id = ${auth.deviceId}
      `;
      return true;
    });

    if (!accepted) {
      return response.status(409).json({ error: 'Request nonce has already been used' });
    }
    return response.status(202).json({ accepted: true });
  } catch (error) {
    return reportServerError(response, 'Android threat summary could not be accepted', error);
  }
}

export async function handleAndroidStatus(
  request: AndroidApiRequest,
  response: AndroidApiResponse
): Promise<unknown> {
  if (request.method === 'GET') {
    const dashboardTokenHash = readDashboardTokenHash(request.headers);
    if (!dashboardTokenHash) {
      return response.status(401).json({ error: 'Dashboard access key required' });
    }

    try {
      const database = await ensureSchema();
      const devices = await database`
        SELECT monitoring_enabled, notification_access, service_connected, heartbeat_at
        FROM brandguard_android_devices
        WHERE dashboard_token_hash = ${dashboardTokenHash}
      `;
      const device = devices[0];
      if (!device) return response.status(404).json({ error: 'No paired Android device found' });

      const heartbeatAt = device.heartbeat_at ? new Date(device.heartbeat_at) : null;
      const heartbeatFresh = heartbeatAt !== null &&
        Date.now() - heartbeatAt.getTime() <= STATUS_MAX_AGE_MS;
      const serviceAvailable = heartbeatFresh &&
        device.notification_access === true &&
        device.service_connected === true;
      const status = !serviceAvailable
        ? 'NOT_CONNECTED'
        : device.monitoring_enabled
        ? 'CONNECTED'
        : 'PAUSED';
      return response.status(200).json({
        status,
        lastHeartbeatAt: heartbeatAt?.toISOString() ?? null,
      });
    } catch (error) {
      return reportServerError(response, 'Android status could not be read', error);
    }
  }

  if (request.method !== 'POST') {
    return response.status(405).json({ error: 'Method not allowed' });
  }

  const body = asRecord(request.body);
  if (
    !body ||
    !hasExactKeys(body, ['monitoringEnabled', 'notificationAccess', 'serviceConnected'])
  ) {
    return response.status(400).json({ error: 'Invalid Android status heartbeat' });
  }
  const monitoringEnabled = body.monitoringEnabled;
  const notificationAccess = body.notificationAccess;
  const serviceConnected = body.serviceConnected;
  if (
    typeof monitoringEnabled !== 'boolean' ||
    typeof notificationAccess !== 'boolean' ||
    typeof serviceConnected !== 'boolean'
  ) {
    return response.status(400).json({ error: 'Invalid Android status heartbeat' });
  }

  const auth = readAuthHeaders(request.headers);
  if (!auth) return response.status(401).json({ error: 'Device authentication required' });

  try {
    const database = await ensureSchema();
    const devices = await database`
      SELECT public_key_pem
      FROM brandguard_android_devices
      WHERE device_id = ${auth.deviceId}
    `;
    const publicKeyPem = devices[0]?.public_key_pem;
    if (typeof publicKeyPem !== 'string') {
      return response.status(401).json({ error: 'Device is not paired' });
    }

    const canonicalMessage = [
      'POST',
      '/api/android/status',
      auth.timestamp,
      auth.nonce,
      String(monitoringEnabled),
      String(notificationAccess),
      String(serviceConnected),
    ].join('\n');
    if (!verifyRequestSignature(publicKeyPem, auth.signature, canonicalMessage)) {
      return response.status(401).json({ error: 'Device authentication failed' });
    }

    const accepted = await database.begin(async (transaction) => {
      const newNonces = await transaction`
        INSERT INTO brandguard_android_request_nonces (device_id, nonce)
        VALUES (${auth.deviceId}, ${auth.nonce})
        ON CONFLICT DO NOTHING
        RETURNING nonce
      `;
      if (newNonces.length === 0) return false;

      await transaction`
        UPDATE brandguard_android_devices
        SET monitoring_enabled = ${monitoringEnabled},
            notification_access = ${notificationAccess},
            service_connected = ${serviceConnected},
            heartbeat_at = NOW(),
            last_seen_at = NOW()
        WHERE device_id = ${auth.deviceId}
      `;
      return true;
    });

    if (!accepted) return response.status(409).json({ error: 'Request nonce has already been used' });
    return response.status(202).json({ accepted: true });
  } catch (error) {
    return reportServerError(response, 'Android status heartbeat could not be accepted', error);
  }
}

export async function handleAndroidEventHistory(
  request: AndroidApiRequest,
  response: AndroidApiResponse
): Promise<unknown> {
  if (request.method !== 'GET') {
    return response.status(405).json({ error: 'Method not allowed' });
  }
  const dashboardTokenHash = readDashboardTokenHash(request.headers);
  if (!dashboardTokenHash) {
    return response.status(401).json({ error: 'Dashboard access key required' });
  }

  try {
    const database = await ensureSchema();
    const devices = await database`
      SELECT device_id
      FROM brandguard_android_devices
      WHERE dashboard_token_hash = ${dashboardTokenHash}
    `;
    const deviceId = devices[0]?.device_id;
    if (typeof deviceId !== 'string') {
      return response.status(404).json({ error: 'No paired Android device found' });
    }

    const events = await database`
      SELECT event_id, risk_level, reasons, detected_at
      FROM brandguard_android_threat_events
      WHERE device_id = ${deviceId}
      ORDER BY detected_at DESC
      LIMIT 100
    `;
    return response.status(200).json({
      events: events.map((event) => ({
        id: event.event_id,
        riskLevel: event.risk_level,
        reasons: event.reasons,
        timestamp: new Date(event.detected_at).toISOString(),
      })),
    });
  } catch (error) {
    return reportServerError(response, 'Android event history could not be read', error);
  }
}

export async function handleAndroidUnpair(
  request: AndroidApiRequest,
  response: AndroidApiResponse
): Promise<unknown> {
  if (request.method !== 'DELETE') {
    return response.status(405).json({ error: 'Method not allowed' });
  }
  if (request.body !== undefined && request.body !== null && !isEmptyRecord(request.body)) {
    return response.status(400).json({ error: 'Unpair request must not include a body' });
  }

  const auth = readAuthHeaders(request.headers);
  if (!auth) {
    return response.status(401).json({ error: 'Device authentication required' });
  }

  try {
    const database = await ensureSchema();
    const devices = await database`
      SELECT public_key_pem
      FROM brandguard_android_devices
      WHERE device_id = ${auth.deviceId}
    `;
    const publicKeyPem = devices[0]?.public_key_pem;
    if (typeof publicKeyPem !== 'string') {
      return response.status(401).json({ error: 'Device is not paired' });
    }

    const canonicalMessage = [
      'DELETE',
      '/api/android/device',
      auth.timestamp,
      auth.nonce,
    ].join('\n');
    if (!verifyRequestSignature(publicKeyPem, auth.signature, canonicalMessage)) {
      return response.status(401).json({ error: 'Device authentication failed' });
    }

    const removed = await database.begin(async (transaction) => {
      const newNonces = await transaction`
        INSERT INTO brandguard_android_request_nonces (device_id, nonce)
        VALUES (${auth.deviceId}, ${auth.nonce})
        ON CONFLICT DO NOTHING
        RETURNING nonce
      `;
      if (newNonces.length === 0) return false;

      await transaction`
        DELETE FROM brandguard_android_devices
        WHERE device_id = ${auth.deviceId}
      `;
      return true;
    });

    if (!removed) {
      return response.status(409).json({ error: 'Request nonce has already been used' });
    }
    return response.status(200).json({ unpaired: true });
  } catch (error) {
    return reportServerError(response, 'Android device could not be unpaired', error);
  }
}

function readDashboardTokenHash(
  headers: Readonly<Record<string, string | string[] | undefined>>
): string | null {
  const value = headers['x-bg-dashboard-token'] ?? headers['X-BG-Dashboard-Token'];
  if (
    typeof value !== 'string' ||
    !/^[A-Za-z0-9_-]{40,50}$/.test(value)
  ) {
    return null;
  }
  return createHash('sha256').update(value).digest('hex');
}

function readAuthHeaders(
  headers: Readonly<Record<string, string | string[] | undefined>>
): { deviceId: string; timestamp: string; nonce: string; signature: string } | null {
  const getHeader = (name: string): string | undefined => {
    const value = headers[name] ?? headers[name.toLowerCase()];
    return Array.isArray(value) ? undefined : value;
  };

  const deviceId = getHeader('x-bg-device-id');
  const timestamp = getHeader('x-bg-timestamp');
  const nonce = getHeader('x-bg-nonce');
  const signature = getHeader('x-bg-signature');
  if (
    !deviceId || !UUID_PATTERN.test(deviceId) ||
    !timestamp || !/^\d{13}$/.test(timestamp) ||
    !nonce || !UUID_PATTERN.test(nonce) ||
    !signature || !/^[A-Za-z0-9+/]+={0,2}$/.test(signature)
  ) {
    return null;
  }

  const requestTime = Number(timestamp);
  if (Math.abs(Date.now() - requestTime) > REQUEST_MAX_AGE_MS) return null;
  return { deviceId, timestamp, nonce, signature };
}

function verifyRequestSignature(publicKeyPem: string, signatureBase64: string, message: string): boolean {
  try {
    return verify(
      'sha256',
      Buffer.from(message, 'utf8'),
      publicKeyPem,
      Buffer.from(signatureBase64, 'base64')
    );
  } catch {
    return false;
  }
}

function isValidEventTimestamp(timestamp: string): boolean {
  const parsed = new Date(timestamp);
  const milliseconds = parsed.getTime();
  return Number.isFinite(milliseconds) &&
    parsed.toISOString() === timestamp &&
    milliseconds <= Date.now() + REQUEST_MAX_AGE_MS &&
    milliseconds >= Date.now() - EVENT_MAX_AGE_MS;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function hasExactKeys(value: Record<string, unknown>, expected: string[]): boolean {
  const actual = Object.keys(value).sort();
  return actual.length === expected.length &&
    actual.every((key, index) => key === [...expected].sort()[index]);
}

function isEmptyRecord(value: unknown): boolean {
  const record = asRecord(value);
  return record !== null && Object.keys(record).length === 0;
}

function isUniqueViolation(error: unknown): boolean {
  return asRecord(error)?.code === '23505';
}

function reportServerError(
  response: AndroidApiResponse,
  message: string,
  error: unknown
): unknown {
  const detail = error instanceof Error ? error.message : 'Unknown error';
  console.error(`${message}: ${detail}`);
  if (detail === 'DATABASE_URL is not configured') {
    return response.status(503).json({ error: 'Android integration is not configured' });
  }
  return response.status(500).json({ error: 'Android integration request failed' });
}
