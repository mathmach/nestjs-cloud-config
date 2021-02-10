
import { Inject, Injectable } from '@nestjs/common';
import { CLOUD_CONFIG } from '../constants/constants';
import { ConfigObject } from './models';

@Injectable()
export class SpringCloudConfig {

  constructor(
    @Inject(CLOUD_CONFIG) private readonly config: ConfigObject
  ) { }

  public getConfig(): ConfigObject {
    return this.config;
  }

}