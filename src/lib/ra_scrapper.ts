import cheerio from "cheerio";
import err from "../err";
import { InfosModel } from "model/infos";
import { ProfileModel } from 'model/profile';
import CloudflareBypasser from 'cloudflare-bypasser';
import { toJSON } from 'cssjson';
type Link = {
  website?: string;
  facebook?: string;
  twitter?: string;
  discogs?: string;
  soundcloud?: string;
};

interface ArtistInfo {
  realname?: string;
  country?: string;
  links?: Link;
  aliases?: string;
  followers?: string;
}

interface Bio {
  intro: string;
  content: string;
}

export class RA_Scrapper {
  cf: CloudflareBypasser;
  constructor(readonly profile: ProfileModel) {
    this.cf = new CloudflareBypasser();
  }

  getUrl = (endpoint = ""): string => {
    const { artistName } = this.profile;
    const url = artistName.replace(/\s/gi, "").toLocaleLowerCase();
    return `https://ra.co/dj/${url}${endpoint}`;
  };

  getDataFromPage = (endpoint = "") =>
    new Promise<cheerio.Root>(async (resolve, reject) => {
      this.cf.request(this.getUrl(endpoint))
        .then(({ body }) => {
          resolve(
            cheerio.load(body, {
              normalizeWhitespace: true,
              xmlMode: true,
              decodeEntities: true
            })
          );
        }
      ).catch(e => {
        console.log('SCRAP ERROR ===> ')
        console.log(e);
      });
    });

  getArtistInformations = ($: cheerio.Root) => {
    const nodes = $("#__next > div:nth-child(5) > section > div > ul li");
    const informations: ArtistInfo = {};
    nodes.each((index, node) => {
      const title = $("div > div:nth-child(1)", node).text();
      let content = $("div > div:nth-child(2)", node);
      switch(title) {
        case "Real name":
          informations.realname = content.text();
          break;
        case "Aliases":
          informations.aliases = content.text();
          break;
        case "Location":
          informations.country = content.text();
          break;
        case "Links":
          informations.links = this.getLinks($, content);
          break;
        case "Followers":
          informations.followers = content.text();
          break;
      }
    });
    return informations;
  }

  getScrappedData = async (): Promise<InfosModel> => {
    const [$, $2] = await Promise.all([
      this.getDataFromPage(),
      this.getDataFromPage("/biography")
    ]);
    if (!$ || !$2)
      throw err(500, "impossible to parse RA profile. Seems not to exist.");
    const infos = this.getArtistInformations($);
    const { links } = infos;
    return {
      name: this.getArtistName($),
      realname: infos.realname || null,
      country: infos.country || null,
      followers: infos.followers || null,
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

  getCSSObject = (css) => {
    return Object.keys(css.children).reduce((acc, index) => ({
        ...acc,
        ...(css.children[index].children ? this.getCSSObject(css.children[index]) : {}),
        [index.replace('.', '')]: css.children[index].attributes
      }), {});
  }

  getImage = ($: cheerio.Root) => {
    const header = $("#__next > header");
    const css = this.getCSSObject(toJSON($("head style").html()));
    const classNames = header.attr('class')?.split(' ');
    
    const url = css[classNames[1]]['background-image'];
    if (!url) return '';
    return url.substring("url(".length, url.indexOf("?"));
  };

  getArtistName = ($: cheerio.Root) => $("#__next > header > div > div > div > div:nth-child(1) > div > div > h1").text();

  hasRealName = (node: cheerio.Cheerio) =>
    node.find("div").text().indexOf("Real name") > -1;

  hasLocation = (node: cheerio.Cheerio) =>
    node.find("div").text().indexOf("location") > -1;

  getLabels = ($: cheerio.Root) => {
    const labels = [];
    const sections = $("#__next > div:nth-child(5) > div.Box-omzyfs-0.jyLLA > div:nth-child(3) > div > section");
    sections.each((index, section) => {
      const h3 = $("h3", section);
      if (h3.text().toLocaleLowerCase() === "labels") {
        const links = $("ul", section).find("a");
        links.each((i, link) => {
          const labelName = $(link).text();
          labelName && labels.push(labelName);
        })
      }
    });
    return labels;
  };

  getLinks = ($: cheerio.Root, content) => {
    const linkHandlers = $('a', content);
    const links: Link = {};
    linkHandlers.each((index, elt) => {
      const link = $(elt);
      links[link.text().toLocaleLowerCase()] = link.attr("href");
    });
    return links;
  };

  getBio = ($: cheerio.Root): Bio => ({
    intro: $(
      "#__next > div:nth-child(5) > section > div > div > div:nth-child(2) > ul > li:nth-child(1) > div:nth-child(1)"
    ).text(),
    content: $(
      "#__next > div:nth-child(5) > section > div > div > div:nth-child(2) > ul > li:nth-child(1) > div:nth-child(2)"
    ).text()
  });
}
