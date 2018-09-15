import fs from 'fs';
import ejs from 'ejs';

export class Template {
    getPath = (file) => `${__dirname}/../templates/${file}`;

    getConvertedBr = (html) => html.replace(/\&lt;br \/&gt;/g, '<br />');

    render = (file, params, convertBr) =>
        new Promise((resolve, reject) => {
            file = this.getPath(file);
            fs.readFile(file, 'utf8', (err, template) => {
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
