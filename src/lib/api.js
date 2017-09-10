import request from 'request';
import xml2js from 'xml2js';

export class Api {

    requestAndParseXML = (options) => new Promise((resolve, reject) => {
        this.request(options).then((response) => {
            this.parseXML(response).then(resolve).catch(reject)
        }).catch(reject)
    })

    requestAndParseJSON = (options) => new Promise((resolve, reject) => {
        this.request(options).then((response) => {
            try {
                const json = JSON.parse(response.body);
                resolve(json);
            }
            catch (e) {
                reject(e);
            }
        }).catch(reject);
    })

    request = (options) => new Promise((resolve, reject) => {
        let query = request(options, (error, response) => {
            if (!error && response.statusCode == 200) {
                resolve(response);
            } else {
                console.log(response.data, response.statusCode);
                reject(error);
            }
        })
    })


    parseXML = (response) => new Promise((resolve, reject) => {
        const parser = new xml2js.Parser();
        parser.parseString(response.body, (error, data) => {
            if (data && !error) {
                resolve(data);
            } else {
                reject(error);
            }
        });
    })
}

export default Api;
