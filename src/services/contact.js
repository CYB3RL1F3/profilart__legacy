import Mailer from '../lib/mailer';

export class Contact {
    mail = async (profile, args) => {
        if (!this.validate(args)) {
            reject('invalid arguments to send mail');
        }
        const mailer = new Mailer(profile);
        args.message = mailer.adapt(args.message);
        const { statusCode } = await mailer.send('mail.html', args);
        return {
            statusCode,
            message: 'mail succesfully sent'
        };
    };

    validate = (args) =>
        args instanceof Object &&
        typeof args.name === 'string' &&
        typeof args.email === 'string' &&
        typeof args.subject === 'string' &&
        typeof args.message === 'string';
}

export default Contact;
