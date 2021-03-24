import { CustomDecorator, SetMetadata } from '@nestjs/common';
import { CONFIGURATION } from '../constants/constants';

export const Configuration = (decorator: (...params: any) => CustomDecorator | MethodDecorator | ClassDecorator, ...params: any) => SetMetadata(CONFIGURATION, { decorator, params });
