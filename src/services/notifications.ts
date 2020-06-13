import Service from "service";
import err from "err";
import Database from "lib/database";
import { ProfileModel } from "model/profile";
import { NotificationCenter } from "model/notification";
import { Models } from "model/models";
// import webpush from "web-push";

export class Notifications extends Service {
  constructor(database: Database) {
    super(database);
  }
  getNotificationCenters = async (profile: ProfileModel) => {
    try {
      const { content } = await this.fromDb<NotificationCenter>(profile, Models.notifications);
      return content;
    } catch(e) {
      throw err(404, "no notifications found");
    }
  }

  generateNotificationCenter = () => {
    // const vapidKeys = webpush.generateVAPIDKeys();
    return null;
  }
  addNotificationCenter = async (profile: ProfileModel) => {
    
    let notifications;
    try {
      notifications = this.getNotificationCenters(profile);
    } catch(e) {
      notifications = [];
    }
    const generatedNotificationCenter = this.generateNotificationCenter();
    notifications.push(generatedNotificationCenter);
  }
  updateNotificationCenter = (profile: ProfileModel, args) => {

  }
  pushNotificationToCenter = (profile: ProfileModel, args) => {

  }
}