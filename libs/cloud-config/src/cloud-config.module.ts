import { DynamicModule, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CloudConfigModuleOptions } from './interfaces';
import { DecoratorService } from './services';
import { SpringCloudConfigGatewayImpl } from './spring/gateways';
import { SpringCloudConfigServiceImpl } from './spring/services';
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
          load: [async () => {
            const springCloudConfigGatewayImpl = new SpringCloudConfigGatewayImpl();
            const springCloudConfig = new SpringCloudConfigServiceImpl(springCloudConfigGatewayImpl);
            process.env = EnvUtils.replaceTemplateStringWithEnv(process.env);
            return await springCloudConfig.load(options)
          }]
        })
      ],
      providers: [
        DecoratorService
      ],
      exports: [
        ConfigModule
      ]
    };
  }

}
