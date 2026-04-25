import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const snapshots = [
      {
        rootHash: '0x7443af76ed540c16eef8a84e3d6579dff70986644fb47476bf4d85473217e3eb',
        timestamp: 1777127599832,
        label: 'epoch-2-1777127599832',
        factCount: 20,
        taskCount: 3,
        insightCount: 5,
        verified: true,
        storagescanUrl: 'https://storagescan-galileo.0g.ai/tx/0x7443af76ed540c16eef8a84e3d6579dff70986644fb47476bf4d85473217e3eb',
      },
    ];

    return NextResponse.json({ snapshots });
  } catch (error) {
    return NextResponse.json({ snapshots: [], error: String(error) });
  }
}
