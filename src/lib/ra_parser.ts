import err from "../err";
import { InfosModel, Label, Bio } from "model/infos";
import { ProfileModel } from "model/profile";
import config from "config";
import ScrappingAntClient from "@scrapingant/scrapingant-client";
import { ApolloState, RA_Input } from "schemas/RA";

interface ScrapperResponse {
  content: string;
}

export class RA_Parser {
  constructor(readonly profile: ProfileModel) {}

  infosId = "CYBX";

  getUrl = (): string => {
    const { artistName } = this.profile;
    const url = artistName.replace(/\s/gi, "").toLocaleLowerCase();
    console.log(url, `https://ra.co/dj/${url}`);
    return `https://ra.co/dj/${url}`;
  };

  scrap = async (url: string) => {
    const scrapper = new ScrappingAntClient(config.scrapper);
    const response: ScrapperResponse = await scrapper.scrape(url, {
      "proxy-type": "residential"
    });
    return response.content;
  };

  getDataFromPage = () =>
    new Promise<RA_Input>(async (resolve, reject) => {
      let extract = "";
      try {
        const url = this.getUrl();
        let body = await this.scrap(url);

        const jsonTag = '<script id="__NEXT_DATA__" type="application/json">';
        if (body.indexOf(jsonTag) === -1) {
          body = await this.scrap(url);
        }
        extract = body.substring(body.indexOf(jsonTag) + jsonTag.length);
        extract = extract.substring(0, extract.indexOf("</script>"));
        resolve(JSON.parse(extract));
      } catch (e) {
        console.log("SCRAP ERROR ===> ");
        console.log(e);
        console.log("EXTRACT ==> ", extract);
        console.log("FAILED");
        // console.log("\n\n\nIT FAILLLLLLEDDDDDD !!!!");
        reject(e);
      }
    });

  getLabels = (root, infos): Label[] =>
    infos.labels
      .map((label) => root[label.id])
      .map(({ name, imageUrl, contentUrl }) => ({
        name,
        image: imageUrl,
        RA: `https://ra.co/${contentUrl}`
      }));

  getBio = (root, infos): Bio => {
    const bioId = infos.biography.id;
    const bio = root[bioId];
    return {
      intro: bio.blurb,
      content: bio.content
    };
  };

  getCountry = (root, infos): string => {
    const countryId = infos.country.id;
    const country = root[countryId];
    return country?.name || null;
  };

  getScrappedData = async (): Promise<InfosModel> => {
    const data = await this.getDataFromPage();
    if (!data) {
      console.log("NO DATA");
      throw err(500, "impossible to parse RA profile. Seems not to exist.");
    }
    const root = data.props.apolloState;
    const { artistName } = this.profile;
    const id = `artist({"slug":"${artistName.toLocaleLowerCase().trim()}"})`;
    const core = root["ROOT_QUERY"][id];
    const infos: ApolloState = root[core.id];
    const bio = this.getBio(root, infos);
    if (
      !infos.facebook ||
      !infos.soundcloud ||
      !infos.name ||
      !bio.content ||
      !infos.image
    ) {
      console.log("INCONSISTANCY ==> \n\n", root);
      throw new Error("inconsistancy");
    }

    return {
      name: infos.name || null,
      bookingDetails: infos.bookingDetails || null,
      country: this.getCountry(root, infos),
      followers: infos.followerCount || null,
      labels: this.getLabels(root, infos),
      website: infos.website || null,
      aliases: infos.aliases || null,
      RA: this.getUrl(),
      facebook: infos.facebook || null,
      twitter: infos.twitter || null,
      discogs: infos.discogs || null,
      soundcloud: infos.soundcloud || null,
      picture: infos.image,
      bio
    };
  };
}
