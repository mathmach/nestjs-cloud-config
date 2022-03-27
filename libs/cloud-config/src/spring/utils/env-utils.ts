import { Logger } from '@nestjs/common';
import * as _ from 'lodash';

export class EnvUtils {

  private static logger = new Logger('EnvUtils');

  public static replaceTemplateStringWithEnv(obj: any): any {
    try {
      let config = JSON.stringify(obj);
      let strings: Array<RegExpExecArray> = this.getAllTemplateStrings(config);
      const notFound: Array<RegExpExecArray> = [];
      while (strings.length > 0) {
        strings
          .forEach((regex: RegExpExecArray) => {
            const values: Array<string> = regex[1].split(':');
            const match = regex[0];
            const key = values[0];
            const defaultValue = values.slice(1).join(':');
            let value = process.env[key];
            if (value) {
              config = config.replace(match, value);
            } else {
              notFound.push(regex);
              value = _.get(obj, key) || defaultValue;
              if (!value) {
                this.logger.warn(`Missing env found: ${key}`);
              } else {
                config = config.replace(match, value);
              }
            }
          });
        strings = this.getAllTemplateStrings(config)
          .filter((regex: RegExpExecArray) => notFound.findIndex((r: RegExpExecArray) => r[0] === regex[0]) === -1);
      }
      this.logger.debug('Successfully replaced template strings with local envs');
      return this.removeEmpty(JSON.parse(config));
    } catch (error) {
      this.logger.error('Error while replacing template strings with local envs', error);
      throw error;
    }
  }

  private static getAllTemplateStrings(config: string): Array<RegExpExecArray> {
    const regex = new RegExp('\\${(.*?)}', 'g');
    const strings = new Array<RegExpExecArray>();
    let match: RegExpExecArray;
    while (match = regex.exec(config)) {
      strings.push(match);
    }
    return strings;
  }

  private static removeEmpty(obj: any) {
    let finalObj = {};
    Object.keys(obj).forEach((key: string) => {
      if (obj[key] && typeof obj[key] === 'object') {
        const nestedObj = this.removeEmpty(obj[key]);
        if (Object.keys(nestedObj).length) {
          finalObj[key] = nestedObj;
        }
      } else if (obj[key] !== '' && obj[key] !== undefined && obj[key] !== null) {
        finalObj[key] = obj[key];
      }
    });
    return finalObj;
  }


}