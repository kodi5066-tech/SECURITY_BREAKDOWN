import { NotificationEvent, AndroidConnectionStatus, ThreatAnalysis } from '../types/brandguard';

interface AndroidStatusResponse {
  status: AndroidConnectionStatus;
  lastHeartbeatAt: string | null;
}

interface AndroidEventsResponse {
  events: {
    id: string;
    riskLevel: 'MEDIUM' | 'HIGH';
    reasons: string[];
    timestamp: string;
  }[];
}

const REASON_LABELS: Record<string, string> = {
  EXTERNAL_LINK: 'An external link was present',
  SUSPICIOUS_DOMAIN: 'The link matched a suspicious domain pattern',
  URGENCY: 'Urgent or coercive wording was detected',
  CREDENTIAL_REQUEST: 'A credential or payment request was detected',
  BRAND_IMPERSONATION: 'Possible brand impersonation was detected',
};

export async function fetchAndroidStatus(token: string): Promise<AndroidStatusResponse> {
  const response = await fetch('/api/android/status', {
    headers: { 'X-BG-Dashboard-Token': token },
  });
  if (!response.ok) throw new Error(await readApiError(response));
  const result = await response.json() as AndroidStatusResponse;
  if (
    !['NOT_CONNECTED', 'CONNECTED', 'PAUSED'].includes(result.status) ||
    (result.lastHeartbeatAt !== null && !Number.isFinite(Date.parse(result.lastHeartbeatAt)))
  ) {
    throw new Error('The backend returned an invalid Android status.');
  }
  return result;
}

export async function fetchAndroidEvents(token: string): Promise<NotificationEvent[]> {
  const response = await fetch('/api/android/events', {
    headers: { 'X-BG-Dashboard-Token': token },
  });
  if (!response.ok) throw new Error(await readApiError(response));
  const result = await response.json() as AndroidEventsResponse;
  if (!Array.isArray(result.events)) throw new Error('The backend returned invalid Android history.');
  return result.events.map((event) => ({
    id: `android-${event.id}`,
    source: 'android',
    timestamp: event.timestamp,
    appName: 'Android notification',
    packageName: 'android.notification',
    sender: 'Not collected',
    message: 'Notification text was analyzed locally and was not uploaded.',
    analysis: createAndroidAnalysis(event.riskLevel, event.reasons),
    read: true,
  }));
}

function createAndroidAnalysis(
  riskLevel: 'MEDIUM' | 'HIGH',
  reasons: string[]
): ThreatAnalysis {
  const indicators = reasons.map((reason) => REASON_LABELS[reason] ?? 'A supported threat signal was detected');
  return {
    riskLevel,
    category: riskLevel === 'HIGH' ? 'High-risk message' : 'Suspicious message',
    indicators,
    whySuspicious: 'The Android companion identified these signals locally. Original notification contents were not sent.',
    recommendedAction: 'Avoid links and requests for codes or payment. Verify independently through the official service.',
    warningAlertText: riskLevel === 'HIGH'
      ? 'BrandGuard detected a high-risk notification.'
      : 'BrandGuard detected a suspicious notification.',
    onDeviceProcessed: true,
    deepAnalysisSource: 'Android on-device analysis',
  };
}

async function readApiError(response: Response): Promise<string> {
  try {
    const body = await response.json() as { error?: unknown };
    if (typeof body.error === 'string') return body.error;
  } catch {
    // Use the HTTP status if the response is not a JSON API error.
  }
  return `Android backend request failed (HTTP ${response.status}).`;
}
