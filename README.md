# Profilart

**Profilart** is an open-source service that provides data of electronic music artists through sockets to apps, websites...

Each artist or manager creates a profile providing API credentials from RA & discogs (and later soundcloud & youtube).

The interest of the project consists in avoiding data repetition on the web by using backoffices for apps whereas data like bio, gigs, discography... is already available on those popular services which provide APIs.

Concentrating multiple source of data in one API accessible with just a simple UID affected to a profile is an interesting way of approaching data consumption. This open-source project initially made to respond to a personal need, is a concrete example of how we could approach web data in the future : avoiding redondance and platforms multiplication hell connecting all services together in one.

Data provided from different services are also locally persisted. In case of unavailability of service, data could be restored from the local database.

This API works both as REST and GraphQL.

This project is available on _github_ in order to stay evolutive. Anyone could fork this and bring code correction and new features on this project targetting mostly electronic music artists who have their gigs on resident advisor, discography on discogs & tracks on soundcloud.

## Getting Started

### Prerequisites

- [Node 6.0 & more...](https://nodejs.org/en/)
- [Yarn](https://github.com/yarnpkg/yarn)
- [Mongodb](https://www.mongodb.com/)
- [Mailgun](https://www.mailgun.com/)
- [Redis](https://redis.io/topics/quickstart)

### Installing

1. If Yarn's not installed yet, set up yarn on your machine.

   run `> npm install yarn -g`

2. Clone repository : run `> git clone https://github.com/CYB3RL1F3/profilart.git`

3. In **package.json**, define env specific variables (see [Environments](#Environments))

4. run `> yarn install` to install dependencies.

5. Create a database in your mongodb setup. (exemple : `cyberlife`). [see tutorial](https://www.tutorialspoint.com/mongodb/mongodb_create_database.htm)

6. Create a REDIS store (exemple : `cyberlife_redis`). [see tutorial](https://redis.io/topics/quickstart)

7. Create a [MAILGUN account](https://www.mailgun.com/) and configure it to use with this app.

8. define a .env file with following informations :

- _MONGODB_BASE_ : the mongodb name base
- _MONGODB_URI_ : the mongodb uri
- _DISCOGS_API_SECRET_ : the secret key to access to discogs API
- _DISCOGS_API_KEY_ : the API key to access to discogs API
- _MAPBOX_API_KEY_ : the API key to access to mapbox API (for geolocation)
- _PORT_ : the PORT number to use with the APP
- _JWT_ : the JWT prefix of each token used with passport
- _REDIS_URL_ : URL to a Redis storage
- _REDIS_COLLECTION_ : name of the collection to use on redis
- _URL_ : the URL of the app
- _MAILGUN_USER_ : the API key used on mailgun
- _MAILGUN_ENDPOINT_ : the endpoint defined on your mailgun account
- _MAILGUN_EMAIL_ : the mailgun email used to send mails
- _SOUNDCLOUD_API_CLIENT_ID_ : the soundcloud client ID to use with the soundcloud API
- _SOUNDCLOUD_API_CLIENT_SECRET_ : the soundcloud client secret to use with the soundcloud API

9. run start `yarn start` to launch the service (on the port 8080 with a local mongodb instance for this example).

## Built With

- [ExpressJS](http://expressjs.com/) - App main framework
- [MongoDB](https://www.mongodb.com/) - Database
- [GraphQL](https://graphql.org/) - Query language
- [Scrypt](https://github.com/barrysteyn/node-scrypt) - Solution for data encryption
- [Mailgun](https://www.mailgun.com/) - Mail expedition
- [EJS](http://www.embeddedjs.com/) - Template renderer
- [Babel](https://babeljs.io/) - ES6/ES7 Transpiler.
- [Xml2js](https://github.com/Leonidas-from-XIV/node-xml2js) - XML parser.

## Contributing

Please read [CONTRIBUTING.md](https://gist.github.com/PurpleBooth/b24679402957c63ec426) for details on our code of conduct, and the process for submitting pull requests to us.

## Authors

- **CYB3RL1F3** - _Lead developer_ - [Github](https://github.com/CYB3RL1F3)

## License

This project is licensed under the MIT License - see the [LICENSE.md](LICENSE.md) file for details
