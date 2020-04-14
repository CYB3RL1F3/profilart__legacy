import Mailgun from "mailgun-js";
import Template from "./template";
import err from "../err";
import config from "../config";
import * as Sentry from "@sentry/node";
import { ProfileModel } from "model/profile";

export interface EmailParams {
  from: string;
  to: string;
  subject: string;
  html: string;
}

export interface ContactArgs {
  name: string;
  email: string;
  subject: string;
}

interface EmailResult {
  error?: string;
}

export class Mailer {
  profile: ProfileModel;
  constructor(profile: ProfileModel) {
    this.profile = profile;
  }

  getParams = (
    name: string,
    email: string,
    subject: string,
    html: string
  ): EmailParams => ({
    from: `${name}<${config.mailer.mailgun.email}>`, // sender address
    to: email, // list of receivers
    subject: `${this.profile.mailer.prefix} ${subject}`, // Subject line
    html // html body
  });

  getTemplate = async <TemplateParams>(tpl: string, args: TemplateParams) => {
    const template = new Template();
    return await template.render(tpl, args, true);
  };

  adapt = (content: string) => content.replace(/\n/g, "<br />");

  sendViaMailgun = async (params: EmailParams) => {
    const { user, endpoint, email } = config.mailer.mailgun;
    const mailgun = new Mailgun({
      apiKey: user,
      domain: endpoint
    });
    params.from = email;

    return await new Promise<EmailResult>((resolve, reject) => {
      mailgun.messages().send(params, (err, res) => {
        if (err) reject(err);
        else resolve(res);
      });
    });
  };

  send = async <T>(template: string, args: T & ContactArgs) => {
    try {
      const html = await this.getTemplate(template, args);
      return await this.process(
        args.name,
        this.profile.email,
        args.subject,
        html
      );
    } catch (e) {
      Sentry.withScope((scope) => {
        scope.setExtra("mailer send", e);
        Sentry.captureException(e);
      });
      throw err(500, `unable to send mail for reason ${e.message || e}`);
    }
  };

  process = async (
    name: string,
    email: string,
    subject: string,
    content: string
  ): Promise<EmailResult> => {
    const params = this.getParams(name, email, subject, content);
    return await this.sendViaMailgun(params);
  };
}

export default Mailer;
