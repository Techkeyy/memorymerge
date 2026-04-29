# @memorymerge/openclaw

> OpenClaw skill integration for MemoryMerge.

## Usage

```typescript
import { createMemoryMergeSkill } from '@memorymerge/openclaw';

const skill = createMemoryMergeSkill({
  agentId: 'my-agent',
  swarmId: 'my-swarm',
  reflectionInterval: 8,
});

await skill.initialize();

// OpenClaw turn hooks:
const context = await skill.onTurnStart();
await skill.onTurnEnd(userInput, response);

// Direct operations:
await skill.remember('user prefers TypeScript', 0.9);
const results = await skill.recall('TypeScript');
await skill.reflect();
```
