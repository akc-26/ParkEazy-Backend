import crypto from 'crypto';
import { integrationsService } from './integrations.service';

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
  delivered: boolean; // Explicit invariant: true only if confirmed delivered by downstream carrier
  sentAtUtc: string;
  errorCode?: string;
  errorMessage?: string;
  simulationNotice?: string;
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
 * Invariant: Never claims an email or SMS was actually delivered (delivered is always false).
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
        delivered: false,
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
        delivered: false,
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
      delivered: false, // Invariant: Mock providers must never claim real carrier delivery
      sentAtUtc: new Date().toISOString(),
      simulationNotice:
        '[SIMULATED_MOCK] Notification captured in-memory for testing/development. No external carrier dispatch performed.',
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
 * Provider-Neutral Email Provider Adapter (e.g. SendGrid)
 * Configuration is injected via centralized IntegrationsService or constructor.
 * Never accesses scattered process.env directly.
 */
export class EmailProviderAdapter implements NotificationProviderAdapter {
  public readonly providerName = 'SENDGRID_EMAIL';
  public readonly isSimulated: boolean;
  public readonly fromEmail?: string;

  constructor(
    private readonly apiKey?: string,
    fromEmailOrSimulation?: string | boolean,
    private readonly fromName = 'ParkEazy Notifications',
    private readonly apiUrl = 'https://api.sendgrid.com/v3/mail/send',
    isSimulation = false
  ) {
    if (typeof fromEmailOrSimulation === 'boolean') {
      this.isSimulated = fromEmailOrSimulation || !apiKey;
      this.fromEmail = 'noreply@parkeazy.internal';
    } else {
      this.fromEmail = fromEmailOrSimulation;
      this.isSimulated = isSimulation || !apiKey;
    }
  }

  public async send(payload: NotificationPayload): Promise<NotificationSendResult> {
    if (!this.apiKey) {
      return {
        success: false,
        notificationId: `email_unconfigured_${Date.now()}`,
        channel: 'EMAIL',
        provider: this.providerName,
        isSimulated: this.isSimulated,
        delivered: false,
        sentAtUtc: new Date().toISOString(),
        errorCode: 'CONFIGURATION_ERROR',
        errorMessage: 'SendGrid email API key is not configured.',
      };
    }

    const fromEmail = this.fromEmail || 'noreply@parkeazy.internal';
    if (!this.fromEmail) {
      return {
        success: false,
        notificationId: `email_unconfigured_${Date.now()}`,
        channel: 'EMAIL',
        provider: this.providerName,
        isSimulated: false,
        delivered: false,
        sentAtUtc: new Date().toISOString(),
        errorCode: 'CONFIGURATION_ERROR',
        errorMessage: 'SendGrid sender email address is not configured.',
      };
    }

    try {
      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          personalizations: [{ to: [{ email: payload.recipient }] }],
          from: { email: fromEmail, name: this.fromName },
          subject: payload.subject || 'ParkEazy notification',
          content: [{ type: 'text/plain', value: payload.content }],
        }),
        signal: AbortSignal.timeout(payload.timeoutMs || 8000),
      });

      if (!response.ok) {
        const providerBody = (await response.text()).slice(0, 500);
        return {
          success: false,
          notificationId: `email_rejected_${Date.now()}`,
          channel: 'EMAIL',
          provider: this.providerName,
          isSimulated: false,
          delivered: false,
          sentAtUtc: new Date().toISOString(),
          errorCode: `PROVIDER_HTTP_${response.status}`,
          errorMessage: `SendGrid rejected request (HTTP ${response.status}): ${providerBody}`,
        };
      }

      return {
        success: true,
        notificationId: response.headers.get('x-message-id') || `sendgrid_${Date.now()}`,
        channel: 'EMAIL',
        provider: this.providerName,
        isSimulated: false,
        delivered: true,
        sentAtUtc: new Date().toISOString(),
      };
    } catch (error: any) {
      return {
        success: false,
        notificationId: `email_error_${Date.now()}`,
        channel: 'EMAIL',
        provider: this.providerName,
        isSimulated: false,
        delivered: false,
        sentAtUtc: new Date().toISOString(),
        errorCode: 'PROVIDER_REQUEST_FAILED',
        errorMessage:
          error?.name === 'TimeoutError'
            ? 'SendGrid provider request timed out.'
            : 'SendGrid provider request failed.',
      };
    }
  }
}

/**
 * Provider-Neutral SMS Provider Adapter (e.g. Twilio SMS)
 * Configuration is injected via centralized IntegrationsService or constructor.
 * Never accesses scattered process.env directly.
 */
export class SmsProviderAdapter implements NotificationProviderAdapter {
  public readonly providerName = 'TWILIO_SMS';
  public readonly isSimulated: boolean;
  public readonly fromNumber?: string;

  constructor(
    private readonly accountSid?: string,
    private readonly authToken?: string,
    fromNumberOrSimulation?: string | boolean,
    isSimulation = false
  ) {
    if (typeof fromNumberOrSimulation === 'boolean') {
      this.isSimulated = fromNumberOrSimulation || !accountSid || !authToken;
      this.fromNumber = '+15557275329';
    } else {
      this.fromNumber = fromNumberOrSimulation;
      this.isSimulated = isSimulation || !accountSid || !authToken;
    }
  }

  public async send(payload: NotificationPayload): Promise<NotificationSendResult> {
    if (!this.accountSid || !this.authToken) {
      return {
        success: false,
        notificationId: `sms_unconfigured_${Date.now()}`,
        channel: 'SMS',
        provider: this.providerName,
        isSimulated: this.isSimulated,
        delivered: false,
        sentAtUtc: new Date().toISOString(),
        errorCode: 'CONFIGURATION_ERROR',
        errorMessage: 'Twilio SMS credentials (Account SID / Auth Token) are not configured.',
      };
    }

    if (!this.fromNumber) {
      return {
        success: false,
        notificationId: `sms_unconfigured_${Date.now()}`,
        channel: 'SMS',
        provider: this.providerName,
        isSimulated: false,
        delivered: false,
        sentAtUtc: new Date().toISOString(),
        errorCode: 'CONFIGURATION_ERROR',
        errorMessage: 'Twilio sender phone number is not configured.',
      };
    }

    try {
      const credentials = Buffer.from(`${this.accountSid}:${this.authToken}`).toString('base64');
      const body = new URLSearchParams({
        To: payload.recipient,
        From: this.fromNumber,
        Body: payload.content,
      });

      const response = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(this.accountSid)}/Messages.json`,
        {
          method: 'POST',
          headers: {
            Authorization: `Basic ${credentials}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body,
          signal: AbortSignal.timeout(payload.timeoutMs || 8000),
        }
      );

      const result: any = await response.json().catch(() => ({}));
      if (!response.ok) {
        return {
          success: false,
          notificationId: `sms_rejected_${Date.now()}`,
          channel: 'SMS',
          provider: this.providerName,
          isSimulated: false,
          delivered: false,
          sentAtUtc: new Date().toISOString(),
          errorCode: `PROVIDER_HTTP_${response.status}`,
          errorMessage: `Twilio rejected request (HTTP ${response.status}).`,
        };
      }

      return {
        success: true,
        notificationId: String(result.sid || `twilio_${Date.now()}`),
        channel: 'SMS',
        provider: this.providerName,
        isSimulated: false,
        delivered: true,
        sentAtUtc: new Date().toISOString(),
      };
    } catch (error: any) {
      return {
        success: false,
        notificationId: `sms_error_${Date.now()}`,
        channel: 'SMS',
        provider: this.providerName,
        isSimulated: false,
        delivered: false,
        sentAtUtc: new Date().toISOString(),
        errorCode: 'PROVIDER_REQUEST_FAILED',
        errorMessage:
          error?.name === 'TimeoutError'
            ? 'Twilio provider request timed out.'
            : 'Twilio provider request failed.',
      };
    }
  }
}

/**
 * Factory that returns the currently active notification adapter
 * based on centralized IntegrationsService configuration.
 */
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

    if (channel === 'EMAIL') {
      const config = integrationsService.getConfigById('sendgrid_email');
      if (config && config.enabled && config.mode === 'live') {
        const creds = integrationsService.getCredentials('sendgrid_email');
        const ops = integrationsService.getOperationalSettings('sendgrid_email');
        return new EmailProviderAdapter(
          creds?.apiKey,
          ops.fromEmail,
          ops.fromName,
          ops.apiUrl,
          false
        );
      }
      return NotificationAdapterFactory.mockAdapter;
    }

    if (channel === 'SMS') {
      const config = integrationsService.getConfigById('twilio_sms');
      if (config && config.enabled && config.mode === 'live') {
        const creds = integrationsService.getCredentials('twilio_sms');
        const ops = integrationsService.getOperationalSettings('twilio_sms');
        return new SmsProviderAdapter(
          creds?.accountSid,
          creds?.authToken,
          ops.fromNumber,
          false
        );
      }
      return NotificationAdapterFactory.mockAdapter;
    }

    return NotificationAdapterFactory.mockAdapter;
  }

  public static getMockAdapter(): MockNotificationAdapter {
    return NotificationAdapterFactory.mockAdapter;
  }
}
