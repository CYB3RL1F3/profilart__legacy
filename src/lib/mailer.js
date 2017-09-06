import nodemailer from 'nodemailer';
import smtpTransport from 'nodemailer-smtp-transport';

export class Mailer {

    profile = {};
    constructor (profile) {
        this.profile = profile;
    }

    getParams = (name, email, subject, content) => ({
        from: email, // `${name} <${email}>`, // sender address
        to: this.profile.mailer.recipient, // list of receivers
        subject: `${this.profile.mailer.prefix} ${subject}`, // Subject line
        html: this.template(name, email, content) // html body
    })

    getTransporter = () => nodemailer.createTransport(smtpTransport({
        host: this.profile.mailer.host,
        service: this.profile.mailer.service,
        auth: this.profile.mailer.auth
    }))

    template = (name, email, content) => (
        `<h3 style='font-size: 15px; color: #DE1212;'><b>${name} (${email})</b> vous a envoyé un <u>nouveau message</u> : </h3><p style='margin: 10px 0; padding: 10px; background: #DEDEDE; color: #121212; font-size: 13px;'>${this.adapt(content)}</p><p style='margin-top: 40px; font-size: 10px; color: #DE1236;'><i><b>NOTE</b> : Ce mail a été envoyé via cyberlife-music.com. Répondez à ${email} en copiant l'adresse email, <b>non</b> en utilisant la fonction "répondre" de votre boite mail.</i></b></p>`
    )

    adapt = (content) => content.replace(/\n/g, '<br />')

    send (name, email, subject, content) {
        const params = this.getParams(name, email, subject, content);
        // send mail with defined transport object
        return new Promise((resolve, reject) => {
            this.getTransporter().sendMail(params, (error, info) => {
                if (error) {
                    reject(error);
                } else {
                    resolve();
                }

                // Message sent: <b658f8ca-6296-ccf4-8306-87d57a0b4321@blurdybloop.com>
                // Preview URL: https://ethereal.email/message/WaQKMgKddxQDoou...
            });
        });

    }
}

export default Mailer;
