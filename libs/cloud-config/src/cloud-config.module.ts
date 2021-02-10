import { DynamicModule, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CLOUD_CONFIG } from './constants/constants';
import { CloudConfigModuleOptions } from './interfaces';
import { SpringCloudConfigGatewayImpl } from './spring/gateways';
import { SpringCloudConfigServiceImpl } from './spring/services';
import { SpringCloudConfig } from './spring/spring-cloud-config';
import { EnvUtils } from './spring/utils';

@Module({})
export class CloudConfigModule {

  static register(options: CloudConfigModuleOptions): DynamicModule {
    return {
      module: CloudConfigModule,
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: options.envFilePath,
          load: [() => EnvUtils.replaceTemplateStringWithEnv(process.env)]
        })
      ],
      providers: [
        SpringCloudConfigGatewayImpl,
        SpringCloudConfigServiceImpl,
        SpringCloudConfig,
        {
          inject: [SpringCloudConfigServiceImpl],
          provide: CLOUD_CONFIG,
          useFactory: async (springCloudConfig: SpringCloudConfigServiceImpl) => await springCloudConfig.load(options)
        }
      ],
      exports: [
        SpringCloudConfig
      ]
    };
  }

}
