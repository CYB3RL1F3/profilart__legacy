import Mailer from '../lib/mailer';

export class Contact {
    mail = (profile, args) => new Promise((resolve, reject) => {
        if (!this.validate(args)) {
            reject('invalid arguments to send mail');
        }
        const mailer = new Mailer(profile);
        args.message = mailer.adapt(args.message);
        mailer.send('mail.html', args).then(resolve).catch(reject);
    })

    validate = (args) => args instanceof Object
        && typeof args.name === 'string'
        && typeof args.email === 'string'
        && typeof args.subject === 'string'
        && typeof args.message === 'string'
}

export default Contact;
