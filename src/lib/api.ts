import request, { Response, Options } from "request";
import { Parser } from "xml2js";

export class Api {
  requestAndParseXML = async <Result>(options: Options): Promise<Result> => {
    const response = await this.request(options);
    return await this.parseXML<Result>(response.body);
  };

  requestAndParseJSON = async <Result>(options: Options): Promise<Result> => {
    const response = await this.request(options);
    const data: Result = await JSON.parse(response.body);
    return data;
  };

  request = (options: Options) =>
    new Promise<Response>((resolve, reject) => {
      console.log('querying URL > ', options);
      request(options, (error, response) => {
        if (!error && response.statusCode == 200) {
          resolve(response);
        } else {
          console.log('ERROR:: ', error || response.statusCode);
          console.log(response);
          reject(error);
        }
      });
    });

  parseXML = <Result>(response: string) =>
    new Promise<Result>((resolve, reject) => {
      const parser: Parser = new Parser({
        cdata: true
      });
      parser.parseString(response, (error, data: Result) => {
        if (data && !error) {
          resolve(data);
        } else {
          reject(error);
        }
      });
    });
}

export default Api;
