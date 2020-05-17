import { ChartsQueryArgs, ChartsModel } from "model/charts";
import {
  ProfileModel,
  AuthenticatedProfileResponseModel,
  UpdateProfileArgs,
  Credentials,
  DeletedStatus
} from "model/profile";
import { EventArgs, EventModel, EventByIdArgs } from "model/events";
import { InfosModel } from "model/infos";
import { Track, PlaylistArgs, PlaylistModel } from "model/playlist";
import { Release, ReleasesByIdArgs } from "model/releases";
import { AllServiceResults } from "model/all";
import { Status, ContactParams } from "services/contact";
import { TracksArgs } from "model/tracks";
import { Post, UpdatePost, DeletePost } from "model/timeline";
import { Request } from 'express';
import { SupportMessage } from "services/status";

export interface Services {
  public: {
    get: {
      charts: (
        profile: ProfileModel,
        args?: ChartsQueryArgs
      ) => Promise<ChartsModel[]>;
      events: (profile: ProfileModel, args: EventArgs) => Promise<EventModel[]>;
      event: (
        profile: ProfileModel,
        args: EventByIdArgs
      ) => Promise<EventModel>;
      infos: (profile: ProfileModel) => Promise<InfosModel>;
      tracks: (profile: ProfileModel) => Promise<Track[]>;
      track: (profile: ProfileModel, args: TracksArgs) => Promise<Track>;
      playlist: (
        profile: ProfileModel,
        args: PlaylistArgs
      ) => Promise<PlaylistModel>;
      releases: (profile: ProfileModel) => Promise<Release[]>;
      release: (
        profile: ProfileModel,
        args: ReleasesByIdArgs
      ) => Promise<Release>;
      posts: (profile: ProfileModel) => Promise<Post[]>;
      all: (profile: ProfileModel) => Promise<AllServiceResults>;
    };
    post: {
      create: (
        args: any,
        profile: ProfileModel
      ) => Promise<AuthenticatedProfileResponseModel>;
      login: (p, body, req) => any;
      support: (p: any, body: SupportMessage) => void;
    };
    patch: {
      password: (args, credentials: Credentials) => Promise<Status>;
    }
    uidPost: {
      contact: (profile: ProfileModel, args: ContactParams) => Promise<Status>;
    };
  };
  auth: {
    get: {
      profile: (profile: ProfileModel) => AuthenticatedProfileResponseModel;
      posts: (profile: ProfileModel) => Promise<Post[]>
    };
    post: {
      posts: (profile: ProfileModel, args: Post, req: Request) => Promise<Post>;
    };
    patch: {
      profile: (
        profile: ProfileModel,
        args: UpdateProfileArgs
      ) => Promise<AuthenticatedProfileResponseModel>;
      posts: (profile: ProfileModel, args: UpdatePost, req: Request) => Promise<Post>;
    };
    delete: { 
      profile: (profile: ProfileModel) => Promise<DeletedStatus> 
      "posts/:id": (profile: ProfileModel, args: DeletePost, req: Request) => Promise<any>
    };
  };
}
