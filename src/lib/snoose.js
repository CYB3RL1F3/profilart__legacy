import https from "https";
import config from "../config";

export const bip = () => {
  try {
    https.get(config.url);
  } catch (e) {
    console.log(e);
  }
};

// maintain service up...
export const snoose = () => {
  bip();
  setInterval(() => {
    bip();
  }, 360000);
};
