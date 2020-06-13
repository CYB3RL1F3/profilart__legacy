export interface Notification {
  message: string;
  date: string;
  sent: boolean;
}
export interface NotificationCenter {
  id: string;
  subscription: string;
  apiKey: string;
  secretKey: string;
  notifications: Notification[];
}