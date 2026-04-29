# MemoryMerge Packages

This monorepo contains the following packages:

| Package | Version | Description |
|---------|---------|-------------|
| [@memorymerge/core](./memorymerge-core) | 0.1.0 | Core SDK |
| [@memorymerge/openclaw](./memorymerge-openclaw) | 0.1.0 | OpenClaw skill |

## Architecture

The framework separates concerns into independently usable packages:

- **@memorymerge/core** — storage adapters, memory manager,
  reflection engine, Merkle verification, anchor client
- **@memorymerge/openclaw** — OpenClaw skill class with 
  lifecycle hooks for agent integration

## Reference Implementation

The root `src/` directory contains the reference implementation
of a research swarm built on top of `@memorymerge/core`.
See `examples/` for usage patterns.
