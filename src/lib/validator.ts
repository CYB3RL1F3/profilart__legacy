import err from "../err";
import { ProfileModel } from "model/profile";

export enum Services {
  create = "create",
  login = "login",
  charts = "charts",
  infos = "infos",
  events = "events",
  tracks = "tracks",
  releases = "releases",
  contact = "contact",
  newsfeed = "newsfeed"
}

export class Validator {
  checkProfile(profile: ProfileModel, query: Services) {
    if (!profile) {
      // bypass on account creation
      if (query === Services.create || query === Services.login) {
        return true;
      } else {
        throw err(404, "profile not found");
      }
    }
    if (
      query === Services.charts ||
      query === Services.infos ||
      query === Services.events
    ) {
      if (!profile.residentAdvisor) {
        throw err(400, "RA informations must be provided in database");
      }
      if (!profile.residentAdvisor.accessKey) {
        throw err(400, "RA accessKey must be provided in database");
      }
      if (!profile.residentAdvisor.userId) {
        throw err(400, "RA UserID must be provided in database");
      }
      if (!profile.residentAdvisor.DJID) {
        throw err(400, "RA DJID must be provided in database");
      }
    }
    if (query === Services.infos) {
      if (!profile.artistName) {
        throw err(400, "RA ArtistName must be provided in database");
      }
    }
    if (query === Services.tracks) {
      if (!profile.soundcloud.id) {
        throw err(400, "Soundcloud ID must be provided in database");
      }
    }
    if (
      query === Services.releases &&
      (!profile.discogs || (profile.discogs && !profile.discogs.artistId))
    ) {
      throw err(400, "Discogs informations must be provided in database");
    }
    if (query === Services.contact) {
      if (!profile.mailer) {
        throw err(400, "mailer informations must be provided");
      }

      if (!profile.mailer.recipient) {
        throw err(400, "recipient email must be defined in database");
      }

      if (!profile.mailer.prefix) {
        profile.mailer.prefix = "";
      }
    }
  }
}

export default Validator;
