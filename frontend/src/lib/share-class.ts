import { EntityType } from './api';

export const SHARE_CLASS_SUGGESTIONS: Record<EntityType, string[]> = {
  LLC:  ['quota'],
  SJSC: ['ordinary', 'preferred-a', 'preferred-b', 'founder-common', 'employee-common'],
  JSC:  ['ordinary', 'preferred'],
};

export function defaultShareClass(entityType: EntityType | undefined): string {
  if (entityType === 'LLC') return 'quota';
  return 'ordinary';
}

export function isShareClassLocked(entityType: EntityType | undefined): boolean {
  return entityType === 'LLC';
}

export function shareClassLabel(entityType: EntityType | undefined): string {
  if (entityType === 'LLC') return 'Share class (LLC partner quota)';
  return 'Share class';
}
