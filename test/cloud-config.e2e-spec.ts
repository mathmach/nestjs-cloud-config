import { CloudConfigModule, SpringCloudConfig } from '@nestjs-ext/cloud-config';
import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';

describe('CloudConfigModule (e2e)', () => {

  let app: INestApplication;

  beforeEach(async function () {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [CloudConfigModule.register({
        configPath: './test/fixtures',
        envFilePath: ['./test/fixtures/.env']
      })]
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('/ (GET)', function () {
    const configService = app.get<ConfigService>(ConfigService);
    expect(configService.get('testUrl')).toEqual('http://www.default.com');
    expect(configService.get('spring.cloud.config.profiles')).toContain('local');
    expect(configService.get('featureFlags.feature1')).toEqual('false');
    expect(configService.get('featureFlags.feature2')).toEqual('${TEST}');
  });
});
