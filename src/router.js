import passport from "passport";

import ResidentAdvisor from "./services/residentadvisor";
import Discogs from "./services/discogs";
import Contact from "./services/contact";
import Soundcloud from "./services/soundcloud";
import Validator from "./lib/validator";
import Database from "./lib/database";
import Profiles from "./services/profiles";
import All from "./services/all";
import Authenticator from "./authenticator";
import { err } from "./err";
import GraphQL from "./graphql";

export class Router {
  services = {};
  authenticator = null;

  constructor(app) {
    this.app = app;
  }

  init() {
    this.initServices();
    this.initMiddlewares();
    this.initRoutes();
  }

  initServices() {
    const database = new Database();
    const residentAdvisor = new ResidentAdvisor(database);
    const discogs = new Discogs(database);
    const soundcloud = new Soundcloud(database);
    const contact = new Contact();
    const all = new All(database, residentAdvisor, discogs, soundcloud);
    this.validator = new Validator();
    this.profiles = new Profiles(database);
    this.authenticator = new Authenticator();

    // fill services dictionnary with different ones
    this.services = {
      public: {
        get: {
          charts: residentAdvisor.getCharts,
          events: residentAdvisor.getEvents,
          event: residentAdvisor.getEventById,
          infos: residentAdvisor.getInfos,
          tracks: soundcloud.getTracks,
          track: soundcloud.getTrack,
          playlist: soundcloud.getPlaylist,
          releases: discogs.getReleases,
          all: all.get
        },
        post: { create: this.profiles.create, login: this.authenticate },
        uidPost: { contact: contact.mail }
      },
      auth: {
        get: { profile: this.profiles.read },
        patch: {
          profile: this.profiles.update,
          password: this.profiles.forgottenPassword
        },
        delete: { profile: this.profiles.remove }
      }
    };
  }

  initMiddlewares() {
    passport.use(this.authenticator.getStrategy());
  }

  authenticate = async (p, body, req) => {
    try {
      return await this.authenticator.authenticate(
        body,
        req,
        this.profiles.login
      );
    } catch (e) {
      throw e;
    }
  };

  fail = (res, e) => {
    const err = JSON.parse(e.message);
    console.log(err);
    res.status(err.code).send(
      JSON.stringify({
        error: {
          code: err.code,
          message: err.message
        }
      })
    );
  };

  forbidden = (req, res) => {
    this.fail(res, {
      message: JSON.stringify({
        code: 403,
        message: "authentication required"
      })
    });
  };

  initRoutes() {
    this.initPublicRoutes();
    this.initAuthRoutes();
    this.initGraphQL();
    this.init404();
  }

  run = async (req, query, service, dataProvider) => {
    let profile = null;
    if (
      service !== "login" &&
      service !== "create" &&
      service !== "forbidden"
    ) {
      try {
        const { uid } = req.params;
        profile = await this.profiles.get(uid);
        if (!profile) throw err(400, "profile not found");
        this.validator.checkProfile(profile, service);
      } catch (e) {
        throw err(404, "profile not found");
      }
    }
    try {
      const response = await query(profile, dataProvider, req);
      return response;
    } catch (e) {
      throw e;
    }
  };

  initGraphQL() {
    const graphQl = new GraphQL(this);
    this.app.use("/graphql", graphQl.getMiddleware());
  }

  initPublicRoutes() {
    // GET requests
    Object.keys(this.services.public.get).forEach(service => {
      const serviceName = service === "all" ? "" : service;
      this.app.get(`/:uid/${serviceName}`, async (req, res) => {
        try {
          const query = this.services.public.get[service];
          const result = await this.run(req, query, service, req.query);
          res.status(200).send(JSON.stringify(result));
        } catch (e) {
          this.fail(res, e);
        }
      });
    });

    // POST requests
    Object.keys(this.services.public.post).forEach(service => {
      this.app.post(`/${service}`, async (req, res) => {
        try {
          const query = this.services.public.post[service];
          const result = await this.run(req, query, service, req.body);
          res.status(200).send(JSON.stringify(result));
        } catch (e) {
          this.fail(res, e);
        }
      });
    });

    // UID POST requests
    Object.keys(this.services.public.uidPost).forEach(service => {
      this.app.post(`/:uid/${service}`, async (req, res) => {
        try {
          const query = this.services.public.uidPost[service];
          const result = await this.run(req, query, service, req.body);
          res.status(200).send(JSON.stringify(result));
        } catch (e) {
          this.fail(res, e);
        }
      });
    });

    this.app.get("/forbidden", this.forbidden);
  }

  getAuthMiddleware = () =>
    passport.authenticate("jwt", {
      session: false,
      failureRedirect: "/forbidden"
    });

  initAuthRoutes() {
    Object.keys(this.services.auth).forEach(method => {
      const services = this.services.auth[method];
      Object.keys(services).forEach(service => {
        const uri = `/${service}`;
        switch (method) {
          case "get":
            this.app.get(
              uri,
              this.getAuthMiddleware(),
              this.runAuthQuery(services[service], service, true)
            );
            break;
          case "post":
            this.app.post(
              uri,
              this.getAuthMiddleware(),
              this.runAuthQuery(services[service], service, false)
            );
            break;
          case "patch":
            this.app.patch(
              uri,
              this.getAuthMiddleware(),
              this.runAuthQuery(services[service], service, false)
            );
            break;
          case "delete":
            this.app.delete(
              uri,
              this.getAuthMiddleware(),
              this.runAuthQuery(services[service], service, false)
            );
            break;
        }
      });
    });
  }

  init404 = () => {
    this.app.get("*", (req, res) => {
      this.fail(res, err(404, "this endpoint does not exist"));
    });
  };

  runAuthQuery = (query, service, isGet) => async (req, res) => {
    try {
      const result = await this.run(
        req,
        query,
        service,
        isGet ? req.query : req.body
      );
      res.status(200).send(JSON.stringify(result));
    } catch (e) {
      this.fail(res, e);
    }
  };
}

export default Router;
