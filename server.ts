import express from 'express';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());

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

// Built-in rule-based detection engine (matches on-device Kotlin engine)
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

    // Always run on-device heuristic baseline first (fastest, private)
    const localResult = evaluateLocally(sender || 'Unknown Sender', message, packageName || 'com.whatsapp');

    // If Cloud AI is requested and API key is configured, perform deep threat intelligence
    if (useCloudAi && aiClient) {
      try {
        const prompt = `You are the BrandGuard Digital Risk Protection (DRP) threat intelligence engine.
Analyze the following incoming Android notification text intercepted from ${packageName || 'a messaging app'}:
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

    return res.json(localResult);
  } catch (error: any) {
    console.error('Analysis error:', error);
    res.status(500).json({ error: error.message || 'Internal analysis error' });
  }
});

// API: Python backend source code for user reference & download
app.get('/api/python-backend-code', (_req, res) => {
  const pythonCode = `"""
BrandGuard DRP - Digital Risk Protection Backend Service
FastAPI service to ingest threat intelligence, verify malicious URLs,
and correlate scam campaigns across WhatsApp, Telegram, Instagram & SMS.
"""

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import re
from typing import List, Optional

app = FastAPI(
    title="BrandGuard DRP Threat Intelligence API",
    description="Backend service for Android BrandGuard notification threat detection",
    version="1.0.0"
)

class NotificationPayload(BaseModel):
    package_name: str
    sender_title: str
    message_text: str
    timestamp_ms: Optional[int] = None
    device_id_hash: Optional[str] = None

class ThreatAnalysisResponse(BaseModel):
    risk_level: str  # "LOW", "MEDIUM", "HIGH"
    category: str
    indicators: List[str]
    why_suspicious: str
    recommended_action: str
    warning_alert: str
    on_device_fallback: bool = False

# Known malicious patterns & brand impersonation dictionary
SPOOFED_DOMAINS = [
    r"paypal.*(?:\\.xyz|\\.top|-login|-verify)",
    r"chase.*(?:\\.xyz|-security|-alert)",
    r"apple.*(?:\\.xyz|-support|-id)",
    r"amazon.*(?:\\.xyz|-gift|-refund)",
    r"fedex.*(?:\\.xyz|-tracking|-parcel)",
    r"usps.*(?:\\.xyz|-redelivery)",
]

URGENCY_REGEX = re.compile(
    r"(immediate action|account suspended|deactivated within 24|arrest warrant|kyc expired|blocked today)",
    re.IGNORECASE
)

FINANCIAL_THEFT_REGEX = re.compile(
    r"(send otp|share otp|enter pin|cvv|wire transfer|gift card|crypto address)",
    re.IGNORECASE
)

@app.post("/api/v1/analyze", response_model=ThreatAnalysisResponse)
async def analyze_notification(payload: NotificationPayload):
    text = payload.message_text
    sender = payload.sender_title
    indicators = []
    score = 0

    # 1. Check for suspicious URLs
    urls = re.findall(r"https?://[^\\s]+", text)
    if urls:
        indicators.append(f"Contains link: {urls[0]}")
        score += 25
        for pattern in SPOOFED_DOMAINS:
            if re.search(pattern, urls[0], re.IGNORECASE):
                indicators.append(f"Spoofed brand domain matching signature: {pattern}")
                score += 50
                break

    # 2. Check urgency triggers
    if URGENCY_REGEX.search(text):
        indicators.append("Urgent psychological coercion / account termination pressure")
        score += 35

    # 3. Check credentials / payment requests
    if FINANCIAL_THEFT_REGEX.search(text):
        indicators.append("Requests sensitive credentials (OTP/PIN) or unverified payment")
        score += 45

    # Determine risk category
    if score >= 60:
        return ThreatAnalysisResponse(
            risk_level="HIGH",
            category="Credential Theft / Brand Impersonation Scam",
            indicators=indicators,
            why_suspicious="Message impersonates a trusted entity and creates false urgency to extract credentials or funds.",
            recommended_action="Do NOT click any link or send OTPs. Block the sender immediately.",
            warning_alert="⚠️ BrandGuard Warning! This message may be a scam. Avoid clicking suspicious links."
        )
    elif score >= 25:
        return ThreatAnalysisResponse(
            risk_level="MEDIUM",
            category="Suspicious External Message",
            indicators=indicators,
            why_suspicious="Message contains unverified external links or marketing urgency.",
            recommended_action="Verify sender identity directly through official channels before proceeding.",
            warning_alert="⚠️ BrandGuard Caution: Suspicious message detected. Verify sender before responding."
        )
    else:
        return ThreatAnalysisResponse(
            risk_level="LOW",
            category="Clean Message",
            indicators=["No anomalous scam patterns identified"],
            why_suspicious="Standard messaging pattern with no high-risk indicators.",
            recommended_action="Standard safety awareness.",
            warning_alert="ℹ️ BrandGuard: Safe communication."
        )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
`;
  res.setHeader('Content-Type', 'text/plain');
  res.send(pythonCode);
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
