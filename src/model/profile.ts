import { Data } from "lib/database/database.d";

export interface Encryption {
  N: number;
  r: number;
  p: number;
}

export interface ResidentAdvisorProfile {
  DJID: string;
  accessKey: string;
  userId: string;
}

export interface SoundcloudProfile {
  id: string;
  url: string;
  clientId: string;
  clientSecret: string;
  playlists?: string[];
}

export interface DiscogsProfile {
  artistId: number;
  url: string;
}

export interface MailerProfile {
  use: string;
  recipient: string;
  prefix: string;
  mailgun: {
    email: string;
    user: string;
    endpoint: string;
  };
}

export interface SecurityProfileData {
  password: string;
  encryption: Encryption;
}

export interface ProfileData {
  artistName: string;
  uid: string;
  residentAdvisor?: ResidentAdvisorProfile;
  soundcloud?: SoundcloudProfile;
  discogs?: DiscogsProfile;
  mailer?: MailerProfile;
}

export interface ProfileModel extends ProfileData, SecurityProfileData {
  email: string;
  newPassword?: string;
  cache?: {
    use: boolean;
    ttl: {
      [service: string]: number;
    };
  };
}

export interface AuthenticatedProfileModel extends ProfileModel {
  token?: string;
}

export type AuthenticatedProfileResponseModel = Omit<
  Omit<AuthenticatedProfileModel, "password">,
  "encryption"
>;

export interface Credentials {
  email: string;
  password: string;
}

export type Profile = Data<ProfileModel>;

export interface UpdateProfileArgs extends ProfileData {
  password?: string;
  newPassword?: string;
  email?: string;
  newEmail?: string;
  totalReplace?: boolean;
  token?: boolean;
}

export interface DeletedStatus {
  delete: string;
}
