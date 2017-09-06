import nodemailer from 'nodemailer';
import smtpTransport from 'nodemailer-smtp-transport';
import fs from 'fs';
import ejs from 'ejs';

export class Mailer {

    profile = {};
    constructor (profile) {
        this.profile = profile;
    }

    getParams = (name, email, subject, content, html) => ({
        from: email, // sender address
        to: this.profile.mailer.recipient, // list of receivers
        subject: `${this.profile.mailer.prefix} ${subject}`, // Subject line
        html // html body
    })

    getTransporter = () => nodemailer.createTransport(smtpTransport({
        host: this.profile.mailer.host,
        service: this.profile.mailer.service,
        auth: this.profile.mailer.auth
    }))

    getTemplate = (name, email, subject, content) => new Promise((resolve, reject) => {
        fs.readFile(`${__dirname}/../templates/mail.html`, 'utf8', (err, template) => {
            if (err) {
                reject(err);
            } else {
                content = this.adapt(content);
                const html = ejs.compile(template)({name, email, subject, content});
                const regexp = /\&lt;br \/&gt;/g;
                resolve(html.replace(regexp, '<br />'));
            }
        });
    })

    adapt = (content) => content.replace(/\n/g, '<br />')

    send = (name, email, subject, content) => new Promise((resolve, reject) => {
        this.getTemplate(name, email, subject, content).then((html) => {
            const params = this.getParams(name, email, subject, content, html);
            this.getTransporter().sendMail(params, (error, info) => {
                if (error) {
                    reject(error);
                } else {
                    resolve();
                }
            });
        })
    });
}

export default Mailer;
