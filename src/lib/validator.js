import err from '../err';

export class Validator {

    checkData (data, app) {
        if (!data || !data instanceof Object) {
            throw err("400", "invalid data object");
        }
        if (!data.query) {
            throw err("400", "invalid data adapt : query must be present");
        }
        if (!data.uid) {
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
        if (query === 'releases' && !profile.discogs && !profile.discogs.artistId) {
            throw err('400', 'Discogs informations must be provided in database');
        }
        if (!query === 'mailer') {
            if (!profile.mailer) {
                throw err('400', 'mailer informations must be provided');
            }

            if (!profile.mailer.service) {
                throw err('400', 'mailer service must be defined (exemple : gmail)');
            }

            if (!profile.mailer.recipient) {
                throw err('400', 'mailer informations must be provided in database');
            }

            if (profile.mailer.service !== 'gmail' && !profile.mailer.host) {
                throw err('400', 'mailer host must be provided in database')
            }

            if (!profile.mailer.prefix) {
                profile.mailer.prefix = '';
            }

            if (!profile.mailer.auth || !profile.mailer.auth.user || !profile.mailer.auth.pass) {
                throw err('400', 'mailer auth informations user & pass must be provided in database');
            }
        }
    }
}

export default Validator;
