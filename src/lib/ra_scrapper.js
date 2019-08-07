import cheerio from "cheerio";
import { get } from "https";
import err from "../err";

export class RA_Scrapper {
  profile;
  constructor(profile) {
    this.profile = profile;
  }

  getUrl = (endpoint = "") => {
    const { artistName } = this.profile;
    const url = artistName.replace(/\s/gi, "").toLocaleLowerCase();
    return `https://www.residentadvisor.net/dj/${url}${endpoint}`;
  };

  getDataFromPage = (endpoint = "") =>
    new Promise(async (resolve, reject) => {
      const data = await new Promise(resolve => {
        get(this.getUrl(endpoint), response => {
          let body = "";
          response.on("data", function(d) {
            body += d;
          });
          response.on("error", function(e) {
            reject(e);
          });
          response.on("end", function() {
            resolve(body);
          });
        });
      });
      resolve(
        cheerio.load(data, {
          normalizeWhitespace: true,
          xmlMode: true
        })
      );
    });

  getScrappedData = async () => {
    /*
    const $ = await this.getDataFromPage();
    const $2 = await this.getDataFromPage("/biography");
    */
    const [$, $2] = await Promise.all([
      this.getDataFromPage(),
      this.getDataFromPage("/biography")
    ]);
    if (!$ || !$2)
      throw err(500, "impossible to parse RA profile. Seems not to exist.");
    const infos = this.getArtistInformations($);
    const links = this.getLinks($);
    return {
      name: this.getArtistName($),
      realname: infos.realname,
      country: infos.country,
      labels: this.getLabels($),
      website: links.website || null,
      RA: this.getUrl(),
      facebook: links.facebook || null,
      twitter: links.twitter || null,
      discogs: links.discogs || null,
      soundcloud: links.soundcloud || null,
      picture: this.getImage($),
      bio: this.getBio($2)
    };
  };

  getImage = $ => {
    const style = $("#featureHead").attr("style");
    const backgroundImage = style.substring(
      style.indexOf("url(") + 4,
      style.indexOf(");")
    );
    return `https://www.residentadvisor.net${backgroundImage}`;
  };

  getArtistName = $ => $("#featureHead > div > h1").text();

  hasRealName = node =>
    node
      .find("div")
      .text()
      .indexOf("Real name") > -1;

  getArtistInformations = $ => {
    const baseNode = "#detail > ul > ";
    const node = $(`${baseNode} li:nth-child(1)`);
    if (this.hasRealName(node)) {
      return {
        realname: node.text().replace("Real name /", ""),
        country: $(`${baseNode} li:nth-child(2) > span > a > span`).text()
      };
    } else {
      return {
        realname: "",
        country: $(`${baseNode} li:nth-child(1) > span > a > span`).text()
      };
    }
  };

  getLabels = $ => {
    const basicLinks = $("#label-slide > ul li");
    const labels = [];
    for (let i = 0; i < basicLinks.length; i++) {
      const link = basicLinks.get(i);
      labels.push(
        $("h1", link)
          .first()
          .text()
      );
    }
    return labels;
  };

  getLinks = $ => {
    const linkHandlers = $("#detail > ul > li.wide a");
    const links = {};
    for (let i = 0; i < linkHandlers.length; i++) {
      const link = $(linkHandlers.get(i));
      links[link.text().toLocaleLowerCase()] = link.attr("href");
    }
    return links;
  };

  getBio = $ => ({
    intro: $(
      "#Form1 > main > ul > li > section > div > div:nth-child(1) > article > div > div > div.f24"
    ).text(),
    content: $(
      "#Form1 > main > ul > li > section > div > div:nth-child(1) > article > div > div > div:nth-child(3)"
    ).text()
  });
}
