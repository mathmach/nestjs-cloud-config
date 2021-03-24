import { DynamicModule, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CloudConfigModuleOptions } from './interfaces/clients-module.interface';
import { DecoratorService } from './services/decorator.service';
import { SpringCloudConfigGatewayImpl } from './spring/gateways/spring-cloud-config-gateway-impl';
import { SpringCloudConfigServiceImpl } from './spring/services/spring-cloud-config-service-impl';
import { EnvUtils } from './spring/utils/env-utils';

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
              .catch(() => null);
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
