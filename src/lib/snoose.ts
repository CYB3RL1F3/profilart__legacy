import https from "https";
import config from "../config";

export const bip = () => {
  try {
    https.get(config.url);
    setTimeout(() => {
      try {
        https.get(config.api.timeline.url)
      } catch(e) {
        console.log(e);
      }
    }, 10 * 60 * 1000)
  } catch (e) {
    console.log(e);
  }
};

// maintain service up...
export const snoose = () => {
  bip();
  setInterval(() => {
    bip();
  }, 30 * 60 * 1000);
};
