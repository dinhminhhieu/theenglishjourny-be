import { Module } from '@nestjs/common';
import { AdminSkillController } from './admin-skill.controller';
import { SkillService } from './skill.service';

@Module({
  controllers: [AdminSkillController],
  providers: [SkillService],
  exports: [SkillService],
})
export class SkillModule {}
