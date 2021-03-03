import { Logger } from '@nestjs/common';
import { RetryState } from '../models';

export class RetryUtils {

  private static logger = new Logger('RetryUtils');

  public static async retryFunctionWithState<T>(aFunction: () => any, retryState: RetryState): Promise<T> {
    retryState.registerRetry();

    try {
      return await new Promise((resolve, reject) => {
        setTimeout(async () => {
          this.logger.warn(`retrying after ${retryState.currentInterval}ms...`);
          try {
            resolve(await aFunction());
          } catch (error) {
            reject(error);
          }
        }, retryState.currentInterval);
      });
    } catch (error) {
      return this.retryFunctionWithState<T>(aFunction, retryState);
    }
  };

}
