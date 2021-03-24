
import { Injectable } from '@nestjs/common';
import * as CloudConfigClient from 'nice-cloud-config-client';
import { ConfigClientOptions, ConfigObject } from '../models/cloud-config';
import { DocumentUtils } from '../utils/document-utils';

@Injectable()
export class SpringCloudConfigGatewayImpl {

  public async getConfigFromServer(configClientOptions: ConfigClientOptions): Promise<ConfigObject> {
    let cloudConfig: ConfigObject = {};
    const cloudConfigProperties: ConfigObject = await CloudConfigClient.load(configClientOptions, undefined);
    if (cloudConfigProperties) {
      cloudConfigProperties.forEach(function (key: string, value: any) {
        cloudConfig[key] = value;
      }, false);
      cloudConfig = DocumentUtils.parsePropertiesToObjects(cloudConfig);
    }

    return cloudConfig;
  }

}