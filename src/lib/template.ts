import fs from "fs";
import ejs from "ejs";

export class Template {
  getPath = (file: string) => `${__dirname}/../templates/${file}`;

  getConvertedBr = (html: string) => html.replace(/\&lt;br \/&gt;/g, "<br />");

  render = <TemplateParams>(
    file: string,
    params: TemplateParams,
    convertBr: boolean
  ) =>
    new Promise<string>((resolve, reject) => {
      file = this.getPath(file);
      fs.readFile(file, "utf8", (err, template) => {
        if (err) {
          reject(err);
        } else {
          let html = ejs.compile(template)(params);
          if (convertBr) {
            html = this.getConvertedBr(html);
          }
          resolve(html);
        }
      });
    });
}

export default Template;
