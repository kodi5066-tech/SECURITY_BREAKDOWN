import express from 'express';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';
import {
  handleAndroidPair,
  handleAndroidStatus,
  handleAndroidEventHistory,
  handleAndroidThreatEvent,
  handleAndroidUnpair,
} from './src/server/androidIntegration';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json({ limit: '16kb' }));

// Initialize Google GenAI client if key exists
const apiKey = process.env.GEMINI_API_KEY;
let aiClient: GoogleGenAI | null = null;
if (apiKey) {
  try {
    aiClient = new GoogleGenAI({ apiKey });
  } catch (err) {
    console.warn('Could not initialize Google GenAI:', err);
  }
}

// Built-in server-side heuristic detection engine
interface HeuristicResult {
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  category: string;
  indicators: string[];
  whySuspicious: string;
  recommendedAction: string;
  warningAlertText: string;
  onDeviceProcessed: boolean;
}

function evaluateLocally(sender: string, message: string, packageName: string): HeuristicResult {
  const text = message.toLowerCase();
  const senderLower = sender.toLowerCase();
  const indicators: string[] = [];
  let score = 0; // 0-100 scale

  // 1. Phishing & Malicious Link Indicators
  const urlRegex = /(https?:\/\/[^\s]+|www\.[^\s]+|[a-zA-Z0-9-]+\.(?:xyz|top|work|click|club|buzz|info|cc|live|online|su|ru|fit|link|gq|tk|cf|ga|ml|vip)\b[^\s]*)/gi;
  const urls = message.match(urlRegex) || [];
  
  const suspiciousUrlPatterns = [
    /bit\.ly/i, /tinyurl\.com/i, /is\.gd/i, /cutt\.ly/i, /rb\.gy/i, /t\.co/i,
    /paypal.*(?:\.xyz|\.top|\.online|-security|-login|-verify)/i,
    /chase.*(?:\.xyz|\.top|-alert|-login|-update)/i,
    /wells.*(?:\.xyz|\.top|-auth|-verify)/i,
    /apple.*(?:\.xyz|\.top|-id|-icloud|-support)/i,
    /amazon.*(?:\.xyz|\.top|-order|-gift|-refund)/i,
    /dhl.*(?:\.xyz|\.top|-tracking|-parcel)/i,
    /usps.*(?:\.xyz|\.top|-redelivery|-customs)/i,
    /fedex.*(?:\.xyz|\.top|-delivery)/i,
    /whatsapp.*(?:\.xyz|\.top|-free|-web)/i,
    /telegram.*(?:\.xyz|\.top|-login)/i,
    /instagram.*(?:\.xyz|\.top|-verify|-badge)/i,
    /netflix.*(?:\.xyz|\.top|-billing|-account)/i,
  ];

  if (urls.length > 0) {
    indicators.push(`Contains external URL(s): ${urls.slice(0, 2).join(', ')}`);
    score += 25;
    for (const url of urls) {
      if (suspiciousUrlPatterns.some((pattern) => pattern.test(url))) {
        indicators.push(`High-risk domain or spoofed brand URL: ${url}`);
        score += 45;
        break;
      }
      if (url.match(/@[a-zA-Z0-9.-]+/)) {
        indicators.push('URL contains credential-harvesting userinfo syntax (@)');
        score += 35;
      }
      if (url.match(/\.(xyz|top|work|click|buzz|su|cf|gq|tk|ml)\b/i)) {
        indicators.push('Suspicious low-cost / bulletproof TLD frequently abused in spam');
        score += 30;
      }
    }
  }

  // 2. High Urgency & Coercive Phrasing
  const urgencyKeywords = [
    'immediate action', 'urgent', 'account suspended', 'will be suspended',
    'terminated within 24 hours', 'blocked in 1 hour', 'deactivated immediately',
    'legal action', 'police case', 'arrest warrant', 'final warning',
    'electricity disconnected', 'sim will be blocked', 'kyc expired', 'kyc suspended'
  ];
  const foundUrgency = urgencyKeywords.filter((k) => text.includes(k));
  if (foundUrgency.length > 0) {
    indicators.push(`High urgency / coercive coercion detected: "${foundUrgency.slice(0, 2).join('", "')}"`);
    score += 35;
  }

  // 3. Credential & Financial Theft
  const credentialKeywords = [
    'send otp', 'share otp', 'enter your pin', 'verify password', 'cvv',
    'bank details', 'credit card number', 'seed phrase', 'secret key',
    'wire transfer', 'crypto wallet', 'buy gift card', 'pay fine'
  ];
  const foundCreds = credentialKeywords.filter((k) => text.includes(k));
  if (foundCreds.length > 0) {
    indicators.push(`Requests sensitive credentials or money transfer: "${foundCreds.slice(0, 2).join('", "')}"`);
    score += 40;
  }

  // 4. Lottery, Fake Rewards & Job Scams
  const scamKeywords = [
    'congratulations you won', 'lottery winner', 'selected for $', 'claim your prize',
    'earn 500$ daily', 'work from home like youtube', 'part time job earn',
    'crypto giveaway', 'double your bitcoin', 'free iphone', 'unclaimed funds'
  ];
  const foundScams = scamKeywords.filter((k) => text.includes(k));
  if (foundScams.length > 0) {
    indicators.push(`Classic lure / reward / job scam syntax: "${foundScams.slice(0, 2).join('", "')}"`);
    score += 40;
  }

  // 5. Impersonation of Brands / Official Services
  const impersonationEntities = [
    'usps', 'fedex', 'dhl', 'ups', 'paypal', 'chase bank', 'wells fargo',
    'bank of america', 'apple support', 'netflix billing', 'amazon security',
    'whatsapp support', 'instagram team', 'irs tax', 'customs department'
  ];
  const foundImpersonation = impersonationEntities.filter((k) => text.includes(k) || senderLower.includes(k));
  if (foundImpersonation.length > 0 && (urls.length > 0 || foundUrgency.length > 0 || foundCreds.length > 0)) {
    indicators.push(`Likely brand impersonation targeting: ${foundImpersonation.join(', ')}`);
    score += 35;
  }

  // Normalize risk level
  let riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' = 'LOW';
  let category = 'Informational / Low Threat';
  let whySuspicious = 'No immediate scam markers detected. Normal communication patterns.';
  let recommendedAction = 'No action required. Normal precaution recommended.';

  if (score >= 60) {
    riskLevel = 'HIGH';
    if (foundCreds.length > 0 || foundUrgency.length > 0) {
      category = 'Credential Harvesting / Account Takeover Scam';
      whySuspicious = 'The message uses aggressive urgency and prompts you to provide credentials, OTPs, or visit a spoofed domain.';
      recommendedAction = 'Do NOT click links, do not reply with OTPs or payment details. Delete and report the sender.';
    } else if (foundScams.length > 0) {
      category = 'Lottery / Job / Fake Reward Scam';
      whySuspicious = 'Promised unearned rewards, lottery payouts, or unrealistic high-yield task payments designed to siphon upfront fees.';
      recommendedAction = 'Do not engage. Never pay upfront fees for prizes or jobs. Block sender.';
    } else {
      category = 'High-Risk Phishing Link';
      whySuspicious = 'Contains untrusted link designed to imitate trusted authentication or banking services.';
      recommendedAction = 'Do not open the link. Navigate to the legitimate website directly in your browser.';
    }
  } else if (score >= 25) {
    riskLevel = 'MEDIUM';
    category = 'Suspicious Unverified Message / Unknown Link';
    whySuspicious = 'Message contains an unverified external link or marketing urgency requiring verification.';
    recommendedAction = 'Verify sender identity independently before interacting with any attachments or links.';
  } else {
    riskLevel = 'LOW';
    category = 'Low Risk Message';
    whySuspicious = 'No common fraud patterns, suspicious domains, or coercive demands identified.';
    recommendedAction = 'Standard caution. Keep Android notification protection active.';
  }

  const warningAlertText = riskLevel === 'HIGH'
    ? '⚠️ BrandGuard Warning! This message may be a scam. Avoid clicking suspicious links.'
    : riskLevel === 'MEDIUM'
    ? '⚠️ BrandGuard Caution: Suspicious message detected. Verify sender before responding.'
    : 'ℹ️ BrandGuard: Message evaluated safe. No malicious indicators found.';

  return {
    riskLevel,
    category,
    indicators: indicators.length > 0 ? indicators : ['Clean message content', 'No anomalous URL structures'],
    whySuspicious,
    recommendedAction,
    warningAlertText,
    onDeviceProcessed: true,
  };
}

// API: Analyze message
app.post('/api/analyze', async (req, res) => {
  try {
    const { sender, message, packageName, useCloudAi } = req.body;
    if (!message) {
      return res.status(400).json({ error: 'Message content is required' });
    }

    // Run a server-side heuristic baseline before optional cloud analysis.
    const localResult = evaluateLocally(sender || 'Unknown Sender', message, packageName || 'com.whatsapp');

    // If Cloud AI is requested and API key is configured, perform deep threat intelligence
    if (useCloudAi && aiClient) {
      try {
        const prompt = `You are the BrandGuard Digital Risk Protection (DRP) threat intelligence engine.
Analyze the following message text submitted by a user from ${packageName || 'a messaging app'}:
Sender/Title: "${sender || 'Unknown'}"
Notification Body: "${message}"

Determine if this is a scam, phishing, brand impersonation, lottery fraud, payment request, or legitimate message.
Respond ONLY with a valid JSON object matching this schema:
{
  "riskLevel": "LOW" | "MEDIUM" | "HIGH",
  "category": "string (e.g. Phishing / Impersonation / Fake Offer / Payment Fraud / Job Scam / Legitimate)",
  "indicators": ["string", "string"],
  "whySuspicious": "Concise plain English explanation (1-2 sentences)",
  "recommendedAction": "Actionable safe recommendation for the user (1 sentence)",
  "warningAlertText": "Short alert title for Android heads-up notification (e.g. '⚠️ BrandGuard Warning! This message may be a scam. Avoid clicking suspicious links.')"
}`;

        const aiResponse = await aiClient.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
          },
        });

        const textOutput = aiResponse.text;
        if (textOutput) {
          const parsed = JSON.parse(textOutput);
          return res.json({
            ...parsed,
            onDeviceProcessed: false,
            deepAnalysisSource: 'Gemini 2.5 Flash DRP Engine',
          });
        }
      } catch (aiErr) {
        console.warn('AI analysis failed, falling back to local heuristic:', aiErr);
        // Fallback to local heuristic
      }
    }

    return res.json({
      ...localResult,
      onDeviceProcessed: false,
      deepAnalysisSource: 'Server-side heuristic fallback',
    });
  } catch (error: any) {
    console.error('Analysis error:', error);
    res.status(500).json({ error: error.message || 'Internal analysis error' });
  }
});

app.post('/api/android/pair', (req, res) => {
  void handleAndroidPair(req, res);
});

app.post('/api/android/events', (req, res) => {
  void handleAndroidThreatEvent(req, res);
});

app.get('/api/android/events', (req, res) => {
  void handleAndroidEventHistory(req, res);
});

app.get('/api/android/status', (req, res) => {
  void handleAndroidStatus(req, res);
});

app.post('/api/android/status', (req, res) => {
  void handleAndroidStatus(req, res);
});

app.delete('/api/android/device', (req, res) => {
  void handleAndroidUnpair(req, res);
});

// Configure Vite or Static Serve
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.resolve(__dirname, 'dist')));
  app.get('*', (_req, res) => {
    res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
  });
} else {
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: 'spa',
  });
  app.use(vite.middlewares);
}

const PORT = 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`BrandGuard server listening on http://0.0.0.0:${PORT}`);
});
