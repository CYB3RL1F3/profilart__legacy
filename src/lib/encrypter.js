import scrypt from 'scrypt';
import { v4 as uuid } from 'uuid';

export class Encrypter {
    encrypt = (str) => new Promise((resolve, reject) => {
        scrypt.params(1, 0, 1, (err, encryption) => {
            scrypt.kdf(str, encryption, (err, hash) => {
                if (err) {
                    reject(err);
                } else {
                    hash = hash.toString('hex');
                    resolve({encryption, hash});
                }
            });
        })
    })

    check = (str, hash) => new Promise((resolve, reject) => {
        const kdf = new Buffer(hash, 'hex');
        scrypt.verifyKdf(kdf, str).then((result) => {
            if (!result) {
              reject(false);
            } else {
              resolve(true);
            }
        }, (e) => {
            reject(false);
        });
    })
}

export default Encrypter;
