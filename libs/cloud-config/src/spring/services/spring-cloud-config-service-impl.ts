import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as yaml from 'js-yaml';
import { SpringCloudConfigGatewayImpl } from '../gateways/spring-cloud-config-gateway-impl';
import { CloudConfigOptions, ConfigClientOptions, ConfigObject } from '../models/cloud-config';
import { RetryState } from '../models/retry';
import { BootstrapConfigSchema, CloudConfigOptionsSchema } from '../schemas';
import { DocumentUtils } from '../utils/document-utils';
import { RetryUtils } from '../utils/retry-utils';

@Injectable()
export class SpringCloudConfigServiceImpl {

  private logger = new Logger('SpringCloudConfigServiceImpl');

  private bootstrapConfig: ConfigObject;
  private config: ConfigObject;

  constructor(
    private readonly springCloudConfigGatewayImpl: SpringCloudConfigGatewayImpl
  ) { }

  public async getConfigFromServer(bootstrapConfig: ConfigObject): Promise<ConfigObject> {
    const configClientOptions: ConfigClientOptions = bootstrapConfig.spring.cloud.config;
    const retryConfig = configClientOptions.retry;
    let cloudConfig: ConfigObject = {};

    if (configClientOptions.enabled) {
      this.logger.debug('Spring Cloud Options: ' + JSON.stringify(configClientOptions));

      const retryState = new RetryState(retryConfig);

      try {
        cloudConfig = await this.springCloudConfigGatewayImpl.getConfigFromServer(configClientOptions);
        this.logger.debug('Cloud Config: ' + JSON.stringify(cloudConfig));
      } catch (error) {
        this.logger.warn('Error reading cloud config: ', error);
        if (configClientOptions['fail-fast'] === true) {
          if (retryConfig && retryConfig.enabled === true) {
            cloudConfig = await RetryUtils.retryFunctionWithState<ConfigObject>(
              () => this.springCloudConfigGatewayImpl.getConfigFromServer(configClientOptions),
              retryState
            );
          } else {
            throw error;
          }
        }
      }
    }

    return cloudConfig;
  }

  private async readBootstrapConfig(options: CloudConfigOptions): Promise<ConfigObject> {
    const theBootstrapPath = options.bootstrapPath !== undefined ? options.bootstrapPath : options.configPath;
    const thisBootstrapConfig = DocumentUtils.readYamlAsDocument(`${theBootstrapPath}/bootstrap.yml`);

    const { error } = BootstrapConfigSchema.validate(thisBootstrapConfig, { allowUnknown: true });
    if (error) {
      throw new Error(error.details[0].message);
    }

    thisBootstrapConfig.spring.cloud.config.profiles = thisBootstrapConfig.spring?.cloud?.config?.profiles?.split(',');

    return thisBootstrapConfig;
  }

  private async readApplicationConfig(appConfigPath: string, activeProfiles: Array<string>): Promise<ConfigObject> {
    const applicationConfig = DocumentUtils.readYamlAsDocument(appConfigPath + '/application.yml', activeProfiles);
    const appConfigs = [applicationConfig];
    activeProfiles?.forEach((activeProfile: string) => {
      const profileSpecificYaml = 'application-' + activeProfile + '.yml';
      const profileSpecificYamlPath = appConfigPath + '/' + profileSpecificYaml;
      if (fs.existsSync(profileSpecificYamlPath)) {
        const propDoc = yaml.load(fs.readFileSync(profileSpecificYamlPath, 'utf8'));
        const thisDoc = DocumentUtils.parsePropertiesToObjects(propDoc);
        appConfigs.push(thisDoc);
      } else {
        this.logger.debug('Profile-specific yaml not found: ' + profileSpecificYaml);
      }
    });

    return DocumentUtils.mergeProperties(appConfigs);
  }

  private async readCloudConfig(theBootstrapConfig: ConfigObject): Promise<ConfigObject> {
    return await this.getConfigFromServer(theBootstrapConfig);
  }

  private async readConfig(options: CloudConfigOptions): Promise<ConfigObject> {
    const propertiesObjects: Array<ConfigObject> = [];

    this.bootstrapConfig = await this.readBootstrapConfig(options);
    this.logger.debug('Using Bootstrap Config: ' + JSON.stringify(this.bootstrapConfig));

    const applicationConfig = await this.readApplicationConfig(options.configPath, this.bootstrapConfig.spring?.cloud?.config?.profiles);
    this.logger.debug('Using Application Config: ' + JSON.stringify(applicationConfig));
    propertiesObjects.push(applicationConfig);

    if (applicationConfig.spring
      && applicationConfig.spring.cloud
      && applicationConfig.spring.cloud.config
      && applicationConfig.spring.cloud.config.name) {
      this.bootstrapConfig.spring.cloud.config.name = applicationConfig.spring.cloud.config.name;
    }

    const cloudConfig = await this.readCloudConfig(this.bootstrapConfig);
    propertiesObjects.push(cloudConfig);

    propertiesObjects.push(this.bootstrapConfig);

    this.config = DocumentUtils.mergeProperties(propertiesObjects);

    this.logger.debug('Using Config: ' + JSON.stringify(this.config));
    return this.config;
  }

  public async load(options: CloudConfigOptions): Promise<ConfigObject> {
    const { error } = CloudConfigOptionsSchema.validate(options);
    if (error) {
      throw new Error('Invalid options supplied. Please consult the documentation.');
    }

    return this.readConfig(options);
  }

}