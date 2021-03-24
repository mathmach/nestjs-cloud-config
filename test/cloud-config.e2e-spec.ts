import { CloudConfigModule } from '@nestjs-ext/cloud-config/cloud-config.module';
import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';

describe('CloudConfigModule (e2e)', () => {

  let app: INestApplication;

  beforeEach(async function () {
    const moduleFixture = await Test.createTestingModule({
      imports: [CloudConfigModule.register({
        configPath: './test/fixtures',
        envFilePath: ['./test/fixtures/.env.test']
      })]
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('/ (GET)', function () {
    const configService = app.get<ConfigService>(ConfigService);
    expect(configService.get('testUrl')).toEqual('http://www.default.com');
    expect(configService.get('spring.cloud.config.profiles')).toContain('local');
    expect(configService.get('featureFlags.feature1')).toBeUndefined();
    expect(configService.get('featureFlags.feature2')).toEqual('false');
    expect(configService.get('featureFlags.feature3')).toEqual('true');
    expect(configService.get('featureFlags.feature4')).toEqual('true');
    expect(configService.get('featureFlags.feature5')).toEqual('false:true');
  });
});
