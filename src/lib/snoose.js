import https from 'https';
import config from '../config';

export const bip = () => https.get(config.url);

// maintain service up...
export const snoose = () => {
    bip();
    setInterval(() => {
        bip();
    }, 360000);
};
