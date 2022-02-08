import request, { Response, Options } from "request";
import { Parser } from "xml2js";

export class Api {
  requestAndParseXML = async <Result>(options: Options): Promise<Result> => {
    const response = await this.request(options);
    return await this.parseXML<Result>(response.body);
  };

  requestAndParseJSON = async <Result>(options: any): Promise<Result> => {
    const response = await this.request(options);
    const data: Result = await JSON.parse(response.body);
    return data;
  };

  request = (options: Options, expectsRedirection = false) =>
    new Promise<Response>((resolve, reject) => {
      request(options, (error, response) => {
        if (
          !error &&
          (response.statusCode == 200 ||
            response.statusCode === 201 ||
            ((response.statusCode === 302 || response.statusCode === 301) &&
              expectsRedirection))
        ) {
          resolve(response);
        } else {
          console.log("OPTIONS >> ", options);
          console.log("ERROR:: ", error || response.body);
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
