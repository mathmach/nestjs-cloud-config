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
          .map((param: any) => {
            const regex = new RegExp('\\${(.*?)}', 'g');
            let match: RegExpExecArray;
            switch (typeof param) {
              case 'string':
                match = regex.exec(param);
                if (match) {
                  param = this.configService.get<string>(match[1]) || param;
                }
                break;
              case 'object':
                for (const key in param) {
                  if (Object.prototype.hasOwnProperty.call(param, key)) {
                    const element = param[key];
                    if (typeof element === 'string') {
                      match = regex.exec(element);
                      if (match) {
                        param[key] = this.configService.get(match[1]) || process.env[match[1]] || param;
                      }
                    }
                  }
                }
                break;
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
