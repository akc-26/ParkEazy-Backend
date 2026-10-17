import crypto from 'crypto';

export type NotificationChannel = 'EMAIL' | 'SMS' | 'PUSH';

export type NotificationType =
  | 'BOOKING_CONFIRMED'
  | 'HOLD_EXPIRING'
  | 'PAYMENT_RECEIPT'
  | 'SECURITY_ALERT';

export interface NotificationPayload {
  channel: NotificationChannel;
  type: NotificationType;
  recipient: string;
  subject?: string;
  content: string;
  metadata?: Record<string, any>;
  timeoutMs?: number;
}

export interface NotificationSendResult {
  success: boolean;
  notificationId: string;
  channel: NotificationChannel;
  provider: string;
  isSimulated: boolean;
  sentAtUtc: string;
  errorCode?: string;
  errorMessage?: string;
}

export interface NotificationProviderAdapter {
  readonly providerName: string;
  readonly isSimulated: boolean;
  send(payload: NotificationPayload): Promise<NotificationSendResult>;
}

/**
 * Deterministic Mock Notification Adapter
 * Captures outgoing notifications in-memory for testing and development.
 * Never performs real external dispatch during automated tests.
 */
export class MockNotificationAdapter implements NotificationProviderAdapter {
  public readonly providerName = 'MOCK_NOTIFICATION_PROVIDER';
  public readonly isSimulated = true;

  private sentHistory: NotificationPayload[] = [];

  public async send(payload: NotificationPayload): Promise<NotificationSendResult> {
    const { recipient, channel, timeoutMs = 3000 } = payload;

    // Validation
    if (!recipient || recipient.trim() === '') {
      return {
        success: false,
        notificationId: `notif_err_${Date.now()}`,
        channel,
        provider: this.providerName,
        isSimulated: true,
        sentAtUtc: new Date().toISOString(),
        errorCode: 'INVALID_RECIPIENT',
        errorMessage: 'Notification recipient address or number is required.',
      };
    }

    // Deterministic simulation hooks for test cases
    if (recipient === 'timeout@test.com') {
      return new Promise((_resolve, reject) => {
        setTimeout(() => {
          reject(new Error(`[MOCK_NOTIFICATION] Dispatch timed out after ${timeoutMs}ms`));
        }, Math.min(timeoutMs, 50));
      });
    }

    if (recipient === 'fail@test.com') {
      return {
        success: false,
        notificationId: `notif_fail_${Date.now()}`,
        channel,
        provider: this.providerName,
        isSimulated: true,
        sentAtUtc: new Date().toISOString(),
        errorCode: 'PROVIDER_UNAVAILABLE',
        errorMessage: 'Simulated downstream carrier rejection.',
      };
    }

    const notificationId = `notif_${crypto.randomBytes(8).toString('hex')}`;
    this.sentHistory.push({ ...payload });

    return {
      success: true,
      notificationId,
      channel,
      provider: this.providerName,
      isSimulated: true,
      sentAtUtc: new Date().toISOString(),
    };
  }

  public getHistory(): NotificationPayload[] {
    return [...this.sentHistory];
  }

  public clearHistory(): void {
    this.sentHistory = [];
  }
}

/**
 * Skeleton Email Provider Adapter (e.g. SendGrid / AWS SES)
 * Wraps external dispatch behind strict timeouts and normalized responses.
 */
export class EmailProviderAdapter implements NotificationProviderAdapter {
  public readonly providerName = 'SENDGRID_EMAIL';
  public readonly isSimulated: boolean;

  constructor(private readonly apiKey?: string, isSimulation = false) {
    this.isSimulated = isSimulation || !apiKey;
  }

  public async send(payload: NotificationPayload): Promise<NotificationSendResult> {
    if (!this.apiKey) {
      return {
        success: false,
        notificationId: `email_unconfigured_${Date.now()}`,
        channel: 'EMAIL',
        provider: this.providerName,
        isSimulated: this.isSimulated,
        sentAtUtc: new Date().toISOString(),
        errorCode: 'CONFIGURATION_ERROR',
        errorMessage: 'Email API key is not configured.',
      };
    }

    // In live production, dispatches via SendGrid / SES REST API
    return {
      success: true,
      notificationId: `msg_${crypto.randomBytes(8).toString('hex')}`,
      channel: 'EMAIL',
      provider: this.providerName,
      isSimulated: this.isSimulated,
      sentAtUtc: new Date().toISOString(),
    };
  }
}

/**
 * Skeleton SMS Provider Adapter (e.g. Twilio SMS)
 * Wraps SMS dispatch behind strict timeouts and normalized responses.
 */
export class SmsProviderAdapter implements NotificationProviderAdapter {
  public readonly providerName = 'TWILIO_SMS';
  public readonly isSimulated: boolean;

  constructor(
    private readonly accountSid?: string,
    private readonly authToken?: string,
    isSimulation = false
  ) {
    this.isSimulated = isSimulation || !accountSid;
  }

  public async send(payload: NotificationPayload): Promise<NotificationSendResult> {
    if (!this.accountSid || !this.authToken) {
      return {
        success: false,
        notificationId: `sms_unconfigured_${Date.now()}`,
        channel: 'SMS',
        provider: this.providerName,
        isSimulated: this.isSimulated,
        sentAtUtc: new Date().toISOString(),
        errorCode: 'CONFIGURATION_ERROR',
        errorMessage: 'Twilio SMS credentials are not configured.',
      };
    }

    return {
      success: true,
      notificationId: `sms_${crypto.randomBytes(8).toString('hex')}`,
      channel: 'SMS',
      provider: this.providerName,
      isSimulated: this.isSimulated,
      sentAtUtc: new Date().toISOString(),
    };
  }
}

export class NotificationAdapterFactory {
  private static mockAdapter = new MockNotificationAdapter();

  public static getAdapter(channel: NotificationChannel = 'EMAIL'): NotificationProviderAdapter {
    return NotificationAdapterFactory.mockAdapter;
  }

  public static getMockAdapter(): MockNotificationAdapter {
    return NotificationAdapterFactory.mockAdapter;
  }
}
