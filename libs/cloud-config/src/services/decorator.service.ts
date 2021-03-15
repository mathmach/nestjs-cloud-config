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
    this.modules.forEach(({ providers, controllers }) => {
      this.bindListeners(providers);
      this.bindListeners(controllers);
    });
  }

  public bindListeners(controllers: Map<string, InstanceWrapper<Controller | InjectableInterface>>) {
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
            switch (typeof param) {
              case 'string':
                const value = this.parseConfigString(param);
                if (value) {
                  param = value;
                }
                break;
              case 'object':
                for (const key in param) {
                  if (Object.prototype.hasOwnProperty.call(param, key)) {
                    const element = param[key];
                    if (typeof element === 'string') {
                      const value = this.parseConfigString(element);
                      if (value) {
                        param[key] = value;
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

  private parseConfigString(configString: string): string {
    const regexp = new RegExp('\\${(.*?)}', 'g');
    const regex = regexp.exec(configString);
    if (regex) {
      const values: Array<string> = regex[1].split(':');
      const key = values[0];
      const defaultValue = values[1];
      return this.configService.get<string>(key, defaultValue);      
    }
    return null;
  }

}
