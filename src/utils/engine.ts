import { ThreatAnalysis, RiskLevel } from '../types/brandguard';

export function analyzeMessageLocally(
  sender: string,
  message: string,
  packageName: string,
  sensitivity: 'LOW' | 'BALANCED' | 'STRICT' = 'BALANCED'
): ThreatAnalysis {
  const text = message.toLowerCase();
  const senderLower = sender.toLowerCase();
  const indicators: string[] = [];
  let score = 0;

  // Threshold adjustments based on sensitivity
  const highThreshold = sensitivity === 'STRICT' ? 45 : sensitivity === 'LOW' ? 70 : 55;
  const mediumThreshold = sensitivity === 'STRICT' ? 20 : sensitivity === 'LOW' ? 35 : 25;

  // 1. URLs and Malicious TLDs
  const urlRegex = /(https?:\/\/[^\s]+|www\.[^\s]+|[a-zA-Z0-9-]+\.(?:xyz|top|work|click|club|buzz|info|cc|live|online|su|ru|fit|link|gq|tk|cf|ga|ml|vip|store)\b[^\s]*)/gi;
  const urls = message.match(urlRegex) || [];

  const suspiciousDomainPatterns = [
    /bit\.ly/i, /tinyurl\.com/i, /is\.gd/i, /cutt\.ly/i, /rb\.gy/i, /t\.co/i,
    /whatsapp.*(?:\.xyz|\.top|-free|-web|-support|-account)/i,
    /paypal.*(?:\.xyz|\.top|\.online|-security|-login|-verify)/i,
    /chase.*(?:\.xyz|\.top|-alert|-login|-update|-cancel)/i,
    /wells.*(?:\.xyz|\.top|-auth|-verify)/i,
    /apple.*(?:\.xyz|\.top|-id|-icloud|-support)/i,
    /amazon.*(?:\.xyz|\.top|-order|-gift|-refund|-hiring)/i,
    /dhl.*(?:\.xyz|\.top|-tracking|-parcel)/i,
    /usps.*(?:\.xyz|\.top|-redelivery|-customs|-fee)/i,
    /fedex.*(?:\.xyz|\.top|-delivery)/i,
    /telegram.*(?:\.xyz|\.top|-login)/i,
    /instagram.*(?:\.xyz|\.top|-verify|-badge|-appeal)/i,
    /binance.*(?:\.xyz|\.top|-auth|-safety)/i,
    /meta.*(?:\.xyz|\.online|-appeal|-case)/i,
  ];

  if (urls.length > 0) {
    indicators.push(`External hyperlink detected: ${urls[0]}`);
    score += 25;

    for (const url of urls) {
      if (suspiciousDomainPatterns.some(pattern => pattern.test(url))) {
        indicators.push(`Known spoofed domain pattern detected: ${url}`);
        score += 45;
        break;
      }
      if (url.match(/@[a-zA-Z0-9.-]+/)) {
        indicators.push('URL embeds obfuscated credentials/userinfo (@ syntax)');
        score += 35;
      }
      if (url.match(/\.(xyz|top|work|click|buzz|su|cf|gq|tk|ml|online|link)\b/i)) {
        indicators.push('High-risk low-trust TLD frequently weaponized in smishing');
        score += 30;
      }
    }
  }

  // 2. Coercive Urgency & Account Threat Triggers
  const urgencyKeywords = [
    'immediate action', 'urgent', 'account suspended', 'will be suspended',
    'terminated within 24', 'blocked in 1 hour', 'deactivated immediately',
    'legal action', 'police case', 'arrest warrant', 'final warning',
    'electricity disconnected', 'sim will be blocked', 'kyc expired',
    'permanently deleted', 'unauthorized zelle', 'withdrawals frozen'
  ];
  const matchedUrgency = urgencyKeywords.filter(k => text.includes(k));
  if (matchedUrgency.length > 0) {
    indicators.push(`Coercive urgency tactics: "${matchedUrgency.slice(0, 2).join('", "')}"`);
    score += 35;
  }

  // 3. Credential, OTP & Payment Siphoning
  const credentialKeywords = [
    'send otp', 'share otp', 'enter your pin', 'verify password', 'cvv',
    'bank details', 'credit card number', 'seed phrase', 'secret key',
    'wire transfer', 'crypto wallet', 'buy gift card', 'transfer $',
    'send $', 'zelle', 'pay $', 'redelivery fee'
  ];
  const matchedCredentials = credentialKeywords.filter(k => text.includes(k));
  if (matchedCredentials.length > 0) {
    indicators.push(`Requests sensitive credentials or money transfer: "${matchedCredentials.slice(0, 2).join('", "')}"`);
    score += 40;
  }

  // 4. Lures (Lottery, Unrealistic Tasks, Free iPhones)
  const lureKeywords = [
    'congratulations you won', 'lottery winner', 'selected for $', 'claim your prize',
    'earn 500$ daily', 'earn $300-$700', 'part time job earn', 'video rating',
    'crypto giveaway', 'double your bitcoin', 'free iphone', 'unclaimed funds',
    'flash deal! 80% off'
  ];
  const matchedLures = lureKeywords.filter(k => text.includes(k));
  if (matchedLures.length > 0) {
    indicators.push(`Scam lure / unrealistic reward pattern: "${matchedLures.slice(0, 2).join('", "')}"`);
    score += 40;
  }

  // 5. Impersonation of Recognized Brands
  const recognizedBrands = [
    'whatsapp', 'instagram', 'telegram', 'chase', 'wells fargo', 'bank of america',
    'apple', 'amazon', 'usps', 'fedex', 'dhl', 'binance', 'netflix', 'irs'
  ];
  const matchedBrands = recognizedBrands.filter(b => text.includes(b) || senderLower.includes(b));
  if (matchedBrands.length > 0 && (urls.length > 0 || matchedUrgency.length > 0 || matchedCredentials.length > 0)) {
    indicators.push(`Potential brand impersonation targeting: ${matchedBrands.join(', ')}`);
    score += 30;
  }

  // Determine Final Risk Level
  let riskLevel: RiskLevel = 'LOW';
  let category = 'Clean Message';
  let whySuspicious = 'No malicious indicators or coercive phrasing detected.';
  let recommendedAction = 'No action needed. Regular messaging precautions apply.';

  if (score >= highThreshold) {
    riskLevel = 'HIGH';
    if (matchedCredentials.length > 0 || matchedUrgency.length > 0) {
      category = 'Credential Harvesting & Fraudulent Lure';
      whySuspicious = 'Combines intense psychological urgency with requests for authentication tokens, OTPs, or visits to fake domains.';
      recommendedAction = 'Do NOT click links. Never disclose OTPs or payment numbers. Block sender immediately.';
    } else if (matchedLures.length > 0) {
      category = 'Task & Reward Scam';
      whySuspicious = 'Promised unearned rewards or unrealistic task earnings designed to extract advance processing fees.';
      recommendedAction = 'Ignore and block. Legitimate companies never recruit or pay through unverified channels.';
    } else {
      category = 'Phishing / Malicious Link';
      whySuspicious = 'Contains untrusted link mimicking trusted login portals or critical security notices.';
      recommendedAction = 'Avoid clicking suspicious links. Check the official app or website directly.';
    }
  } else if (score >= mediumThreshold) {
    riskLevel = 'MEDIUM';
    category = 'Suspicious Unverified Message';
    whySuspicious = 'Message contains promotional pressure or unknown external URLs that warrant manual caution.';
    recommendedAction = 'Verify sender identity independently before tapping any links.';
  }

  const warningAlertText = riskLevel === 'HIGH'
    ? '⚠️ BrandGuard Warning! This message may be a scam. Avoid clicking suspicious links.'
    : riskLevel === 'MEDIUM'
    ? '⚠️ BrandGuard Caution: Suspicious message detected. Verify sender before responding.'
    : 'ℹ️ BrandGuard: Safe communication. No threat detected.';

  return {
    riskLevel,
    category,
    indicators: indicators.length > 0 ? indicators : ['Local heuristics passed clean', 'No anomalous signatures'],
    whySuspicious,
    recommendedAction,
    warningAlertText,
    onDeviceProcessed: true,
  };
}

export async function analyzeMessageWithCloudFallback(
  sender: string,
  message: string,
  packageName: string,
  useCloudAi: boolean,
  sensitivity: 'LOW' | 'BALANCED' | 'STRICT' = 'BALANCED'
): Promise<ThreatAnalysis> {
  // If user opted for local-only, return instant local analysis
  if (!useCloudAi) {
    return analyzeMessageLocally(sender, message, packageName, sensitivity);
  }

  try {
    const res = await fetch('/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sender, message, packageName, useCloudAi: true }),
    });

    if (res.ok) {
      const data = await res.json();
      return data as ThreatAnalysis;
    }
  } catch (err) {
    console.warn('API call failed, fallback to local engine:', err);
  }

  // Graceful on-device fallback
  return analyzeMessageLocally(sender, message, packageName, sensitivity);
}
