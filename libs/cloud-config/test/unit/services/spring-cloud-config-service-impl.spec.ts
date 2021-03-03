import { ConfigObject, RetryOptions } from '@nestjs-ext/cloud-config/spring';
import { SpringCloudConfigGatewayImpl } from '@nestjs-ext/cloud-config/spring/gateways';
import { SpringCloudConfigServiceImpl } from '@nestjs-ext/cloud-config/spring/services';
import * as chai from 'chai';
import { assert } from 'chai';
import * as chaiAsPromised from 'chai-as-promised';
import 'reflect-metadata';
import * as sinon from 'sinon';
import { SinonStub } from 'sinon';

chai.use(chaiAsPromised);
chai.should();

describe('SpringCloudConfigServiceImpl', function () {
  const sandbox = sinon.createSandbox();
  const springCloudConfigGatewayImpl = new SpringCloudConfigGatewayImpl();
  const springCloudConfigServiceImpl = new SpringCloudConfigServiceImpl(springCloudConfigGatewayImpl);

  let gatewayStub: SinonStub;
  let bootstrapConfig: ConfigObject;

  describe('#getConfigFromServer()', function () {

    beforeEach(async function () {
      gatewayStub = sandbox.stub(springCloudConfigGatewayImpl, 'getConfigFromServer');
      bootstrapConfig = {
        spring: {
          cloud: {
            config: {
              enabled: true,
              name: 'the-application-name',
              endpoint: 'http://somenonexistentdomain:8888'
            }
          }
        },
      };
    });

    afterEach(async function () {
      sandbox.restore();
    });

    it('should skip cloud config when not enabled', async function () {
      bootstrapConfig.spring.cloud.config.enabled = false;

      const getConfigFromServer: Promise<ConfigObject> = springCloudConfigServiceImpl.getConfigFromServer(bootstrapConfig);

      return getConfigFromServer.should.eventually.be.fulfilled.then((config: ConfigObject) => {
        assert.deepEqual(config, {});
      });
    });

    it('should skip cloud config when gateway throws error (without fail-fast)', async function () {
      gatewayStub.throws(new Error('some error'));

      const getConfigFromServer: Promise<ConfigObject> = springCloudConfigServiceImpl.getConfigFromServer(bootstrapConfig);

      return getConfigFromServer.should.eventually.be.fulfilled.then((config: ConfigObject) => {
        assert.deepEqual(config, {});
      });
    });

    it('should throw error when gateway throws error and fail-fast is true, retry disabled', async function () {
      gatewayStub.throws(new Error('some error'));
      bootstrapConfig.spring.cloud.config['fail-fast'] = true;

      const getConfigFromServer: Promise<ConfigObject> = springCloudConfigServiceImpl.getConfigFromServer(bootstrapConfig);

      return getConfigFromServer.should.eventually.be.rejected;
    });

    it('should throw error when gateway throws error after max retry attempts is exceeded', async function () {
      gatewayStub.throws(new Error('some error'));
      bootstrapConfig.spring.cloud.config['fail-fast'] = true;
      bootstrapConfig.spring.cloud.config.retry = {
        enabled: true,
        'initial-interval': 100,
        'max-interval': 150,
        'max-attempts': 3
      };

      const getConfigFromServer: Promise<ConfigObject> = springCloudConfigServiceImpl.getConfigFromServer(bootstrapConfig);

      return getConfigFromServer.should.eventually.be.rejectedWith('Error retrieving remote configuration: Maximum retries exceeded.');
    });

    it('should succeed if remote configuration retrieval succeeds', async function () {
      gatewayStub.returns({
        testUrl: 'http://www.default-local.com',
        featureFlags: {
          feature1: true,
          feature2: false
        }
      });
      bootstrapConfig.spring.cloud.config['fail-fast'] = true;

      const getConfigFromServer: Promise<ConfigObject> = springCloudConfigServiceImpl.getConfigFromServer(bootstrapConfig);

      return getConfigFromServer.should.eventually.be.fulfilled.then((config: ConfigObject) => {
        assert.deepEqual(config.testUrl, 'http://www.default-local.com');
        assert.deepEqual(config.featureFlags.feature1, true);
        assert.deepEqual(config.featureFlags.feature2, false);
      });
    });

    it('should succeed if retry succeeds', async function () {
      gatewayStub
        .onFirstCall().throws(new Error('some error'))
        .onSecondCall().throws(new Error('some error'))
        .onThirdCall().returns(Promise.resolve({ forEach(callback: Function, aBoolValue: boolean) { } }));
      bootstrapConfig.spring.cloud.config['fail-fast'] = true;
      bootstrapConfig.spring.cloud.config.retry = {
        enabled: true,
        'initial-interval': 100,
        'max-interval': 150,
        'max-attempts': 3
      };

      const getConfigFromServer: Promise<ConfigObject> = springCloudConfigServiceImpl.getConfigFromServer(bootstrapConfig);

      return getConfigFromServer.should.eventually.be.fulfilled;
    });

  });

});