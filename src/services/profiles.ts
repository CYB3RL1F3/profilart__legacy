import sanitize from "mongo-sanitize";
import { v4 as uuid } from "uuid";
import Service from "../service";
import err from "../err";
import Encrypter from "../lib/encrypter";
import Mailer from "../lib/mailer";
import Resolvers from "../lib/resolvers";
import {
  ProfileModel,
  AuthenticatedProfileModel,
  Credentials,
  AuthenticatedProfileResponseModel,
  UpdateProfileArgs,
  DeletedStatus
} from "model/profile";
import { Models } from "model/models";
import { ProfileData } from "../model/profile";
import Database from "lib/database";
import { Status } from "./contact";
import { BatchRunner } from 'services/batchRunner';

export class Profiles extends Service {
  profiles;
  sessions;
  encrypter: Encrypter;
  resolvers: Resolvers;

  get = async (uid: string): Promise<ProfileModel> => {
    const { content } = await this.database.select<ProfileModel>(
      uid,
      "profiles"
    );
    return content;
  };

  read = (profile: ProfileModel): AuthenticatedProfileResponseModel =>
    this.cleanResults(profile);

  getSessionToken = () => uuid();

  login = async (
    credentials: Credentials
  ): Promise<AuthenticatedProfileResponseModel> => {
    try {
      const { content } = await this.database.find<ProfileModel>(
        { "content.email": { $eq: sanitize(credentials.email) } },
        "profiles"
      );
      await this.encrypter.check(credentials.password, content.password);
      const authenticatedProfile: AuthenticatedProfileModel = {
        ...content,
        token: this.getSessionToken()
      };
      return this.cleanResults(authenticatedProfile);
    } catch (e) {
      throw err(400, "invalid password");
    }
  };

  forgottenPassword = async (
    args,
    credentials: Credentials
  ): Promise<Status> => {
    try {
      console.log(">>>>> ", credentials);
      const data = await this.database.find<ProfileModel>(
      { "content.email": {
        $eq: sanitize(credentials.email)
      } },
        Models.profiles
      );
      if (!data.content) throw err(400, "this email doesn't belongs to any profile");
      const profile = data.content;
      const newPassword: string = `${uuid().substring(0, 12)}!L`;
      const encryption = await this.encrypter.encrypt(newPassword);
      const security = {
        password: encryption.hash,
        encryption: encryption.encryption
      };
      const update: ProfileModel = Object.assign(profile, security);
      await this.persist<ProfileModel>(profile, Models.profiles, update);
      try {
        const sent = await this.sendPasswordByMail(newPassword, profile);
        if (!sent.error) {
          return {
            statusCode: 200,
            message: "password successfully sent by mail"
          };
        } else {
          throw err(500, "password couldn't have been sent properly")
        }
      } catch (e) {
        console.log(e);
        throw err(500, "impossible to send via mail. Configure your mailer...");
      }
    } catch(e) {
      throw err(400, e || "this email doesn't belongs to any profile");
    }
    
  };

  emailExists = async (email: string): Promise<boolean> => {
    try {
      const existingProfile = await this.database.find<ProfileModel>(
        { "content.email": 
          { 
            $eq: sanitize(email) 
          } 
        },
        Models.profiles
      );
    return !!existingProfile;
    } catch(e) {
      return false;
    }
  }

  isEmail = (email) =>
    /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/.test(
      email
    );

  isValid = (profile: UpdateProfileArgs | ProfileModel) =>
    profile &&
    profile.email &&
    this.isEmail(profile.email) &&
    (!profile.newPassword || (profile.newPassword && profile.password)) &&
    profile.artistName &&
    (!profile.residentAdvisor ||
      (profile.residentAdvisor &&
        profile.residentAdvisor.userId &&
        profile.residentAdvisor.accessKey &&
        profile.residentAdvisor.DJID)) &&
    (!profile.soundcloud || (profile.soundcloud && profile.soundcloud.url && (!profile.soundcloud.playlists || profile.soundcloud.playlists.length > 0))) &&
    (!profile.discogs || (profile.discogs && profile.discogs.url)) &&
    (!profile.mailer ||
      (profile.mailer &&
        profile.mailer.recipient &&
        this.isEmail(profile.mailer.recipient)));

  create = async (
    args: any,
    profile: ProfileModel
  ): Promise<AuthenticatedProfileResponseModel> => {
    profile = sanitize(profile);
    if (this.isValid(profile)) {
      const existingProfile = await this.emailExists(profile.email);
      if (existingProfile) {
        throw err(400, "email already exists in database");
      }
      profile = await this.resolvers.resolveProfile(profile);
      const uid: string = uuid().substring(0, 8);
      profile.uid = uid;
      const { hash, encryption } = await this.encrypter.encrypt(
        profile.password
      );
      profile.password = hash;
      profile.encryption = encryption;
      await this.persist<ProfileModel>({ uid }, Models.profiles, profile);
      this.sendConfirmationByMail(profile);
      try {
        this.batchRunner.reset(profile);
      } catch(e) {
        
      }
      return this.cleanResults(profile);
    } else {
      throw err(400, "invalid payload for profile creation");
    }
  };

  remove = async (profile: ProfileModel): Promise<DeletedStatus> => {
    await this.database.remove<ProfileModel>(profile.uid, Models.profiles);
    return {
      delete: profile.uid
    };
  };

  update = async (
    profile: ProfileModel,
    args: UpdateProfileArgs
  ): Promise<AuthenticatedProfileResponseModel> => {
    args = sanitize(args);
    if (this.isValid(args)) {
      if (args.uid !== profile.uid) {
        throw err(400, "You can't update an account that is not yours. Must send corresponding UID.");
      }
      if (args.email !== profile.email) {
        throw err(400, "You can't update an account that is not yours. Must send corresponding email.");
      }
      if (args.newEmail) {
        const existingProfile = await this.emailExists(args.newEmail);
        if (existingProfile) {
          throw err(400, "Email already exists in database");
        }
      }
      if (args.newPassword) {
        const isPasswordValid = await this.encrypter.check(
          args.password,
          profile.password
        );
        if (!isPasswordValid) {
          throw err(400, "Current password required to confirm setting a new one");
        }
      }

      let updatedProfile: ProfileModel;
      if (args.totalReplace) {
        delete args.totalReplace;
        const { uid, password, encryption, email } = profile;
        updatedProfile = Object.assign({}, this.replaceFields(args), {
          uid,
          password,
          encryption,
          email
        });
      } else {
        updatedProfile = Object.assign({}, profile, this.replaceFields(args));
      }
      updatedProfile = await this.resolvers.resolveProfile(updatedProfile);
      const { encryption, hash } = await this.encrypter.encrypt(
        updatedProfile.password
      );
      updatedProfile.password = hash;
      updatedProfile.encryption = encryption;
      const data = await this.persist<ProfileModel>(
        profile,
        Models.profiles,
        updatedProfile
      );
      if (data) {
        try {
          this.batchRunner.reset(updatedProfile);
        } catch(e) {
          console.log(e);
        }
        return this.cleanResults(updatedProfile);
      }
      else throw err(500, "A fatal error occured while persisting profile on the database");
    } else throw err(400, "Invalid payload sent for profile update");
  };

  cleanResults = (
    profile: AuthenticatedProfileModel | ProfileModel
  ): AuthenticatedProfileResponseModel => {
    const result = Object.assign({}, profile);
    delete result.password;
    delete result.encryption;
    return result;
  };

  replaceFields = (profile: UpdateProfileArgs): ProfileData => {
    // add new password
    delete profile.token;
    const keys = new Array("Email", "Password");
    keys.forEach((key) => {
      const newKey = `new${key}`;
      if (profile[newKey]) {
        profile[key.toLowerCase()] = profile[newKey];
        delete profile[newKey];
      }
    });
    if (!profile.residentAdvisor) profile.residentAdvisor = null;
    if (!profile.soundcloud) profile.soundcloud = null;
    if (!profile.mailer) profile.mailer = null;
    return profile;
  };

  sendConfirmationByMail(profile: ProfileModel) {
    if (!profile.mailer) return; // only works if a mailer's configured
    const mailer = new Mailer(profile);
    mailer.send("creation.html", {
      subject: `welcome on Profilart, ${profile.artistName}`,
      name: profile.artistName,
      email: profile.email,
      profile
    });
  }

  sendPasswordByMail(newPassword: string, profile: ProfileModel) {
    const mailer = new Mailer(profile);
    return mailer.send("password.html", {
      subject: `Your new password, ${profile.artistName}`,
      name: profile.artistName,
      email: profile.email,
      profile,
      newPassword
    });
  }

  constructor(database: Database, readonly batchRunner: BatchRunner) {
    super(database);
    this.encrypter = new Encrypter();
    this.resolvers = new Resolvers();
  }
}

export default Profiles;
