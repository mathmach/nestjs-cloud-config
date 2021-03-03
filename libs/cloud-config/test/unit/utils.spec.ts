import { RetryOptions, RetryState } from '@nestjs-ext/cloud-config/spring';
import { Document } from '@nestjs-ext/cloud-config/spring/models/cloud-config';
import { DocumentUtils, EnvUtils, RetryUtils } from '@nestjs-ext/cloud-config/spring/utils';
import * as chai from 'chai';
import { assert } from 'chai';
import * as chaiAsPromised from 'chai-as-promised';
import * as sinon from 'sinon';
import { SinonStub } from 'sinon';

chai.use(chaiAsPromised);
chai.should();

describe('utils', function () {

  describe('#readYaml()', function () {

    it('should read test yaml without profiles', async function () {
      const testProperties = DocumentUtils.readYaml('./libs/cloud-config/test/fixtures/readYaml/test.yml');
      assert.deepEqual(testProperties['test.unit.testBool'], true);
      assert.deepEqual(testProperties['test.unit.testString'], 'testing');
      assert.deepEqual(testProperties['test.unit.testNumber'], 12345);
    });

    it('should read yaml and parse doc by profiles', async function () {
      const testProperties = DocumentUtils.readYaml('./libs/cloud-config/test/fixtures/readYaml/test-yaml-docs.yml', ['development']);
      assert.deepEqual(testProperties['test.unit.testBool'], true);
      assert.deepEqual(testProperties['test.unit.testString'], 'testing again');
      assert.deepEqual(testProperties['test.unit.testNumber'], 23456);
    });

    it('should read yaml and parse doc by profiles, even with multiple profiles', async function () {
      const testProperties = DocumentUtils.readYaml('./libs/cloud-config/test/fixtures/readYaml/test-yaml-with-profiles.yml', ['env1', 'env4']);
      assert.deepEqual(testProperties.urlProperty, 'http://www.testdomain-shared.com');
      assert.deepEqual(testProperties.propertyGroup.groupProperty, false);
    });

  });

  describe('#mergeProperties()', function () {

    it('should merge properties between two files', async function () {
      const obj1 = {
        'test.unit.testBool': true,
        'test.unit.testString': 'testing',
        'test.unit.testNumber': 12345
      };
      const obj2 = {
        'test.unit.testBool': true,
        'test.unit.testString': 'testing again',
        'test.unit.testNumber': 12345
      };

      const mergedProperties = DocumentUtils.mergeProperties([obj1, obj2]);
      assert.deepEqual(mergedProperties['test.unit.testBool'], true);
      assert.deepEqual(mergedProperties['test.unit.testString'], 'testing again');
      assert.deepEqual(mergedProperties['test.unit.testNumber'], 12345);
    });

  });

  describe('#parsePropertiesToObjects()', function () {

    it('should skip undefined any', async function () {
      const mergedProperties = undefined;
      const configObject = DocumentUtils.parsePropertiesToObjects(mergedProperties);
      assert.deepEqual(configObject, {});
    });

    it('should parse dot-separated properties into JS any', async function () {
      const mergedProperties = {
        'test.unit.testBool': true,
        'test.unit.testString': 'testing again',
        'test.unit.testNumber': 12345
      };
      const expectedObject = {
        test: {
          unit: {
            testBool: true,
            testString: 'testing again',
            testNumber: 12345
          }
        }
      };
      const configObject = DocumentUtils.parsePropertiesToObjects(mergedProperties);
      assert.deepEqual(configObject, expectedObject);
    });

  });

  describe('#shouldUseDocument()', function () {

    it('should not use undefined document', async function () {
      const doc: Document | undefined = undefined;
      const activeProfiles: Array<string> = ['aProfile'];
      // @ts-ignore
      assert.deepEqual(DocumentUtils.shouldUseDocument(doc, activeProfiles), false);
    });

    it('should not use document that has profiles, but no activeProfiles input', async function () {
      const doc: Document = { 'profiles': 'aProfile' };
      const activeProfiles: Array<string> | undefined = undefined;
      assert.deepEqual(DocumentUtils.shouldUseDocument(doc, activeProfiles), false);
    });

    it('should use document when doc.profiles is undefined', async function () {
      const doc: Document = {};
      const activeProfiles: Array<string> = ['aProfile'];
      assert.deepEqual(DocumentUtils.shouldUseDocument(doc, activeProfiles), true);
    });

    it('should use document when activeProfiles matches a single doc.profiles', async function () {
      const doc: Document = { 'profiles': 'devEast' };
      const activeProfiles: Array<string> = ['devEast'];
      assert.deepEqual(DocumentUtils.shouldUseDocument(doc, activeProfiles), true);
    });

    it('should use document when one of activeProfiles matches one of doc.profiles', async function () {
      const doc: Document = { 'profiles': 'devEast,devWest,stagingEast' };
      let activeProfiles: Array<string> = ['devEast'];
      assert.deepEqual(DocumentUtils.shouldUseDocument(doc, activeProfiles), true);
      activeProfiles = ['devWest'];
      assert.deepEqual(DocumentUtils.shouldUseDocument(doc, activeProfiles), true);
      activeProfiles = ['stagingEast'];
      assert.deepEqual(DocumentUtils.shouldUseDocument(doc, activeProfiles), true);
    });

    it('should use document when multiple doc.profiles match active profiles', async function () {
      const doc: Document = { 'profiles': 'devEast,devWest,stagingEast' };
      let activeProfiles: Array<string> = ['devEast', 'devWest'];
      assert.deepEqual(DocumentUtils.shouldUseDocument(doc, activeProfiles), true);
      activeProfiles = ['devWest', 'stagingEast'];
      assert.deepEqual(DocumentUtils.shouldUseDocument(doc, activeProfiles), true);
      activeProfiles = ['stagingEast', 'devEast'];
      assert.deepEqual(DocumentUtils.shouldUseDocument(doc, activeProfiles), true);
    });

    it('should NOT use document when not operator used in doc.profiles for active profile', async function () {
      const doc: Document = { 'profiles': 'devEast,!devWest,stagingEast' };
      let activeProfiles: Array<string> = ['devEast', 'devWest'];
      assert.deepEqual(DocumentUtils.shouldUseDocument(doc, activeProfiles), false);
      activeProfiles = ['devWest', 'stagingEast'];
      assert.deepEqual(DocumentUtils.shouldUseDocument(doc, activeProfiles), false);
    });

    it('should use document when not operator used in doc.profiles for non-active profile', async function () {
      let doc: Document = { 'profiles': 'devEast,devWest,!stagingEast' };
      let activeProfiles: Array<string> = ['devEast', 'devWest'];
      assert.deepEqual(DocumentUtils.shouldUseDocument(doc, activeProfiles), true);
      doc = { 'profiles': 'devEast,!devWest,stagingEast' };
      activeProfiles = ['devEast'];
      assert.deepEqual(DocumentUtils.shouldUseDocument(doc, activeProfiles), true);
      doc = { 'profiles': '!devEast,devWest,stagingEast' };
      activeProfiles = ['devWest', 'stagingEast'];
      assert.deepEqual(DocumentUtils.shouldUseDocument(doc, activeProfiles), true);
    });

  });

  describe('#retryFunctionWithState()', function () {

    class TestClass {
      public async testFunction(): Promise<any> {
        return {};
      }
    }

    const sandbox = sinon.createSandbox();
    const testMethod = new TestClass();

    let testStub: SinonStub;

    beforeEach(async function () {
      testStub = sandbox.stub(testMethod, 'testFunction');
    });

    afterEach(async function () {
      sandbox.restore();
    });

    it('should throw error when gateway throws error after max retry attempts is exceeded', async function () {
      testStub.throws(new Error('test error'));
      const retryOptions: RetryOptions = {
        enabled: true,
        'initial-interval': 100,
        'max-interval': 150,
        'max-attempts': 3
      };

      const retryPromise: Promise<any> = RetryUtils.retryFunctionWithState(() => testMethod.testFunction(), new RetryState(retryOptions));
      return retryPromise.should.eventually.be.rejectedWith('Error retrieving remote configuration: Maximum retries exceeded.');
    })

    it('should succeed if retry succeeds', async function () {
      testStub
        .onFirstCall().throws(new Error('test error'))
        .onSecondCall().throws(new Error('test error'))
        .onThirdCall().returns({});
      const retryOptions: RetryOptions = {
        enabled: true,
        'initial-interval': 100,
        'max-interval': 150,
        'max-attempts': 3
      };

      const retryPromise: Promise<any> = RetryUtils.retryFunctionWithState(() => testMethod.testFunction(), new RetryState(retryOptions));

      return retryPromise.should.eventually.be.fulfilled;
    });

  });

  describe('#replaceTemplateStringWithEnv()', function () {

    const OLD_ENV = process.env;

    beforeEach(async function () {
      process.env = { ...OLD_ENV };
    });

    afterEach(async function () {
      process.env = OLD_ENV;
    });

    it('should replace template string with env', async function () {
      process.env['TEST_BOOL'] = 'true';
      process.env['TEST_STRING'] = 'testing again';
      process.env['TEST_NUMBER'] = '12345';

      const mergedProperties = {
        'test.unit.testBool': '${TEST_BOOL}',
        'test.unit.testString': '${TEST_STRING}',
        'test.unit.testNumber': '${TEST_NUMBER}'
      };
      const expectedObject = {
        'test.unit.testBool': 'true',
        'test.unit.testString': 'testing again',
        'test.unit.testNumber': '12345'
      };
      const configObject = EnvUtils.replaceTemplateStringWithEnv(mergedProperties);
      assert.deepEqual(configObject, expectedObject);
    });

    it('should throw error when env not found', async function () {
      process.env['TEST_BOOL'] = 'true';
      process.env['TEST_STRING'] = 'testing again';

      const objWithTemplateString = {
        'test.unit.testBool': '${TEST_BOOL}',
        'test.unit.testString': '${TEST_STRING}',
        'test.unit.testNumber': '${TEST_NUMBER}'
      };
      const expectedObject = {
        'test.unit.testBool': 'true',
        'test.unit.testString': 'testing again',
        'test.unit.testNumber': '${TEST_NUMBER}'
      };
      const configObject = EnvUtils.replaceTemplateStringWithEnv(objWithTemplateString);
      assert.deepEqual(configObject, expectedObject);
    });

  });

});