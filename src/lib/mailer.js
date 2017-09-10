import nodemailer from 'nodemailer';
import smtpTransport from 'nodemailer-smtp-transport';
import fs from 'fs';
import ejs from 'ejs';
import Api from './api';
import err from '../err';

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
        host: this.profile.mailer.nodemail.host,
        service: this.profile.mailer.nodemail.service,
        auth: this.profile.mailer.nodemail.auth
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

    sendViaNodemail = (params) => new Promise((resolve, reject) => {
        this.getTransporter().sendMail(params, (error, info) => {
            if (error) {
                reject(error);
            } else {
                resolve();
            }
        });
    })

    sendViaMailgun = (params) => {
        const api = new Api();
        const url = this.profile.mailer.mailgun.endpoint;
        params.email = this.profile.mailer.mailgun.email;
        const options = {
            url,
            method: 'POST',
            headers: {
                'User-Agent':       'RAPI/0.0.1',
                'Content-Type':     'application/x-www-form-urlencoded'
            },
            form: params
        };
        return api.request(options);
    }

    send = (name, email, subject, content) => new Promise((resolve, reject) => {
        this.getTemplate(name, email, subject, content).then((html) => {
            const params = this.getParams(name, email, subject, content, html);
            let promise;
            if (this.profile.mailer.use === 'mailgun') {
                promise = this.sendViaMailgun;
            } else if (this.profile.mailer.use === 'nodemail') {
                promise = this.sendViaNodemail;
            } else {
                reject(err(500, 'this mail service is not managed'));
                return;
            }
            promise(params).then(resolve).catch(reject);
        }).catch((e) => {
            reject(err(500, 'unable to send mail because of content issue'));
        })
    });
}

export default Mailer;
