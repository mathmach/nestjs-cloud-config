import * as joi from 'joi';

export const CloudConfigOptionsSchema = joi.object().keys({
  bootstrapPath: joi.string(),
  configPath: joi.string(),
  envFilePath: joi.alternatives().try(joi.array().items(joi.string()), joi.string())
});

export const BootstrapConfigSchema = joi.object().keys({
  spring: joi.object().keys({
    cloud: joi.object().keys({
      config: joi.object().keys({
        enabled: joi.boolean(),
        'fail-fast': joi.boolean(),
        retry: joi.object().keys({
          enabled: joi.boolean(),
          'max-attempts': joi.number(),
          'max-interval': joi.number(),
          'initial-interval': joi.number(),
          multiplier: joi.number()
        }),
        name: joi.string(),
        profiles: joi.alternatives().try(joi.array().items(joi.string()), joi.string()),
        endpoint: joi.string().uri(),
        label: joi.string(),
        rejectUnauthorized: joi.boolean(),
        auth: joi.object().keys({
          user: joi.string(),
          pass: joi.string()
        })
      })
    })
  })
});