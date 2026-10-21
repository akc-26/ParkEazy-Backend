export interface NotificationOptions {
  channel: 'EMAIL' | 'SMS' | 'PUSH';
  type: string;
  recipient: string;
  subject?: string;
  message?: string;
  html?: string;
}

export interface NotificationResult {
  success: boolean;
  messageId: string;
}

export class NotificationAdapterFactory {
  public static getAdapter(channel: string) {
    return {
      send: async (options: NotificationOptions): Promise<NotificationResult> => {
        return {
          success: true,
          messageId: `sim_notif_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
        };
      }
    };
  }
}
