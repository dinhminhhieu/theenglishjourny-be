import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { AppConfigService } from '../../config/env.validation';
import { AdminUploadController } from './admin-upload.controller';
import { AssetService } from './asset.service';
import { OBJECT_STORAGE } from './object-storage';
import { S3ObjectStorage } from './s3-object-storage';

@Module({
  controllers: [AdminUploadController],
  providers: [
    {
      provide: OBJECT_STORAGE,
      inject: [ConfigService],
      useFactory: (config: AppConfigService) => new S3ObjectStorage(config),
    },
    AssetService,
  ],
  exports: [AssetService, OBJECT_STORAGE],
})
export class StorageModule {}
