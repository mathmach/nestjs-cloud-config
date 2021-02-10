import { ConfigModuleOptions } from '@nestjs/config';
import { RetryOptions } from './retry';

export interface CloudConfigOptions extends ConfigModuleOptions {
    bootstrapPath?: string;
    configPath: string;
    envFilePath?: string | string[];
}

export interface ConfigClientRetryOptions extends RetryOptions {}

export interface ConfigClientOptions {
    enabled: boolean;
    'fail-fast': boolean;
    name: string;
    retry?: ConfigClientRetryOptions;
}

export interface Document {
    [name: string]: any;
}

export interface ConfigObject extends Document {}