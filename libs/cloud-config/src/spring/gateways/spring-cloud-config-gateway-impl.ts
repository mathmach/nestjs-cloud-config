
import { Injectable } from '@nestjs/common';
import * as CloudConfigClient from 'nice-cloud-config-client';
import { ConfigClientOptions, ConfigObject } from '../models';
import { DocumentUtils } from '../utils';

@Injectable()
export class SpringCloudConfigGatewayImpl {

  public async getConfigFromServer(configClientOptions: ConfigClientOptions): Promise<ConfigObject> {
    let cloudConfig: ConfigObject = {};
    const cloudConfigProperties: ConfigObject | undefined = await CloudConfigClient.load(configClientOptions, undefined);
    if (cloudConfigProperties) {
      cloudConfigProperties.forEach(function (key: string, value: any) {
        cloudConfig[key] = value;
      }, false);
      cloudConfig = DocumentUtils.parsePropertiesToObjects(cloudConfig);
    }

    return cloudConfig;
  }

}