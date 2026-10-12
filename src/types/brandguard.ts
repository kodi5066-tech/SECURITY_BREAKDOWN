export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH';

export interface ThreatAnalysis {
  riskLevel: RiskLevel;
  category: string;
  indicators: string[];
  whySuspicious: string;
  recommendedAction: string;
  warningAlertText: string;
  onDeviceProcessed: boolean;
  deepAnalysisSource?: string;
}

export interface NotificationEvent {
  id: string;
  source: 'sample' | 'simulated' | 'manual';
  timestamp: string;
  appName: string;
  packageName: string;
  sender: string;
  message: string;
  analysis: ThreatAnalysis;
  read: boolean;
}

export interface MonitoredApp {
  id: string;
  name: string;
  enabled: boolean;
}

export interface MonitoringSettingsConfig {
  monitoredApps: MonitoredApp[];
  sensitivity: 'LOW' | 'BALANCED' | 'STRICT';
  processLocallyOnly: boolean;
  soundAlertEnabled: boolean;
  vibrationAlertEnabled: boolean;
  instantHeadsUpEnabled: boolean;
  browserNotificationsEnabled: boolean;
}
