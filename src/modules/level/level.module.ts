import { Module } from '@nestjs/common';
import { AdminLevelController } from './admin-level.controller';
import { LevelService } from './level.service';

@Module({
  controllers: [AdminLevelController],
  providers: [LevelService],
  exports: [LevelService],
})
export class LevelModule {}
