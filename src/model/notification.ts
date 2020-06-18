export interface Notification {
  message: string;
  date: string;
  sent: boolean;
}

export interface SubscriptionKeys {
  auth: string;
  p256dh: string;
};

export interface SubscriptionArgs extends SubscriptionKeys {
  id: string;
  endpoint: string;
}

export interface Params<T> {
  params: T
}

export interface Subscription {
  keys: SubscriptionKeys;
  endpoint: string;
}

export interface NotificationCenterArgs {
  email: string;
  gcmApiKey: string;
  website: string;
}

export interface NotificationCenter extends NotificationCenterArgs {
  id?: string;
  publicKey: string;
  privateKey: string;
  subscriptions: Subscription[];
  notifications: Notification[];
}

export interface SubscriptionConfirmed {
  subscribed: boolean;
}

export interface NotificationArgs {
  content: string;
  id: string;
}