/** Provider-neutral notification contracts and safe development adapters. */
export type NotificationChannel = 'EMAIL' | 'SMS' | 'PUSH';

export interface NotificationOptions {
  channel: NotificationChannel;
  type: string;
  recipient: string;
  subject?: string;
  /** Current callers use content; message is retained for newer integrations. */
  content?: string;
  message?: string;
  html?: string;
  metadata?: Record<string, unknown>;
  timeoutMs?: number;
}

export interface NotificationResult {
  success: boolean;
  messageId: string;
  notificationId: string;
  channel: NotificationChannel;
  isSimulated: boolean;
  delivered: boolean;
  simulationNotice?: string;
  errorCode?: string;
  errorMessage?: string;
}

export interface NotificationAdapter {
  providerName: string;
  isSimulated: boolean;
  send(options: NotificationOptions): Promise<NotificationResult>;
}

export class MockNotificationAdapter implements NotificationAdapter {
  public readonly providerName = 'MOCK_NOTIFICATION_PROVIDER';
  public readonly isSimulated = true;
  private history: Array<NotificationOptions & { notificationId: string; createdAt: string }> = [];

  public clearHistory(): void { this.history = []; }
  public getHistory() { return [...this.history]; }

  public async send(options: NotificationOptions): Promise<NotificationResult> {
    if (options.timeoutMs && options.recipient === 'timeout@test.com') {
      throw new Error('Notification dispatch timed out.');
    }
    const notificationId = `notif_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const base = {
      messageId: notificationId,
      notificationId,
      channel: options.channel,
      isSimulated: true,
      delivered: false,
      simulationNotice: '[SIMULATED_MOCK] No external provider was contacted.',
    };
    if (!options.recipient?.trim()) {
      return { ...base, success: false, errorCode: 'INVALID_RECIPIENT', errorMessage: 'Notification recipient is required.' };
    }
    if (options.recipient === 'fail@test.com') {
      return { ...base, success: false, errorCode: 'PROVIDER_UNAVAILABLE', errorMessage: 'Simulated notification provider failure.' };
    }
    this.history.push({ ...options, notificationId, createdAt: new Date().toISOString() });
    return { ...base, success: true };
  }
}

/** A deliberately non-networking email adapter; never claims delivery without credentials. */
export class EmailProviderAdapter implements NotificationAdapter {
  public readonly providerName = 'SENDGRID_EMAIL_PROVIDER';
  public readonly isSimulated: boolean;
  private apiKey?: string;
  constructor(apiKey?: string, _fromEmailOrLegacyFlag?: string | boolean, _fromName?: string, _provider?: unknown, isSimulated = true) {
    this.apiKey = apiKey;
    this.isSimulated = isSimulated;
  }
  public async send(options: NotificationOptions): Promise<NotificationResult> {
    const id = `notif_${Date.now()}`;
    if (!options.recipient?.trim()) return { success: false, messageId: id, notificationId: id, channel: options.channel, isSimulated: this.isSimulated, delivered: false, errorCode: 'INVALID_RECIPIENT', errorMessage: 'Notification recipient is required.' };
    if (!this.apiKey || this.isSimulated) return { success: false, messageId: id, notificationId: id, channel: options.channel, isSimulated: this.isSimulated, delivered: false, errorCode: 'CONFIGURATION_ERROR', errorMessage: 'Email API key is not configured for live delivery.' };
    return { success: false, messageId: id, notificationId: id, channel: options.channel, isSimulated: false, delivered: false, errorCode: 'PROVIDER_UNAVAILABLE', errorMessage: 'Live email transport is not configured in this build.' };
  }
}

/** A deliberately non-networking SMS adapter; never claims delivery without credentials. */
export class SmsProviderAdapter implements NotificationAdapter {
  public readonly providerName = 'TWILIO_SMS_PROVIDER';
  public readonly isSimulated: boolean;
  private accountSid?: string;
  private authToken?: string;
  constructor(accountSid?: string, authToken?: string, _fromNumber?: string | boolean, isSimulated = true) {
    this.accountSid = accountSid;
    this.authToken = authToken;
    this.isSimulated = isSimulated;
  }
  public async send(options: NotificationOptions): Promise<NotificationResult> {
    const id = `notif_${Date.now()}`;
    if (!options.recipient?.trim()) return { success: false, messageId: id, notificationId: id, channel: options.channel, isSimulated: this.isSimulated, delivered: false, errorCode: 'INVALID_RECIPIENT', errorMessage: 'Notification recipient is required.' };
    if (!this.accountSid || !this.authToken || this.isSimulated) return { success: false, messageId: id, notificationId: id, channel: options.channel, isSimulated: this.isSimulated, delivered: false, errorCode: 'CONFIGURATION_ERROR', errorMessage: 'SMS provider credentials are not configured for live delivery.' };
    return { success: false, messageId: id, notificationId: id, channel: options.channel, isSimulated: false, delivered: false, errorCode: 'PROVIDER_UNAVAILABLE', errorMessage: 'Live SMS transport is not configured in this build.' };
  }
}

export class NotificationAdapterFactory {
  private static overrideAdapter: NotificationAdapter | null = null;
  private static readonly mockAdapter = new MockNotificationAdapter();

  public static setAdapter(adapter: NotificationAdapter | null): void { this.overrideAdapter = adapter; }

  public static getAdapter(_channel: string): NotificationAdapter {
    return this.overrideAdapter || this.mockAdapter;
  }
}
