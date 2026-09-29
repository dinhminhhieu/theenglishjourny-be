import { Skill } from '../../generated/prisma/client';
import { SkillDto } from './dto/skill.dto';

export function toSkillDto(skill: Skill): SkillDto {
  return {
    id: skill.id,
    name: skill.name,
    description: skill.description,
    sortOrder: skill.sortOrder,
    isActive: skill.isActive,
    createdAt: skill.createdAt,
    updatedAt: skill.updatedAt,
  };
}
