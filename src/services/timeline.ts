import Service from "service";
import Database from "lib/database";
import { ProfileModel } from 'model/profile';
import config from "config";
import { Options } from "request";
import { Post, UpdatePost } from "model/timeline";
import err from "err";
import { Request } from "express";
import { DeletePost } from '../model/timeline';
import { withScope, captureException } from "@sentry/node";

enum HTTPMethod {
  POST = "post",
  GET = "get",
  PATCH = "patch",
  DELETE = "delete"
}

export class Timeline extends Service {
  constructor(database: Database) {
    super(database);
  }

  query = async <Result, Payload = any>(method: HTTPMethod, endpoint: string, payload?: Payload, token?: string): Promise<Result> => {
    const options: Options = {
      url: `${config.api.timeline.url}/${endpoint}`,
      method,
      headers: {
        "User-Agent": config.userAgent,
        "Content-Type": "application/json",
      }
    };
    if (token) options.headers.Authorization = token;
    if (payload) options.body = JSON.stringify(payload);
    try {
      return await this.api.requestAndParseJSON<Result>(options);
    } catch(e) {
      console.log(e);
      withScope((scope) => {
        scope.setExtra("timeline", options);
        captureException(err);
      });
      throw err(500, "service unavailable");
    }
   }
  
  getPosts = async (profile: ProfileModel): Promise<Post[]> => 
    await this.query<Post[]>(HTTPMethod.GET, `posts/of/${profile.uid}`)
  
  addPost = async (profile: ProfileModel, args: Post, req: Request): Promise<Post> => 
    await this.query<Post, Post>(HTTPMethod.POST, `posts`, args, req.header("Authorization"))
  
  editPost = async (profile: ProfileModel, args: UpdatePost, req: Request): Promise<Post> => 
    await this.query<Post, Post>(HTTPMethod.PATCH, `posts/${args.id}`, args.post, req.header("Authorization"))

  deletePost = async (profile: ProfileModel, args: DeletePost, req: Request) => 
    await this.query<Post, Post>(HTTPMethod.DELETE, `posts/${args.id}`, null, req.header("Authorization"))

  getPublishedPosts =  async (profile: ProfileModel): Promise<Post[]> => {
    const posts = await this.getPosts(profile);
    return posts.filter(p => p.published);
  }
}