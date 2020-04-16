import Service from "service";
import Database from "lib/database";
import { ProfileModel } from 'model/profile';
import config from "config";
import { Options } from "request";
import { Posts } from "model/timeline";
import err from "err";

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
    if (payload) options.body = payload;
    try {
      return await this.api.requestAndParseJSON<Result>(options);
    } catch(e) {
      throw err(500, "service unavailable");
    }
   }
  
  getPosts = async (profile: ProfileModel): Promise<Posts> => 
    await this.query<Posts>(HTTPMethod.GET, `posts/of/${profile.uid}`)
  
}