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

    const endpoint = process.env.SENDGRID_API_URL || 'https://api.sendgrid.com/v3/mail/send';
    const fromEmail = process.env.SENDGRID_FROM_EMAIL || process.env.EMAIL_FROM;
    if (!fromEmail) {
      return { success: false, notificationId: `email_unconfigured_${Date.now()}`, channel: 'EMAIL', provider: this.providerName, isSimulated: false, sentAtUtc: new Date().toISOString(), errorCode: 'CONFIGURATION_ERROR', errorMessage: 'SENDGRID_FROM_EMAIL (or EMAIL_FROM) is not configured.' };
    }
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { Authorization: `Bearer ${this.apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ personalizations: [{ to: [{ email: payload.recipient }] }], from: { email: fromEmail }, subject: payload.subject || 'ParkEazy notification', content: [{ type: 'text/plain', value: payload.content }] }),
        signal: AbortSignal.timeout(payload.timeoutMs || 8000),
      });
      if (!response.ok) {
        const providerBody = (await response.text()).slice(0, 500);
        return { success: false, notificationId: `email_rejected_${Date.now()}`, channel: 'EMAIL', provider: this.providerName, isSimulated: false, sentAtUtc: new Date().toISOString(), errorCode: `PROVIDER_HTTP_${response.status}`, errorMessage: `Email provider rejected the request (HTTP ${response.status}): ${providerBody}` };
      }
      return { success: true, notificationId: response.headers.get('x-message-id') || `sendgrid_accepted_${Date.now()}`, channel: 'EMAIL', provider: this.providerName, isSimulated: false, sentAtUtc: new Date().toISOString() };
    } catch (error: any) {
      return { success: false, notificationId: `email_error_${Date.now()}`, channel: 'EMAIL', provider: this.providerName, isSimulated: false, sentAtUtc: new Date().toISOString(), errorCode: 'PROVIDER_REQUEST_FAILED', errorMessage: error?.name === 'TimeoutError' ? 'Email provider request timed out.' : 'Email provider request failed.' };
    }
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

    const fromNumber = process.env.TWILIO_FROM_NUMBER;
    if (!fromNumber) {
      return { success: false, notificationId: `sms_unconfigured_${Date.now()}`, channel: 'SMS', provider: this.providerName, isSimulated: false, sentAtUtc: new Date().toISOString(), errorCode: 'CONFIGURATION_ERROR', errorMessage: 'TWILIO_FROM_NUMBER is not configured.' };
    }
    try {
      const credentials = Buffer.from(`${this.accountSid}:${this.authToken}`).toString('base64');
      const body = new URLSearchParams({ To: payload.recipient, From: fromNumber, Body: payload.content });
      const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(this.accountSid)}/Messages.json`, {
        method: 'POST', headers: { Authorization: `Basic ${credentials}`, 'Content-Type': 'application/x-www-form-urlencoded' },
        body, signal: AbortSignal.timeout(payload.timeoutMs || 8000),
      });
      const result: any = await response.json().catch(() => ({}));
      if (!response.ok) {
        return { success: false, notificationId: `sms_rejected_${Date.now()}`, channel: 'SMS', provider: this.providerName, isSimulated: false, sentAtUtc: new Date().toISOString(), errorCode: `PROVIDER_HTTP_${response.status}`, errorMessage: `SMS provider rejected the request (HTTP ${response.status}).` };
      }
      return { success: true, notificationId: String(result.sid || `twilio_accepted_${Date.now()}`), channel: 'SMS', provider: this.providerName, isSimulated: false, sentAtUtc: new Date().toISOString() };
    } catch (error: any) {
      return { success: false, notificationId: `sms_error_${Date.now()}`, channel: 'SMS', provider: this.providerName, isSimulated: false, sentAtUtc: new Date().toISOString(), errorCode: 'PROVIDER_REQUEST_FAILED', errorMessage: error?.name === 'TimeoutError' ? 'SMS provider request timed out.' : 'SMS provider request failed.' };
    }
  }
}

export class NotificationAdapterFactory {
  private static customAdapter: NotificationProviderAdapter | null = null;
  private static mockAdapter = new MockNotificationAdapter();

  public static setAdapter(adapter: NotificationProviderAdapter | null): void {
    NotificationAdapterFactory.customAdapter = adapter;
  }

  public static getAdapter(channel: NotificationChannel = 'EMAIL'): NotificationProviderAdapter {
    if (NotificationAdapterFactory.customAdapter) {
      return NotificationAdapterFactory.customAdapter;
    }

    const emailApiKey = process.env.SENDGRID_API_KEY || process.env.EMAIL_API_KEY;
    const twilioSid = process.env.TWILIO_ACCOUNT_SID;
    const twilioAuth = process.env.TWILIO_AUTH_TOKEN;

    if (channel === 'EMAIL' && emailApiKey) {
      return new EmailProviderAdapter(emailApiKey, false);
    }

    if (channel === 'SMS' && twilioSid && twilioAuth) {
      return new SmsProviderAdapter(twilioSid, twilioAuth, false);
    }

    // In production without credentials, return unconfigured adapter
    if (process.env.NODE_ENV === 'production') {
      if (channel === 'EMAIL') {
        return new EmailProviderAdapter(undefined, false);
      }
      return new SmsProviderAdapter(undefined, undefined, false);
    }

    return NotificationAdapterFactory.mockAdapter;
  }

  public static getMockAdapter(): MockNotificationAdapter {
    return NotificationAdapterFactory.mockAdapter;
  }
}

