import https from "https";
import config from "../config";
import Resolvers from "./resolvers";
import { withScope, captureException } from "@sentry/node";

export const bip = (resolver: Resolvers) => {
  try {
    if (config.url.indexOf('localhost') > -1) return;
    https.get(config.url);
    setTimeout(() => {
      try {
        https.get(config.api.timeline.url)
      } catch(e) {
        console.log(e);
      }
    }, 10 * 60 * 1000)
    for (let i = 0; i < config.api.discogs.nbProxies; i++) {
      setTimeout(() => {
        https.get(resolver.getDiscogsProxyUrl(i))
      }, (i + 1) * 60 * 1000);
    }
  } catch (e) {
    console.log(e);
    withScope((scope) => {
      scope.setExtra("service became inactive !!", e);
      captureException(e);
    });
  }
};

// maintain service up...
export const alarmClock = () => {
  const resolver = new Resolvers();
  bip(resolver);
  setInterval(() => {
    bip(resolver);
  }, 30 * 60 * 1000);
};
