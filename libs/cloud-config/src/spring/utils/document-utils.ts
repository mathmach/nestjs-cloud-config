import { Logger } from '@nestjs/common';
import * as extend from 'extend';
import * as fs from 'fs';
import * as yaml from 'js-yaml';
import { Document } from '../models';
import * as _ from 'lodash';
import { EnvUtils } from './env-utils'

export class DocumentUtils {

  private static logger: Logger = new Logger('DocumentUtils');

  public static shouldUseDocument(document: Document | undefined, activeProfiles?: string[]): boolean {
    let useThisDoc: boolean = false;
    if (document && !document.profiles) {
      useThisDoc = true;
    } else if (document && activeProfiles) {
      const documentProfiles: string[] = document.profiles.split(',');
      for (let i = 0; i < documentProfiles.length; i++) {
        if (documentProfiles[i][0] === '!') {
          const excludedProfile: string = documentProfiles[i].substring(1);
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

  public static readYaml(relativePath: string, activeProfiles?: string[]): Document {
    this.logger.debug('loading config file from: ' + relativePath);
    let doc: Document = {};
    yaml.loadAll(fs.readFileSync(relativePath, 'utf8'), (thisDoc: any) => {
      if (this.shouldUseDocument(thisDoc, activeProfiles)) {
        extend(true, doc, thisDoc);
      }
    });

    return doc;
  };

  public static parsePropertiesToObjects(propertiesObject: any | undefined): any {
    var any: any = {};
    if (propertiesObject) {
      for (let thisPropertyName in propertiesObject) {
        _.set(any, thisPropertyName, propertiesObject[thisPropertyName]);
      }
    }
    return EnvUtils.replaceTemplateStringWithEnv(any);
  };

  public static readYamlAsDocument(relativePath: string, activeProfiles?: string[]): Document {
    return this.parsePropertiesToObjects(this.readYaml(relativePath, activeProfiles));
  };

  public static mergeProperties(objects: any[]): any {
    var mergedConfig: any = {};
    for (var i = 0; i < objects.length; i++) {
      extend(true, mergedConfig, objects[i]);
    }

    return mergedConfig;
  };

}