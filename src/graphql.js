import graphql from "express-graphql";
import { buildSchema } from "graphql";

export class GraphQL {
  router;
  constructor(router) {
    this.router = router;
  }
  getSchema = () =>
    buildSchema(`
      type Query {
        infos(uid: String!): Infos
        releases(uid: String!): [Releases]
        charts(uid: String!): [Chart]
        events(uid: String!, type: Int!): [Event]
        event(uid: String!, type: Int!, ID: String!): Event
        tracks(uid: String!): [Track]
        track(uid: String!, id: Int!): Track
        playlist(uid: String!, name: String!): Playlist
      },
      type Mutation {
        contact(uid: String!, name: String!, email: String!, subject: String!, message: String!): Status
      },
      type Status {
        statusCode: Int
        message: String
      },
      type Bio {
        intro: String
        content: String
      },
      type Infos {
        name: String
        realname: String
        country: String
        labels: [String]
        website: String
        RA: String
        facebook: String
        twitter: String
        discogs: String
        soundcloud: String
        picture: String
        bio: Bio
      },
      type Community {
        in_collection: Int
        in_wantlist: Int
      },
      type Stats {
        community: Community
      },
      type Tracklist {
        title: String
        position: String
        duration: String
      },
      type Releases {
        id: Int
        stats: Stats
        thumb: String
        title: String
        main_release: Int
        artist: String
        role: String
        year: Int
        resource_url: String
        type: String
        releaseDate: String
        cat: String
        tracklist: [Tracklist]
        notes: String
      },
      type Location {
        id: String
        address: String
        position: [Float]
      },
      type Time {
        begin: String
        end: String
      },
      type Links {
        event: String
        venue: String
      }
      type Event {
        id: String
        venueId: String
        date: String
        country: String
        area: String
        areaId: String
        title: String
        address: String
        lineup: [String]
        cost: String
        promoter: String
        time: Time
        links: Links
        location: Location
      },
      type ChartTrack {
        id: String
        artist: String
        label: String
        title: String
        remix: String
        cover: String
        RA_Link: String
      },
      type Chart {
        id: String
        date: String
        rank: String
        tracks: [ChartTrack]
      },
      type SCStats {
        count: Int
        downloads: Int
        favorites: Int
      },
      type Track {
        id: Int
        title: String
        genre: String
        description: String
        date: String
        artwork: String
        download: String
        downloadable: Boolean
        soundcloud: String
        waveform: String
        duration: Int
        taglist: [String]
        uri: String
        url: String
        license: String
        stats: SCStats
      },
      type Playlist {
        title: String
        description: String
        genre: String
        taglist: [String]
        artwork: String
        soundcloud: String
        tracks: [Track]
      }
    `);

  run = async (uid, serviceName, service, args) => {
    try {
      const profile = await this.router.profiles.get(uid);
      if (!profile) throw err(400, "profile not found");
      this.router.validator.checkProfile(profile, serviceName);
      const result = await service(profile, args);
      return result;
    } catch (e) {
      throw e;
    }
  };

  transposeArgs = (service, args) => {
    if (service === "contact") {
      return {
        params: {
          name: args.name,
          email: args.email,
          subject: args.subject,
          message: args.message
        }
      };
    }
    return args;
  };

  getResolver = () => {
    const services = Object.keys(this.router.services.public.get).filter(
      obj => obj !== "all"
    );
    const resolvers = {};
    services.forEach(service => {
      resolvers[service] = async args =>
        await this.run(
          args.uid,
          service,
          this.router.services.public.get[service],
          args
        );
    });
    const mutations = Object.keys(this.router.services.public.uidPost);
    mutations.forEach(mutation => {
      resolvers[mutation] = async args =>
        await this.run(
          args.uid,
          mutation,
          this.router.services.public.uidPost[mutation],
          this.transposeArgs(mutation, args)
        );
    });
    return resolvers;
  };

  getMiddleware = () =>
    graphql({
      schema: this.getSchema(),
      rootValue: this.getResolver(),
      graphiql: true
    });
}

export default GraphQL;
