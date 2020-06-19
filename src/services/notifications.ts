import Service from "service";
import err from "err";
import Database from "lib/database";
import { ProfileModel } from "model/profile";
import { NotificationCenter, NotificationCenterArgs, SubscriptionArgs, SubscriptionConfirmed, NotificationArgs, Params } from "model/notification";
import { Models } from "model/models";
import webpush from "web-push";
import uuid from "uuid/v4";
import { withScope, captureException } from "@sentry/node";

export class Notifications extends Service {
  constructor(database: Database) {
    super(database);
  }
  getNotificationCenters = async (profile: ProfileModel): Promise<NotificationCenter[]> => {
    try {
      const { content } = await this.fromDb<NotificationCenter[]>(profile, Models.notifications);
      return content;
    } catch(e) {
      return [];
    }
  }

  getNotificationCenterById = async (profile: ProfileModel, id: string) => {
    const notifications = await this.getNotificationCenters(profile);
    return notifications.find(n => n.id === id);
  }

  createNotificationCenter = ({ email, gcmApiKey, website }): NotificationCenter => {
    const { publicKey, privateKey } = webpush.generateVAPIDKeys();

    return {
      id: uuid(),
      website,
      gcmApiKey,
      email,
      publicKey,
      privateKey,
      subscriptions: [],
      notifications: []
    }
  }

  addNotificationCenter = async (profile: ProfileModel, args: NotificationCenterArgs) => {
    
    let notifications: NotificationCenter[];
    try {
      notifications = await this.getNotificationCenters(profile);
    } catch(e) {
      notifications = [];
    }
    if (!args.email || !args.gcmApiKey) throw err(400, "invalid args. missing email && firebase key");
    const generatedNotificationCenter = this.createNotificationCenter(args);
    
    notifications.push(generatedNotificationCenter);
    await this.persist(profile, Models.notifications, notifications);
    return notifications;
  }

  updateNotificationCenter = async (profile: ProfileModel, args) => {
    if (!args.id) throw err(400, "ID required");

    let notifications: NotificationCenter[];
    try {
      notifications = await this.getNotificationCenters(profile);
    } catch(e) {
      notifications = [];
    }
    const i: number = notifications.findIndex(n => n.id === args.id);
    if (i > -1) {
      let notificationCenter: NotificationCenter = notifications[i];
      if (!notificationCenter) throw err(404, "notification center not found");
      notificationCenter = {
        ...notificationCenter,
        ...args
      };
      
      notifications[i] = notificationCenter;
      await this.persist(profile, Models.notifications, notifications);
      return notifications;
    } else throw err(404, "notification center not found");
  }

  deleteNotificationCenter = async (profile: ProfileModel, args) => {
    if (!args.id) throw err(400, "ID required");
    try {
      let notifications = await this.getNotificationCenters(profile);
      notifications = notifications.filter(n => n.id !== args.id);
      await this.persist(profile, Models.notifications, notifications);
      console.log(notifications);
      return notifications;
    } catch(e) {
      console.log(e);
      throw err(404, `impossible to remove notification center with ID ${args.id}`)
    }
  }

  subscribe = async (profile: ProfileModel, args: Params<SubscriptionArgs>): Promise<SubscriptionConfirmed> => {
    console.log('==========');
    console.log(args);
    console.log('==========');
    if (!args.params || !args.params.id || !args.params.endpoint || !args.params.auth || !args.params.p256dh) throw err(400, "invalid subscription payload");
    const { endpoint, auth, p256dh, id } = args.params;
    try {
      const notifications = await this.getNotificationCenters(profile);
      const notificationCenter = notifications.find(n => n.id === id);
      if (!notificationCenter) throw err(404, "impossible to subscribe to unexisting notification center");
      const i = notificationCenter.subscriptions.findIndex(s => s.endpoint === endpoint);
      const subscription = {
        endpoint,
        keys: {
          auth,
          p256dh
        }
      };
      if (i === -1) {
        notificationCenter.subscriptions.push(subscription);
      } else {
        notificationCenter.subscriptions[i] = subscription;
      }
      this.persist(profile, Models.notifications, notifications);
      return {
        subscribed: true
      }
    } catch(e) {
      console.log(e);
      throw err(400, "impossible to subscribe to this channel");
    }
  }

  pushNotificationToCenter = async (profile: ProfileModel, args: NotificationArgs) => {
    if (!args.id || !args.content) throw err(400, "invalid payload");
    const notifications = await this.getNotificationCenters(profile);
    const i = notifications.findIndex(n => n.id === args.id);
    const notificationCenter = i > -1 ? notifications[i] : null;
    if (!notificationCenter) throw err(404, "notification center not found");
    
    webpush.setGCMAPIKey(notificationCenter.gcmApiKey);
    webpush.setVapidDetails(
      `mailto:${notificationCenter.email}`,
      notificationCenter.publicKey,
      notificationCenter.privateKey
    );
    
    /*
    const options = {
      gcmAPIKey: notificationCenter.gcmApiKey,
      vapidDetails: {
        subject: notificationCenter.website, // `mailto:${notificationCenter.email}`,
        publicKey: notificationCenter.publicKey,
        privateKey: notificationCenter.privateKey
      },
      // TTL: 80 * 24 * 60 * 60 * 1000,
      // ContentEncoding: 'aes128gcm',
    }
    */
    try {
      let unsubscribedOrunavailables = [];
      const subscriptions = await Promise.all(notificationCenter.subscriptions.map(async (subscription, j) =>
        {
          try {
            const res = await webpush.sendNotification(subscription, JSON.stringify({
              content: args.content,
              title: args.title,
              action: args.action
            }));
            return res;
          } catch(e) {
            if (e.statusCode.toString() === "410") {
              unsubscribedOrunavailables.push(j);
              return Promise.resolve();
            } else throw e;
          }
        }
      ));
      const sent = !(subscriptions.filter(n => !n).length);
      const now = new Date();
      const date = now.toUTCString();
      notificationCenter.notifications.push({
        message: args.content,
        title: args.title,
        action: args.action,
        date,
        sent
      });
      unsubscribedOrunavailables.forEach((j) => {
        delete notificationCenter.subscriptions[j];
      })
      notificationCenter.subscriptions = notificationCenter.subscriptions.filter(n => !!n);
      notifications[i] = notificationCenter;
      this.persist(profile, Models.notifications, notifications);
      return notifications;
    } catch(e) {
      console.log(e);
      withScope((scope) => {
        scope.setExtra("notify!", e);
        captureException(e);
      });
      throw err(500, "technical error happened while pushing");
    }
  }
}