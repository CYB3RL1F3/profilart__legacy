import scrypt from "scrypt";
import { Encryption } from "model/profile";

interface Password {
  hash: string;
  encryption: Encryption;
}

export class Encrypter {
  encrypt = (str: string): Promise<Password> =>
    new Promise<Password>((resolve, reject) => {
      scrypt.params(1, 0, 1, (err, encryption) => {
        if (err) reject(err);
        else
          scrypt.kdf(str, encryption, (err, hash) => {
            if (err) {
              reject(err);
            } else {
              hash = hash.toString("hex");
              resolve({ encryption, hash });
            }
          });
      });
    });

  check = (str: string, hash: string): Promise<boolean> =>
    new Promise<boolean>((resolve, reject) => {
      const kdf = new Buffer(hash, "hex");
      scrypt.verifyKdf(kdf, str).then(
        (result) => {
          if (!result) {
            reject(false);
          } else {
            resolve(true);
          }
        },
        () => {
          reject(false);
        }
      );
    });
}

export default Encrypter;
