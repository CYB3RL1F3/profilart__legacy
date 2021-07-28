// https://www.mixesdb.com/db/api.php?action=query&list=search&srsearch=cyberlife&format=json

import Api from "./api";
import config from "config";
import cheerio from "cheerio";
import { Options } from "request";

export interface Searchinfo {
  totalhits: number;
}

export interface Search {
  ns: number;
  title: string;
  snippet: string;
  size: number;
  wordcount: number;
  timestamp: Date;
}

export interface Query {
  searchinfo: Searchinfo;
  search: Search[];
}

export interface ArtistQuery {
  query: Query;
}

export interface Text {
  "*": string;
}

export interface Parse {
  title: string;
  revid: number;
  text: Text;
}

export interface Response {
  parse: Parse;
}

export class MixesDB {
  api: Api;
  constructor() {
    this.api = new Api();
  }
  getQuery = (params: Record<string, string>): Options => {
    params.format = "json";
    const qs = Object.keys(params)
      .map((p) => `${p}=${params[p]}`)
      .join("&");
    return {
      url: `${config.api.mixesdb.api_url}?${qs}`,
      method: "GET",
      headers: {
        "User-Agent": config.userAgent,
        "Content-Type": "application/json"
      }
    };
  };
  matchSoundcloudUrl = (snippet: string, query: string, search: string) => {
    const regexp = /(<span class=("|')searchmatch("|')>)(.+)(<\/span>)/gim;
    const t = snippet.replace(regexp, search.toLocaleLowerCase());
    return t.indexOf(query) > -1;
  };

  getTracklist = async (srsearch: string, soundcloudUrl: string) => {
    const artistUrl = this.getQuery({
      action: "query",
      list: "search",
      srsearch
    });
    const artistResponse = await this.api.requestAndParseJSON<ArtistQuery>(
      artistUrl
    );

    if (!artistResponse) return null;
    const page = artistResponse.query?.search?.find((search) => {
      return this.matchSoundcloudUrl(search.snippet, soundcloudUrl, srsearch);
    })?.title;

    if (!page) return null;

    const response = await this.api.requestAndParseJSON<Response>(
      this.getQuery({
        action: "parse",
        page
      })
    );
    if (!response) return null;
    const text = response?.parse?.text["*"];
    if (!text) return null;
    const $ = cheerio.load(`<article>${text.trim()}</article>`, {
      normalizeWhitespace: true,
      xmlMode: true,
      decodeEntities: true
    });
    const elements = $("ol li");
    const items = [];
    elements.each((index, element: any) => {
      const item = element.children[0].data.trim();
      items.push(item);
    });
    console.log(items);
    return items;
  };
}
