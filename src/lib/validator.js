import err from "../err";

export class Validator {
  checkProfile(profile, query) {
    if (!profile) {
      // bypass on account creation
      if (query === "create" || query === "login") {
        return true;
      } else {
        throw err("404", "profile not found");
      }
    }
    if (query === "charts" || query === "infos" || query === "events") {
      if (!profile.RA) {
        throw err("400", "RA informations must be provided in database");
      }
      if (!profile.RA.accessKey) {
        throw err("400", "RA accessKey must be provided in database");
      }
      if (!profile.RA.userId) {
        throw err("400", "RA UserID must be provided in database");
      }
      if (!profile.RA.DJID) {
        throw err("400", "RA DJID must be provided in database");
      }
    }
    if (query === "infos") {
      if (!profile.artistName) {
        throw err("400", "RA ArtistName must be provided in database");
      }
    }
    if (query === "tracks") {
      if (!profile.soundcloud.id) {
        throw err("400", "Soundcloud ID must be provided in database");
      }
    }
    if (
      query === "releases" &&
      (!profile.discogs || (profile.discogs && !profile.discogs.artistId))
    ) {
      throw err("400", "Discogs informations must be provided in database");
    }
    if (query === "contact") {
      if (!profile.mailer) {
        throw err("400", "mailer informations must be provided");
      }

      if (!profile.mailer.recipient) {
        throw err("400", "recipient email must be defined in database");
      }

      if (!profile.mailer.prefix) {
        profile.mailer.prefix = "";
      }
    }
  }
}

export default Validator;
