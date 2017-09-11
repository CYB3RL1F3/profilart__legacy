import err from '../err';

export class Validator {

    checkData (data, app, query) {
        if (!data || !data instanceof Object) {
            throw err("400", "invalid data object");
        }

        if (!data.query) {
            throw err("400", "invalid data adapt : query must be present");
        }

        if (!data.uid && data.query !== 'create') {
            throw err("400", "no UID provided.");
        }

        if (!app.serviceExists(data.query)) {
            throw err("404", "this service doesn't exists");
        }
        return true;
    }

    checkProfile (profile, query) {
        if (!profile) {
            // bypass on account creation
            if (query === 'create') {
                return true;
            } else {
                throw err('404', 'profile not found');
            }
        }
        if (query === 'charts' || query === 'infos' || query === 'events') {
            if (!profile.RA) {
                throw err('400', 'RA informations must be provided in database');
            }
            if (!profile.RA.accessKey) {
                throw err('400', 'RA accessKey must be provided in database');
            }
            if (!profile.RA.userId) {
                throw err('400', 'RA UserID must be provided in database');
            }
            if (!profile.RA.DJID) {
                throw err('400', 'RA DJID must be provided in database');
            }
        }
        if (query === 'infos') {
            if (!profile.artistName) {
                throw err('400', 'RA ArtistName must be provided in database');
            }
        }
        if (query === 'releases' && (!profile.discogs || (profile.discogs && !profile.discogs.artistId))) {
            throw err('400', 'Discogs informations must be provided in database');
        }
        if (query === 'contact') {
            if (!profile.mailer) {
                throw err('400', 'mailer informations must be provided');
            }

            if (profile.use === 'nodemailer') {
                if (!profile.mailer.nodemailer.service) {
                    throw err('400', 'mailer service must be defined (exemple : gmail)');
                }

                if (!profile.mailer.nodemailer.recipient) {
                    throw err('400', 'mailer email recipient must be defined in database');
                }

                if (profile.mailer.nodemailer.service !== 'gmail' && !profile.mailer.host) {
                    throw err('400', 'mailer host must be provided in database')
                }

                if (!profile.mailer.nodemailer.auth || !profile.mailer.nodemailer.auth.user || !profile.mailer.nodemailer.auth.pass) {
                    throw err('400', 'mailer auth informations user & pass must be provided in database');
                }
            } else if (profile.use === 'mailgun') {
                if (!profile.mailer.mailgun.endpoint) {
                    throw err('400', 'mailer mailgun endpoint must be defined in database');
                }
                if (!profile.mailer.mailgun.email) {
                    throw err('400', 'mailer mailgun email must be defined in database');
                }
            }

            if (!profile.mailer.prefix) {
                profile.mailer.prefix = '';
            }
        }
    }
}

export default Validator;
