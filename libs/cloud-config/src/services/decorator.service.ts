import { Injectable } from '@nestjs/common';
import { Controller } from '@nestjs/common/interfaces/controllers/controller.interface';
import { Injectable as InjectableInterface } from '@nestjs/common/interfaces/injectable.interface';
import { ConfigService } from '@nestjs/config';
import { ModulesContainer, Reflector } from '@nestjs/core';
import { InstanceWrapper } from '@nestjs/core/injector/instance-wrapper';
import { CONFIGURATION } from '../constants';

@Injectable()
export class DecoratorService {

  constructor(
    private readonly modules: ModulesContainer,
    private readonly reflector: Reflector,
    private readonly configService: ConfigService
  ) {
    this.modules.forEach(({ controllers }) => this.bindListeners(controllers));
  }

  public bindListeners(controllers: Map<string, InstanceWrapper<Controller>>) {
    controllers.forEach(wrapper => this.registerPatternHandlers(wrapper));
  }

  public async registerPatternHandlers(instanceWrapper: InstanceWrapper<Controller | InjectableInterface>) {
    const propNames = Object.getOwnPropertyNames(instanceWrapper.metatype.prototype);
    propNames.forEach((prop: string) => {
      const metadata: { decorator: any, params: Array<any> } = this.reflector.get(
        CONFIGURATION,
        instanceWrapper.metatype.prototype[prop]
      );

      if (metadata?.decorator) {
        metadata.params = metadata.params
          .filter((param: any) => typeof param === 'string')
          .map((param: any) => {
            const regex = new RegExp('\\${(.*?)}', 'g');
            const match = regex.exec(param);
            if (match) {
              param = this.configService.get<string>(match[1]) || param;
            }
            return param;
          })
        Reflect.decorate(
          [metadata.decorator(...metadata.params)],
          instanceWrapper.metatype.prototype,
          prop,
          Reflect.getOwnPropertyDescriptor(instanceWrapper.metatype.prototype, prop)
        );
      }
    });
  }

}
