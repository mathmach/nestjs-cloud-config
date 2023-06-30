import { Logger } from '@nestjs/common';
import * as extend from 'extend';
import * as fs from 'fs';
import * as yaml from 'js-yaml';
import * as _ from 'lodash';
import { Document } from '../models/cloud-config';
import { EnvUtils } from './env-utils';

export class DocumentUtils {

  private static logger = new Logger('DocumentUtils');

  public static shouldUseDocument(document: Document | undefined, activeProfiles?: Array<string>): boolean {
    let useThisDoc = false;
    if (document && !document.profiles) {
      useThisDoc = true;
    } else if (document && activeProfiles) {
      const documentProfiles: Array<string> = document.profiles.split(',');
      for (let i = 0; i < documentProfiles.length; i++) {
        if (documentProfiles[i][0] === '!') {
          const excludedProfile = documentProfiles[i].substring(1);
          if (activeProfiles.indexOf(excludedProfile) >= 0) {
            return false;
          }
        } else if (activeProfiles.indexOf(documentProfiles[i]) >= 0) {
          useThisDoc = true;
        }
      }
    }

    return useThisDoc;
  };

  public static readYaml(relativePath: string, activeProfiles?: Array<string>): Document {
    this.logger.debug('loading config file from: ' + relativePath);
    const doc: Document = {};
    if (fs.existsSync(relativePath)) {
      yaml.loadAll(fs.readFileSync(relativePath, 'utf8'), (thisDoc: any) => {
        if (this.shouldUseDocument(thisDoc, activeProfiles)) {
          extend(true, doc, thisDoc);
        }
      });
    }

    return doc;
  };

  public static parsePropertiesToObjects(propertiesObject: any | undefined): any {
    const any = {};
    if (propertiesObject) {
      for (const thisPropertyName in propertiesObject) {
        _.set(any, thisPropertyName, propertiesObject[thisPropertyName]);
      }
    }
    return EnvUtils.replaceTemplateStringWithEnv(any);
  };

  public static readYamlAsDocument(relativePath: string, activeProfiles?: Array<string>): Document {
    return this.parsePropertiesToObjects(this.readYaml(relativePath, activeProfiles));
  };

  public static mergeProperties(objects: Array<any>): any {
    const mergedConfig = {};
    for (let i = 0; i < objects.length; i++) {
      extend(true, mergedConfig, objects[i]);
    }

    return mergedConfig;
  };

}