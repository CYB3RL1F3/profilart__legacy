# Profilart


**Profilart** is an open-source service that provides data of electronic music artists through sockets to apps, websites...

Each artist or manager creates a profile providing API credentials from RA & discogs (and later soundcloud & youtube).

The interest of the project consists in avoiding data repetition on the web by using backoffices for apps whereas data like bio, gigs, discography... is already available on those popular services which provide APIs.

Concentrating multiple source of data in one API accessible with just a simple UID affected to a profile is an interesting way of approaching data consumption. This open-source project initially made to respond to a personal need, is a concrete example of how we could approach web data in the future : avoiding redondance and platforms multiplication hell connecting all services together in one.

Data provided from different services are also locally persisted. In case of unavailability of service, data could be restored from the local database.

The websocket approach is taken instead of REST APIs that are longer to execute because of its "disconnected nature". Persisting connection between a client and a provider looks being the solution of the future.

This project provides also a mailer service, to create contact form or mailing notification, based on the nodejs library nodemailer.

This project is available on *github* in order to stay evolutive. Anyone could fork this and bring code correction and new features on this project targetting mostly electronic music artists who have their gigs on resident advisor, discography on discogs & tracks on soundcloud.

## Getting Started

### Prerequisites

* [Mongodb](https://www.mongodb.com/)
* [Node 6.0 & more...](https://nodejs.org/en/)
* [Yarn](https://github.com/yarnpkg/yarn)

### Installing

1. If Yarn's not installed yet, set up yarn on your machine.

    run `> npm install yarn -g`

2. run `> git clone `

3. In **package.json**, define env specific variables (see [Environments](#Environments))

4. run `> yarn install` to install dependencies.

5. Create a database in your mongodb database. (exemple : `cyberlife`). [see tutorial](https://www.tutorialspoint.com/mongodb/mongodb_create_database.htm)

6. define the variable environment MONGODB_URI with your database address (example : `MONGODB_URI=mongodb://localhost:27017/cyberlife`)

6. define the port to be used (default is 3000)

7. run `> MONGODB_URI='mongodb://localhost:27017/cyberlife' PORT=3000 yarn start` to launch the service

## Using the app

### 1. Connect to the app through websocket

```
    import io from 'socket.io-client';

    const socket = new io.Socket();

    socket.connect('http://127.0.0.1:3000');

    // Add a connect listener
    socket.on('connect', (s) => {
      console.log('connected');
    });
```

### 2. Create a profile and get a UID

Feed the database with credentials in a collection called "profile". Credentials must contain RA API credentials, Discogs artist id, mailer informations (to send & receive mails to artist or booker)... All informations are not mendatory, but without RA API credentials for example, it will be impossible to get bio & events...

To do so, you can call the endpoint 'create'. This is the lone that doesn't require
UID to be executed.

To create a profile, call the service with a payload respecting this architecture :

```
{
	"query": "create",
	"args": {
		"password": "MyPassword",
		"RA": {
			"accessKey": "myAccessKeyRA",
			"DJID": "1234",
			"userId": "1234"
		},
		"artistName": "Cyberlife",
		"discogs": {
			"artistId": "5220846"
		},
		"mailer": {
			"recipient": "yolo@gmail.com",
			"prefix": "Cyberlife :: ",
			"service": "gmail",
			"host": "smtp.gmail.com",
			"auth": {
				"user": "noreply@gmail.com",
				"pass": "password"
			}
		}
	}
}
```

Note : you can also send other arguments, if you need to store some other informations for your client application.

#### Update profile :

Same payload as create, but *uid* must be mentionned.

The *password* key must contain the current password. To create another one, add a key *newPassword* with the new one as value.

```
{
	"uid": "4d5c933a",
	"query": "update",
	"args": {
		"password": "mypassword",
        "newPassword": "myNewPassword",
		"RA": {
			"accessKey": "05021f56-8819-46c3-b1d7-f4fa15a8cc4d",
			"DJID": "66232",
			"userId": "145842"
		},
		"artistName": "Cyberlife",
		"discogs": {
			"artistId": "5220846"
		},
		"mailer": {
			"recipient": "deikean@gmail.com",
			"prefix": "Cyberlife :: ",
			"service": "gmail",
			"host": "smtp.gmail.com",
			"auth": {
				"user": "cyberlife.music@gmail.com",
				"pass": "Rvx_hacker471"
			}
		}
	}
}
```

Note : the password is stored in the database as an hash, using [scrypt](https://github.com/barrysteyn/node-scrypt).

To read your profile, call *profile*. The profile's password is not displayed on the response.

#### Where to find data ?

RA API informations are provided on the resident advisor backoffice of your artist page, in the tab API.

![RA](https://img11.hostingpics.net/pics/36672576RA.jpg)

Discogs needs (at the moment) only to know the artist ID you can find on the URL of your page :

![Discogs](https://img11.hostingpics.net/pics/951665Capturedecran20170906a030824.png)

/!\ Forthcoming evolutions of discogs might need oAuth informations !!

#### Configure mailer with your Gmail account :

```
{
    host: 'smtp.gmail.com',
    service: gmail,
    auth: {
        user: 'xxx@gmail.com',
        pass: 'yourpassword'
    }
}
```

### 3. Send formatted messages like this :

```
// s is a socket instance
s.emit({
    uid: xxx,
    query: xxx,
    args: {
        xxx: xxx
    }
})
```

Query detail :

* **uid** : the profile ID associate to the artist
* **query** : the name of the query. Actually available :
    * *events*
    * *releases*
    * *infos*
    * *charts*
    * *contact*
    * *profile*
    * *create* : creates the profile
    * *update* : updates the profile
    * *all* : a mixture of all previous queries
* **args** : args of the queries :
    * events :
        * type :
            * 1 = forthcoming events
            * 2 = previous events
    * contact :
        * name
        * email
        * subject
        * message

Example of request :

```
{
    uid: 123456,
    query: 'events',
    args: {
        type: 1
    }
}
```
Response is provided under json format. It is constituted with the *status* indicating if the call works well or not, the *query* name, and the *data*. Example of response :

```
{
	"status": 1,
	"query": "events",
	"data": {
		"events": [
			{
				"id": "865713",
				"venueId": "119672",
				"date": "2016-08-24T00:00:00+00:00",
				"country": "France",
				"area": "Paris",
				"areaId": "44",
				"title": "La Station - Gare des Mines",
				"address": "29 avenue de la Porte d’Aubervilliers Paris",
				"lineup": [
					"Heartbeat",
					"Dasein",
					"Cyberlife",
					"Deikean",
					"Yan Kaylen",
					"Nulpar"
				],
				"time": {
					"begin": "19:00",
					"end": "02:00"
				},
				"cost": "Entrée à prix libre",
				"promoter": "",
				"links": {
					"event": "https://www.residentadvisor.net/event.aspx?865713",
					"venue": "https://www.residentadvisor.net/club-detail.aspx?id=119672"
				},
				"flyer": "https://www.residentadvisor.net/images/events/flyer/2016/8/fr-0824-865713-list.jpg"
			}
		]
	}
}
```

In case of error, you get something like this :

```
{
   "status": 0,
   "error": {
       "code": "404",
       "message": "this service doesn't exists"
   }
}
```

### Launch unit test

```
yarn run test
```

## Deployment

[soon]

## Built With

* [WS](http://www.dropwizard.io/1.0.2/docs/) - Websocket tool
* [ExpressJS](https://maven.apache.org/) - App builder
* [MongoDB](https://www.mongodb.com/) - Database
* [Scrypt](https://github.com/barrysteyn/node-scrypt) - Solution for data encryption
* [Nodemailer](https://nodemailer.com/about/) - NodeJS library for mail expedition
* [EJS](http://www.embeddedjs.com/) - Template renderer
* [Babel](https://babeljs.io/) - ES6/ES7 Transpiler.
* [Xml2js](https://github.com/Leonidas-from-XIV/node-xml2js) - XML parser.


## Contributing

Please read [CONTRIBUTING.md](https://gist.github.com/PurpleBooth/b24679402957c63ec426) for details on our code of conduct, and the process for submitting pull requests to us.

## Authors

* **CYB3RL1F3** - *Lead developer* - [Github](https://github.com/CYB3RL1F3)

## License

This project is licensed under the MIT License - see the [LICENSE.md](LICENSE.md) file for details
