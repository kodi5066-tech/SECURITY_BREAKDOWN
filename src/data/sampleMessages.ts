export interface SampleMessage {
  id: string;
  appName: string;
  packageName: string;
  sender: string;
  message: string;
  expectedRisk: 'HIGH' | 'MEDIUM' | 'LOW';
  lureType: string;
  description: string;
}

export const SAMPLE_MESSAGES: SampleMessage[] = [
  {
    id: 'sample-wa-1',
    appName: 'WhatsApp',
    packageName: 'com.whatsapp',
    sender: 'WhatsApp Official Care',
    message: '⚠️ WhatsApp Notice: Your account will be suspended within 24 hours due to multiple illegal reports. Verify your identity immediately: https://whatsapp-account-support.top/auth',
    expectedRisk: 'HIGH',
    lureType: 'Account Takeover / Phishing Link',
    description: 'Spoofs WhatsApp security with high urgency threat and suspicious .top phishing domain.',
  },
  {
    id: 'sample-sms-1',
    appName: 'Google Messages (SMS)',
    packageName: 'com.google.android.apps.messaging',
    sender: 'CHASE-ALERT',
    message: 'Chase Fraud Dept: Unauthorized Zelle payment of $1,850.00 was attempted. If not recognized, decline immediately at https://chase-security-login.xyz or share OTP 849201 to cancel.',
    expectedRisk: 'HIGH',
    lureType: 'Banking Fraud / OTP Harvesting',
    description: 'Impersonates Chase bank, creates panic regarding money transfer, and harvests one-time password / login credentials.',
  },
  {
    id: 'sample-ig-1',
    appName: 'Instagram',
    packageName: 'com.instagram.android',
    sender: 'Instagram Meta Support',
    message: 'Copyright Infringement Notice: Your account violates Meta community guidelines and will be permanently deleted in 12 hours. Review case: https://meta-appeal-case.online/form',
    expectedRisk: 'HIGH',
    lureType: 'Impersonation & Phishing',
    description: 'Impersonates Meta/Instagram copyright moderation to steal credentials via fake appeal form.',
  },
  {
    id: 'sample-tg-1',
    appName: 'Telegram',
    packageName: 'org.telegram.messenger',
    sender: 'Binance Security Bot',
    message: 'Suspicious IP login detected from Moscow. All crypto withdrawals frozen. Unlock your wallet and sync assets here: https://binance-safety-auth.xyz/connect',
    expectedRisk: 'HIGH',
    lureType: 'Crypto Drainer / Seed Theft',
    description: 'Targets crypto wallet users by simulating withdrawal freeze and phishing for private keys/seed phrases.',
  },
  {
    id: 'sample-sms-2',
    appName: 'Google Messages (SMS)',
    packageName: 'com.google.android.apps.messaging',
    sender: '+1 (800) 241-9941',
    message: 'USPS Delivery Notice: Package #US9401828 could not be delivered due to missing street number. Update address and pay $1.50 redelivery fee: https://usps-parcel-redelivery.link',
    expectedRisk: 'HIGH',
    lureType: 'Smishing / Credit Card Siphon',
    description: 'Classic courier smishing designed to collect credit card numbers for nominal redelivery fees.',
  },
  {
    id: 'sample-wa-2',
    appName: 'WhatsApp',
    packageName: 'com.whatsapp',
    sender: '+1 (415) 890-3321',
    message: 'Hi Dad! I lost my phone and broke my laptop, using my friend Alex phone. Please transfer $650 to this Zelle: alex.transfer92@paymail.com right now for taxi and emergency!',
    expectedRisk: 'HIGH',
    lureType: 'Family Impersonation / Emergency Scam',
    description: 'Impersonates family member in immediate crisis to trigger emotional wire transfer without verification.',
  },
  {
    id: 'sample-tg-2',
    appName: 'Telegram',
    packageName: 'org.telegram.messenger',
    sender: 'Global HR Recruitment',
    message: 'Work from home! Amazon is hiring remote video rating assistants. Earn $300-$700/day for 30 minutes of work. Contact Telegram recruiter @amazon_hr_official to start.',
    expectedRisk: 'HIGH',
    lureType: 'Task / Advance-Fee Job Scam',
    description: 'Lures victims with unrealistic pay rates, leading to prepaid task fees or fake crypto deposit schemes.',
  },
  {
    id: 'sample-ig-2',
    appName: 'Instagram',
    packageName: 'com.instagram.android',
    sender: 'nike_flash_clearance',
    message: 'Flash Deal! 80% off all Air Jordans for next 2 hours only. Limited stock clearance: https://nike-clearance-outlet.store',
    expectedRisk: 'MEDIUM',
    lureType: 'Counterfeit / Unverified Promo',
    description: 'High-urgency promotional message with non-standard domain selling suspected counterfeit goods.',
  },
  {
    id: 'sample-wa-3',
    appName: 'WhatsApp',
    packageName: 'com.whatsapp',
    sender: 'David Miller',
    message: 'Hey, are you free for the project review meeting at 3 PM today in the second floor conference room?',
    expectedRisk: 'LOW',
    lureType: 'Legitimate Message',
    description: 'Normal workplace communication with no links, urgency coercions, or credential requests.',
  },
  {
    id: 'sample-sms-3',
    appName: 'Google Messages (SMS)',
    packageName: 'com.google.android.apps.messaging',
    sender: 'GOOGLE',
    message: 'G-749102 is your Google verification code. Never share this code with anyone. Google will never call or message to ask for this code.',
    expectedRisk: 'LOW',
    lureType: 'Legitimate 2FA Notice',
    description: 'Authentic 2FA code with built-in security warning against sharing.',
  },
];
