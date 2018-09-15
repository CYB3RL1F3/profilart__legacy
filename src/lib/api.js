import request from 'request';
import xml2js from 'xml2js';

export class Api {
    requestAndParseXML = async (options) => {
        const response = await this.request(options);
        return await this.parseXML(response);
    };

    requestAndParseJSON = async (options) => {
        const response = await this.request(options);
        return await JSON.parse(response.body);
    };

    request = (options) =>
        new Promise((resolve, reject) => {
            request(options, (error, response) => {
                if (!error && response.statusCode == 200) {
                    resolve(response);
                } else {
                    reject(error);
                }
            });
        });

    parseXML = (response) =>
        new Promise((resolve, reject) => {
            const parser = new xml2js.Parser();
            parser.parseString(response.body, (error, data) => {
                if (data && !error) {
                    resolve(data);
                } else {
                    reject(error);
                }
            });
        });
}

export default Api;
