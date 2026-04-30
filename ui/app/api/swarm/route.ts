import { NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Read the memory index from the root project
    const indexPath = path.join(
      process.cwd(),
      '..',
      '.memory-index.json'
    );

    // Read verified snapshot contents if available
    const snapshotPath = path.join(
      process.cwd(),
      '..',
      'snapshot-contents.json'
    );

    let swarmData = null;
    let snapshotData = null;

    if (fs.existsSync(snapshotPath)) {
      const raw = fs.readFileSync(snapshotPath, 'utf8');
      const parsed = JSON.parse(raw);
      swarmData = parsed.snapshot ?? parsed;
      const rootHash = parsed.rootHash ?? parsed.snapshotRootHash ?? parsed.snapshot?.rootHash ?? null;
      snapshotData = {
        label: parsed.label ?? 'epoch-unknown',
        archivedAt: parsed.archivedAt ?? Date.now(),
        rootHash,
      };
    }

    // Read memory index for key count
    let indexKeys: string[] = [];
    if (fs.existsSync(indexPath)) {
      const indexRaw = fs.readFileSync(indexPath, 'utf8');
      const indexObj = JSON.parse(indexRaw);
      indexKeys = Object.keys(indexObj);
    }

    if (!swarmData) {
      return NextResponse.json({
        live: false,
        verified: false,
        message: 'No swarm data found. Run npm run example first.',
        swarmId: process.env.NEXT_PUBLIC_SWARM_ID ?? 'memorymerge-swarm-001',
        goal: '',
        facts: [],
        tasks: [],
        insights: [],
        lastUpdated: Date.now(),
        indexKeyCount: indexKeys.length,
        snapshot: null,
      });
    }

    return NextResponse.json({
      live: true,
      verified: Boolean(snapshotData?.rootHash),
      swarmId: swarmData.swarmId ?? 'memorymerge-swarm-001',
      goal: swarmData.goal ?? '',
      facts: swarmData.facts ?? [],
      tasks: swarmData.tasks ?? [],
      insights: swarmData.insights ?? [],
      lastUpdated: swarmData.lastUpdated ?? Date.now(),
      indexKeyCount: indexKeys.length,
      snapshot: snapshotData,
    });

  } catch (error) {
    return NextResponse.json(
      { 
        live: false, 
        error: String(error),
        message: 'Failed to read swarm data',
        facts: [],
        tasks: [],
        insights: [],
      },
      { status: 500 }
    );
  }
}
