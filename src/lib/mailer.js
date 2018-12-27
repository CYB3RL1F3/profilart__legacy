import Mailgun from "mailgun-js";
import Template from "./template";
import err from "../err";
import config from "../config";

export class Mailer {
  profile = {};
  constructor(profile) {
    this.profile = profile;
  }

  getParams = (name, email, subject, html) => ({
    from: `${name}<${config.mailer.mailgun.email}>`, // sender address
    to: email, // list of receivers
    subject: `${this.profile.mailer.prefix} ${subject}`, // Subject line
    html // html body
  });

  getTemplate = async (tpl, args) => {
    const template = new Template();
    return await template.render(tpl, args, true);
  };

  adapt = content => content.replace(/\n/g, "<br />");

  sendViaMailgun = async params => {
    const { user, endpoint, email } = config.mailer.mailgun;
    const mailgun = new Mailgun({
      apiKey: user,
      domain: endpoint
    });
    params.from = email;

    return await new Promise((resolve, reject) => {
      mailgun.messages().send(params, (err, res) => {
        if (err) reject(err);
        else resolve(res);
      });
    });
  };

  send = async (template, args) => {
    try {
      const html = await this.getTemplate(template, args);
      return await this.process(
        args.name,
        this.profile.email,
        args.subject,
        html
      );
    } catch (e) {
      console.log(e);
      throw err(500, `unable to send mail for reason ${e}`);
    }
  };

  process = async (name, email, subject, content) => {
    const params = this.getParams(name, email, subject, content);
    return await this.sendViaMailgun(params);
  };
}

export default Mailer;
