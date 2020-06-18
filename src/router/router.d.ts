import Contact from "services/contact";
import { Notifications } from 'services/notifications';
import ResidentAdvisor from "services/residentadvisor";
import Soundcloud from 'services/soundcloud';
import Discogs from 'services/discogs';
import { Timeline } from 'services/timeline';
import All from 'services/all';
import Profiles from 'services/profiles';
import Status from 'services/status';
import { BatchRunner } from 'services/batchRunner';
import { Credentials } from '../model/profile';

export interface Services {
  public: {
    get: {
      charts: ResidentAdvisor["getCharts"];
      events: ResidentAdvisor["getEvents"];
      event: ResidentAdvisor["getEventById"];
      infos: ResidentAdvisor["getInfos"];
      tracks: Soundcloud["getTracks"];
      track: Soundcloud["getTrack"];
      playlist: Soundcloud["getPlaylist"];
      releases: Discogs["getReleases"];
      release: Discogs["getReleaseById"];
      posts: Timeline["getPublishedPosts"];
      all: All["get"];
    };
    post: {
      create: Profiles["create"];
      login: (p, body: Credentials, req: Express.Request) => Promise<any>;
      support: Status["contactSupport"];
    };
    patch: {
      password: Profiles["forgottenPassword"];
    }
    uidPost: {
      contact: Contact["mail"];
      subscribe: Notifications["subscribe"];
    };
  };
  auth: {
    get: {
      profile: Profiles["read"];
      posts: Timeline["getPosts"];
      reset: BatchRunner["reset"];
      notificationCenters: Notifications["getNotificationCenters"]
    };
    post: {
      posts: Timeline["addPost"];
      notificationCenter: Notifications["addNotificationCenter"];
      notify: Notifications["pushNotificationToCenter"];
    };
    patch: {
      profile: Profiles["update"];
      posts: Timeline["editPost"];
      notificationCenter: Notifications["updateNotificationCenter"];
    };
    delete: { 
      profile: Profiles["remove"];
      "posts/:id": Timeline["deletePost"];
      "notificationCenters/:id": Notifications["deleteNotificationCenter"];
    };
  };
}
