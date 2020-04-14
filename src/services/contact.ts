import Mailer, { ContactArgs } from "lib/mailer";
import { ProfileModel } from "model/profile";

export interface Email {
  message: string;
}

export interface ContactParams {
  params: ContactArgs & Email;
}

export interface Status {
  statusCode: number;
  message: string;
}

export class Contact {
  mail = async (
    profile: ProfileModel,
    args: ContactParams
  ): Promise<Status> => {
    const { params } = args;
    if (!this.validate(params)) {
      throw new Error("invalid arguments to send mail");
    }
    const mailer = new Mailer(profile);
    params.message = mailer.adapt(params.message);
    const data = await mailer.send<Email>("mail.html", params);
    if (!data.error) {
      return {
        statusCode: 200,
        message: "mail successfully sent"
      };
    } else {
      return {
        statusCode: 400,
        message: "an error occured"
      };
    }
  };

  validate = (args: ContactArgs & Email) =>
    args instanceof Object &&
    typeof args.name === "string" &&
    typeof args.email === "string" &&
    typeof args.subject === "string" &&
    typeof args.message === "string";
}

export default Contact;
