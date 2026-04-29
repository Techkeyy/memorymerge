/**
 * @memorymerge/openclaw
 * 
 * OpenClaw skill integration for MemoryMerge.
 * Gives any OpenClaw agent persistent decentralized memory.
 * 
 * @example
 * import { createMemoryMergeSkill } from '@memorymerge/openclaw';
 * 
 * const skill = createMemoryMergeSkill({ agentId: 'my-agent' });
 * await skill.initialize();
 * 
 * const context = await skill.onTurnStart();
 * await skill.onTurnEnd(userInput, response);
 */

export {
  MemoryMergeSkill,
  createMemoryMergeSkill,
} from '../../../src/skill/MemoryMergeSkill';

export type {
  MemoryMergeSkillConfig,
  RecallResult,
  MemoryStats,
  OpenClawSkill,
} from '../../../src/skill/MemoryMergeSkill';
