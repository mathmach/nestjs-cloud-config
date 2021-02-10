import { CloudConfigModule, SpringCloudConfig } from '@nestjs-ext/cloud-config';
import { INestApplication } from '@nestjs/common';
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
    const springCloudConfig = app.get<SpringCloudConfig>(SpringCloudConfig);
    expect( springCloudConfig.getConfig()).toBeDefined();    
  });
});
