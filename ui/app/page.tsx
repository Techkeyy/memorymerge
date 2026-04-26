'use client';

import { useCallback, useEffect, useMemo, useState, type CSSProperties, type ReactNode } from 'react';
import {
  Activity,
  AlertCircle,
  ArrowRight,
  Brain,
  Check,
  CheckCircle,
  ChevronRight,
  Clock,
  Copy,
  Cpu,
  Database,
  ExternalLink,
  Loader2,
  Network,
  RefreshCw,
  Shield,
  Wifi,
  WifiOff,
  Zap,
} from 'lucide-react';

type FactEntry = {
  key: string;
  value: string;
  confidence: number;
  authorAgent: string;
  timestamp: number;
  reviewed: boolean;
};

type TaskPayload = {
  taskId: string;
  status: 'pending' | 'in_progress' | 'pending_review' | 'complete';
  assignedTo: string;
  description: string;
  result?: string;
  createdAt: number;
  updatedAt: number;
};

type InsightEntry = {
  key: string;
  insight: string;
  importance: number;
  generatedAt: number;
  epochNumber: number;
};

type SwarmData = {
  live: boolean;
  swarmId: string;
  goal: string;
  facts: FactEntry[];
  tasks: TaskPayload[];
  insights: InsightEntry[];
  lastUpdated: number;
  indexKeyCount: number;
  snapshot: {
    rootHash: string;
    label: string;
    archivedAt: number;
    storagescanUrl?: string;
  } | null;
  message?: string;
  error?: string;
};

type SnapshotEntry = {
  rootHash: string;
  timestamp: number;
  label: string;
  factCount: number;
  taskCount: number;
  insightCount: number;
  verified: boolean;
  storagescanUrl: string;
};

type SnapshotResponse = { snapshots: SnapshotEntry[] };

const CONTRACT_ADDRESS = '0x4dbFC89D78Bc89578528a848B5bB5fC22b0C4079';
const CHAIN_EXPLORER = 'https://chainscan-galileo.0g.ai';
const STORAGE_EXPLORER = 'https://storagescan-galileo.0g.ai';

const toneByAgent: Record<string, string> = {
  planner: '#1D6FEB',
  researcher: '#00D4AA',
  critic: '#F5A623',
  reflection: '#A855F7',
};

const timeAgo = (timestamp: number) => {
  const delta = Math.max(0, Date.now() - timestamp);
  const seconds = Math.floor(delta / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
};

const confidenceColor = (confidence: number) => {
  if (confidence >= 0.8) return '#00D4AA';
  if (confidence >= 0.5) return '#F5A623';
  return '#FF4D6A';
};

const statusColor = (status: TaskPayload['status']) => {
  switch (status) {
    case 'complete':
      return '#00D4AA';
    case 'in_progress':
      return '#1D6FEB';
    case 'pending_review':
      return '#F5A623';
    default:
      return '#8A9BB5';
  }
};

const statusLabel = (status: TaskPayload['status']) => {
  switch (status) {
    case 'complete':
      return 'Complete';
    case 'in_progress':
      return 'In Progress';
    case 'pending_review':
      return 'In Review';
    default:
      return 'Pending';
  }
};

const statusIcon = (status: TaskPayload['status']) => {
  switch (status) {
    case 'complete':
      return <CheckCircle size={13} color="#00D4AA" />;
    case 'in_progress':
      return <Loader2 size={13} color="#1D6FEB" style={{ animation: 'spin 1s linear infinite' }} />;
    case 'pending_review':
      return <AlertCircle size={13} color="#F5A623" />;
    default:
      return <Clock size={13} color="#8A9BB5" />;
  }
};

const cardStyle: CSSProperties = {
  backgroundColor: '#0D1428',
  border: '1px solid #1E2D4A',
  borderRadius: 16,
};

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#8A9BB5' }}>
      {children}
    </div>
  );
}

function CodeBlock({ code, lang = 'typescript' }: { code: string; lang?: string }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div style={{ ...cardStyle, overflow: 'hidden' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', borderBottom: '1px solid #1E2D4A' }}>
        <SectionLabel>{lang}</SectionLabel>
        <button onClick={copy} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, border: 'none', background: 'transparent', color: copied ? '#00D4AA' : '#8A9BB5', cursor: 'pointer', fontSize: 12 }}>
          {copied ? <Check size={12} /> : <Copy size={12} />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <pre style={{ margin: 0, padding: 16, overflow: 'auto', fontSize: 12, lineHeight: 1.7, color: '#C9D8FF', fontFamily: "'JetBrains Mono','Fira Code',monospace" }}>{code}</pre>
    </div>
  );
}

function LivePill({ live }: { live: boolean }) {
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 10px', borderRadius: 999, backgroundColor: live ? '#00D4AA15' : '#FF4D6A15', border: `1px solid ${live ? '#00D4AA40' : '#FF4D6A40'}` }}>
      {live ? <Wifi size={12} color="#00D4AA" /> : <WifiOff size={12} color="#FF4D6A" />}
      <span style={{ fontSize: 11, fontWeight: 700, color: live ? '#00D4AA' : '#FF4D6A' }}>{live ? 'Live Data' : 'Cached / Empty'}</span>
    </div>
  );
}

function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div style={{ padding: 18, borderRadius: 12, border: '1px dashed #1E2D4A', backgroundColor: '#060B16' }}>
      <div style={{ fontWeight: 700, color: '#FFFFFF', marginBottom: 6 }}>{title}</div>
      <div style={{ fontSize: 13, color: '#8A9BB5', lineHeight: 1.7 }}>{body}</div>
    </div>
  );
}

function StatCard({ label, value, sub, icon, tone }: { label: string; value: string | number; sub: string; icon: ReactNode; tone: string }) {
  return (
    <div style={{ ...cardStyle, padding: 18 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <SectionLabel>{label}</SectionLabel>
        <div style={{ width: 28, height: 28, borderRadius: 9, backgroundColor: `${tone}15`, display: 'grid', placeItems: 'center' }}>{icon}</div>
      </div>
      <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.04em', color: tone }}>{value}</div>
      <div style={{ fontSize: 12, color: '#8A9BB5', marginTop: 4 }}>{sub}</div>
    </div>
  );
}

function SectionCard({ title, children, action }: { title: string; children: ReactNode; action?: ReactNode }) {
  return (
    <div style={{ ...cardStyle, overflow: 'hidden' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', padding: '16px 18px', borderBottom: '1px solid #1E2D4A' }}>
        <SectionLabel>{title}</SectionLabel>
        {action}
      </div>
      <div style={{ padding: 18 }}>{children}</div>
    </div>
  );
}

function ArchitectureDiagram() {
  return (
    <div style={{ overflowX: 'auto', borderRadius: 12, border: '1px solid #1E2D4A', backgroundColor: '#0A0F1E' }}>
      <svg viewBox="0 0 900 620" xmlns="http://www.w3.org/2000/svg" style={{ minWidth: 900, display: 'block', background: '#0A0F1E', fontFamily: 'Inter,system-ui,sans-serif' }}>
        <defs>
          <linearGradient id="bgGlow" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#0D1428" />
            <stop offset="100%" stopColor="#060B16" />
          </linearGradient>
          <marker id="blueArrow" markerWidth="10" markerHeight="10" refX="8" refY="5" orient="auto">
            <path d="M0,0 L10,5 L0,10 z" fill="#1D6FEB" />
          </marker>
          <marker id="greenArrow" markerWidth="10" markerHeight="10" refX="8" refY="5" orient="auto">
            <path d="M0,0 L10,5 L0,10 z" fill="#00D4AA" />
          </marker>
          <marker id="goldArrow" markerWidth="10" markerHeight="10" refX="8" refY="5" orient="auto">
            <path d="M0,0 L10,5 L0,10 z" fill="#F5A623" />
          </marker>
          <marker id="purpleArrow" markerWidth="10" markerHeight="10" refX="8" refY="5" orient="auto">
            <path d="M0,0 L10,5 L0,10 z" fill="#A855F7" />
          </marker>
        </defs>

        <rect x="0" y="0" width="900" height="620" fill="url(#bgGlow)" />
        <text x="450" y="40" textAnchor="middle" fill="#FFFFFF" fontSize="18" fontWeight="700" letterSpacing="-0.5">MemoryMerge Architecture</text>
        <text x="450" y="60" textAnchor="middle" fill="#8A9BB5" fontSize="12">Verifiable Knowledge Provenance · Powered by 0G Storage + Compute + Chain</text>

        <text x="450" y="95" textAnchor="middle" fill="#8A9BB5" fontSize="10" fontWeight="600" letterSpacing="1.5">AGENT LAYER</text>

        <rect x="60" y="108" width="160" height="64" rx="10" fill="#0D1428" stroke="#1D6FEB" strokeWidth="1.5" />
        <text x="140" y="132" textAnchor="middle" fill="#1D6FEB" fontSize="13" fontWeight="600">Planner</text>
        <text x="140" y="150" textAnchor="middle" fill="#8A9BB5" fontSize="10">Goals → Tasks</text>
        <text x="140" y="164" textAnchor="middle" fill="#8A9BB5" fontSize="10">Sets goal on-chain</text>

        <rect x="370" y="108" width="160" height="64" rx="10" fill="#0D1428" stroke="#00D4AA" strokeWidth="1.5" />
        <text x="450" y="132" textAnchor="middle" fill="#00D4AA" fontSize="13" fontWeight="600">Researcher</text>
        <text x="450" y="150" textAnchor="middle" fill="#8A9BB5" fontSize="10">Tasks → Facts</text>
        <text x="450" y="164" textAnchor="middle" fill="#8A9BB5" fontSize="10">0G Compute inference</text>

        <rect x="680" y="108" width="160" height="64" rx="10" fill="#0D1428" stroke="#F5A623" strokeWidth="1.5" />
        <text x="760" y="132" textAnchor="middle" fill="#F5A623" fontSize="13" fontWeight="600">Critic</text>
        <text x="760" y="150" textAnchor="middle" fill="#8A9BB5" fontSize="10">Facts → Scores</text>
        <text x="760" y="164" textAnchor="middle" fill="#8A9BB5" fontSize="10">Confidence scoring</text>

        <line x1="140" y1="172" x2="140" y2="210" stroke="#1D6FEB" strokeWidth="1.5" strokeDasharray="4,3" markerEnd="url(#blueArrow)" />
        <line x1="450" y1="172" x2="450" y2="210" stroke="#00D4AA" strokeWidth="1.5" strokeDasharray="4,3" markerEnd="url(#greenArrow)" />
        <line x1="760" y1="172" x2="760" y2="210" stroke="#F5A623" strokeWidth="1.5" strokeDasharray="4,3" markerEnd="url(#goldArrow)" />

        <text x="450" y="200" textAnchor="middle" fill="#3D8FFF" fontSize="10">All coordinate via shared 0G Storage state — no direct communication</text>

        <text x="450" y="228" textAnchor="middle" fill="#8A9BB5" fontSize="10" fontWeight="600" letterSpacing="1.5">MEMORYMESH SDK</text>
        <rect x="40" y="238" width="820" height="70" rx="12" fill="#0D1428" stroke="#1E2D4A" strokeWidth="1" />
        <rect x="60" y="252" width="170" height="42" rx="8" fill="#060B16" stroke="#1E2D4A" strokeWidth="1" />
        <text x="145" y="270" textAnchor="middle" fill="#FFFFFF" fontSize="11" fontWeight="600">StorageClient</text>
        <text x="145" y="284" textAnchor="middle" fill="#8A9BB5" fontSize="9">0g-ts-sdk wrapper</text>
        <rect x="255" y="252" width="170" height="42" rx="8" fill="#060B16" stroke="#1E2D4A" strokeWidth="1" />
        <text x="340" y="270" textAnchor="middle" fill="#FFFFFF" fontSize="11" fontWeight="600">MemoryManager</text>
        <text x="340" y="284" textAnchor="middle" fill="#8A9BB5" fontSize="9">Facts · Tasks · Insights</text>
        <rect x="450" y="252" width="170" height="42" rx="8" fill="#060B16" stroke="#1E2D4A" strokeWidth="1" />
        <text x="535" y="270" textAnchor="middle" fill="#FFFFFF" fontSize="11" fontWeight="600">ReflectionEngine</text>
        <text x="535" y="284" textAnchor="middle" fill="#8A9BB5" fontSize="9">Compresses every 8 turns</text>
        <rect x="645" y="252" width="170" height="42" rx="8" fill="#060B16" stroke="#1E2D4A" strokeWidth="1" />
        <text x="730" y="270" textAnchor="middle" fill="#FFFFFF" fontSize="11" fontWeight="600">AnchorClient</text>
        <text x="730" y="284" textAnchor="middle" fill="#8A9BB5" fontSize="9">MemoryAnchor contract</text>

        <text x="450" y="342" textAnchor="middle" fill="#8A9BB5" fontSize="10" fontWeight="600" letterSpacing="1.5">0G STORAGE</text>
        <rect x="40" y="352" width="820" height="132" rx="14" fill="#0D1428" stroke="#1E2D4A" strokeWidth="1" />
        <rect x="60" y="372" width="178" height="90" rx="10" fill="#060B16" stroke="#1D6FEB" strokeWidth="1.5" />
        <text x="149" y="394" textAnchor="middle" fill="#1D6FEB" fontSize="13" fontWeight="600">KV Memory</text>
        <text x="149" y="413" textAnchor="middle" fill="#8A9BB5" fontSize="10">Working memory</text>
        <text x="149" y="428" textAnchor="middle" fill="#8A9BB5" fontSize="10">Facts · Tasks · Goal</text>
        <text x="149" y="443" textAnchor="middle" fill="#8A9BB5" fontSize="10">Indexed by swarm</text>

        <rect x="261" y="372" width="178" height="90" rx="10" fill="#060B16" stroke="#00D4AA" strokeWidth="1.5" />
        <text x="350" y="394" textAnchor="middle" fill="#00D4AA" fontSize="13" fontWeight="600">Compute Distillation</text>
        <text x="350" y="413" textAnchor="middle" fill="#8A9BB5" fontSize="10">Rank facts</text>
        <text x="350" y="428" textAnchor="middle" fill="#8A9BB5" fontSize="10">Generate insights</text>
        <text x="350" y="443" textAnchor="middle" fill="#8A9BB5" fontSize="10">Detect contradictions</text>

        <rect x="462" y="372" width="178" height="90" rx="10" fill="#060B16" stroke="#A855F7" strokeWidth="1.5" />
        <text x="551" y="394" textAnchor="middle" fill="#A855F7" fontSize="13" fontWeight="600">Storage Log</text>
        <text x="551" y="413" textAnchor="middle" fill="#8A9BB5" fontSize="10">Snapshot archive</text>
        <text x="551" y="428" textAnchor="middle" fill="#8A9BB5" fontSize="10">Episodic proof</text>
        <text x="551" y="443" textAnchor="middle" fill="#8A9BB5" fontSize="10">Root-hash anchored</text>

        <rect x="663" y="372" width="178" height="90" rx="10" fill="#060B16" stroke="#F5A623" strokeWidth="1.5" />
        <text x="752" y="394" textAnchor="middle" fill="#F5A623" fontSize="13" fontWeight="600">Chain Anchor</text>
        <text x="752" y="413" textAnchor="middle" fill="#8A9BB5" fontSize="10">0G Galileo Testnet</text>
        <text x="752" y="428" textAnchor="middle" fill="#8A9BB5" fontSize="10">MemoryAnchor.sol</text>
        <text x="752" y="443" textAnchor="middle" fill="#8A9BB5" fontSize="10">Verifiable proof</text>

        <line x1="149" y1="330" x2="149" y2="372" stroke="#1D6FEB" strokeWidth="2" markerEnd="url(#blueArrow)" />
        <line x1="350" y1="330" x2="350" y2="372" stroke="#00D4AA" strokeWidth="2" markerEnd="url(#greenArrow)" />
        <line x1="551" y1="330" x2="551" y2="372" stroke="#A855F7" strokeWidth="2" markerEnd="url(#purpleArrow)" />
        <line x1="752" y1="330" x2="752" y2="372" stroke="#F5A623" strokeWidth="2" markerEnd="url(#goldArrow)" />

        <text x="450" y="520" textAnchor="middle" fill="#8A9BB5" fontSize="10" fontWeight="600" letterSpacing="1.5">CROSS-SWARM INHERITANCE</text>
        <rect x="180" y="532" width="540" height="48" rx="12" fill="#0D1428" stroke="#1E2D4A" strokeWidth="1" />
        <text x="450" y="551" textAnchor="middle" fill="#FFFFFF" fontSize="12" fontWeight="600">New swarm can inherit verified insights from an anchored snapshot</text>
        <text x="450" y="568" textAnchor="middle" fill="#8A9BB5" fontSize="10">Root hash resolves on-chain · PoRA verifies the content · provenance remains traceable</text>
      </svg>
    </div>
  );
}

function Shell({ children, active, setActive }: { children: ReactNode; active: string; setActive: (value: string) => void }) {
  const nav = ['Overview', 'Explorer', 'Coordination', 'Snapshots', 'Docs'];

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#0A0F1E', color: '#FFFFFF' }}>
      <header style={{ position: 'sticky', top: 0, zIndex: 30, backdropFilter: 'blur(12px)', backgroundColor: '#0A0F1EF0', borderBottom: '1px solid #1E2D4A' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 9, background: 'linear-gradient(135deg,#1D6FEB,#3D8FFF)', display: 'grid', placeItems: 'center' }}>
              <Brain size={16} color="#fff" />
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 15, letterSpacing: '-0.02em' }}>MemoryMerge</div>
              <div style={{ fontSize: 11, color: '#8A9BB5' }}>0G-backed live memory explorer</div>
            </div>
          </div>

          <nav style={{ display: 'flex', flexWrap: 'wrap', gap: 4, justifyContent: 'center' }}>
            {nav.map((item) => (
              <button
                key={item}
                onClick={() => setActive(item)}
                style={{
                  border: 'none',
                  borderRadius: 8,
                  padding: '7px 12px',
                  cursor: 'pointer',
                  backgroundColor: active === item ? '#1E2D4A' : 'transparent',
                  color: active === item ? '#FFFFFF' : '#8A9BB5',
                  fontSize: 13,
                  fontWeight: active === item ? 700 : 500,
                }}
              >
                {item}
              </button>
            ))}
          </nav>

          <div style={{ display: 'flex', gap: 10 }}>
            <a href="https://github.com/Techkeyy/memorymerge" target="_blank" rel="noreferrer" style={{ padding: '7px 13px', borderRadius: 8, border: '1px solid #1E2D4A', color: '#8A9BB5', textDecoration: 'none', fontSize: 12, fontWeight: 600 }}>
              GitHub
            </a>
            <a href={`${CHAIN_EXPLORER}/address/${CONTRACT_ADDRESS}`} target="_blank" rel="noreferrer" style={{ padding: '7px 13px', borderRadius: 8, backgroundColor: '#1D6FEB', color: '#fff', textDecoration: 'none', fontSize: 12, fontWeight: 700 }}>
              Contract ↗
            </a>
          </div>
        </div>
      </header>
      {children}
      <footer style={{ borderTop: '1px solid #1E2D4A', marginTop: 48, padding: '24px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
          <div style={{ fontSize: 12, color: '#8A9BB5' }}>MemoryMerge · 0G / Open Agents Hackathon · ETHGlobal 2026</div>
          <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap' }}>
            <a href={STORAGE_EXPLORER} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: '#1D6FEB', textDecoration: 'none' }}>StorageScan</a>
            <a href={`${CHAIN_EXPLORER}/address/${CONTRACT_ADDRESS}`} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: '#1D6FEB', textDecoration: 'none' }}>Chain Explorer</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

function Hero({ swarm, snapshot, onRefresh }: { swarm: SwarmData | null; snapshot: SnapshotEntry | null; onRefresh: () => void }) {
  return (
    <section style={{ maxWidth: 1200, margin: '0 auto', padding: '72px 24px 24px', textAlign: 'center' }}>
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, marginBottom: 22, padding: '6px 14px', borderRadius: 999, border: '1px solid #1D6FEB30', backgroundColor: '#1D6FEB15' }}>
        <div style={{ width: 7, height: 7, borderRadius: 999, backgroundColor: '#00D4AA' }} />
        <span style={{ fontSize: 12, color: '#8A9BB5' }}>Verified live swarm · 0G Storage + 0G Compute + 0G Chain</span>
      </div>

      <h1 style={{ fontSize: 'clamp(42px, 7vw, 72px)', lineHeight: 0.98, letterSpacing: '-0.06em', margin: '0 auto 18px', maxWidth: 980, background: 'linear-gradient(135deg, #FFFFFF 0%, #8A9BB5 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
        Persistent memory for AI agent swarms
      </h1>

      <p style={{ maxWidth: 760, margin: '0 auto 28px', fontSize: 18, lineHeight: 1.7, color: '#8A9BB5' }}>
        MemoryMerge gives Planner, Researcher, and Critic agents a single shared state layer. This dashboard reads real swarm memory from the backend, not mock fixtures.
      </p>

      <div style={{ display: 'flex', justifyContent: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 24 }}>
        <button onClick={onRefresh} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, border: 'none', borderRadius: 10, padding: '12px 18px', backgroundColor: '#1D6FEB', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>
          <RefreshCw size={16} /> Refresh live data
        </button>
        <a href={snapshot?.storagescanUrl ?? STORAGE_EXPLORER} target="_blank" rel="noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, borderRadius: 10, padding: '12px 18px', border: '1px solid #1E2D4A', color: '#fff', textDecoration: 'none', fontWeight: 600 }}>
          <ExternalLink size={16} /> Verify snapshot
        </a>
      </div>

      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <LivePill live={swarm?.live ?? false} />
      </div>
    </section>
  );
}

function AppSection({ swarm, snapshots }: { swarm: SwarmData | null; snapshots: SnapshotEntry[] }) {
  const [tab, setTab] = useState<'facts' | 'tasks' | 'insights' | 'coordination' | 'snapshots'>('facts');
  const facts = swarm?.facts ?? [];
  const tasks = swarm?.tasks ?? [];
  const insights = swarm?.insights ?? [];
  const verifiedSnapshot = snapshots[0] ?? swarm?.snapshot ?? null;

  const counts = useMemo(() => ({
    planner: tasks.length,
    researcher: facts.filter((fact) => fact.authorAgent === 'researcher').length,
    critic: facts.filter((fact) => fact.authorAgent === 'critic').length,
    reflection: insights.length,
  }), [facts, insights, tasks]);

  const completedTasks = tasks.filter((task) => task.status === 'complete').length;

  return (
    <section style={{ maxWidth: 1200, margin: '0 auto', padding: '24px 24px 0', display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 340px', gap: 16 }}>
      <div style={{ display: 'grid', gap: 16 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 12 }}>
          <StatCard label="Facts" value={facts.length} sub={`${facts.filter((fact) => fact.reviewed).length} reviewed`} icon={<Database size={14} color="#1D6FEB" />} tone="#1D6FEB" />
          <StatCard label="Tasks" value={`${completedTasks}/${tasks.length}`} sub={`${tasks.filter((task) => task.status !== 'complete').length} open`} icon={<CheckCircle size={14} color="#00D4AA" />} tone="#00D4AA" />
          <StatCard label="Insights" value={insights.length} sub="compressed by 0G Compute" icon={<Zap size={14} color="#A855F7" />} tone="#A855F7" />
          <StatCard label="Index Keys" value={swarm?.indexKeyCount ?? 0} sub="keys indexed in 0G Storage" icon={<Activity size={14} color="#F5A623" />} tone="#F5A623" />
        </div>

        <SectionCard title="Live Memory" action={<div style={{ display: 'flex', gap: 4, overflowX: 'auto' }}>{(['facts', 'tasks', 'insights', 'coordination', 'snapshots'] as const).map((item) => (<button key={item} onClick={() => setTab(item)} style={{ border: 'none', borderRadius: 8, padding: '8px 12px', backgroundColor: tab === item ? '#1E2D4A' : 'transparent', color: tab === item ? '#FFFFFF' : '#8A9BB5', fontSize: 12, fontWeight: tab === item ? 700 : 500, textTransform: 'capitalize', cursor: 'pointer', whiteSpace: 'nowrap' }}>{item}<span style={{ marginLeft: 8, padding: '1px 6px', borderRadius: 999, backgroundColor: '#1E2D4A', color: '#8A9BB5', fontSize: 10 }}>{item === 'facts' ? facts.length : item === 'tasks' ? tasks.length : item === 'snapshots' ? snapshots.length : item === 'insights' ? insights.length : 4}</span></button>))}</div>}>
          <div style={{ display: 'grid', gap: 10, maxHeight: 520, overflowY: 'auto', paddingRight: 6 }}>
            {tab === 'facts' && (facts.length > 0 ? facts.map((fact) => (<div key={fact.key} style={{ padding: 14, borderRadius: 12, backgroundColor: '#0A0F1E', border: '1px solid #1E2D4A', borderLeft: `3px solid ${toneByAgent[fact.authorAgent] ?? '#8A9BB5'}` }}><div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 8 }}><div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}><span style={{ fontSize: 11, padding: '3px 8px', borderRadius: 999, backgroundColor: `${toneByAgent[fact.authorAgent] ?? '#8A9BB5'}15`, color: toneByAgent[fact.authorAgent] ?? '#8A9BB5', fontFamily: 'monospace' }}>{fact.authorAgent}</span><span style={{ fontSize: 11, color: '#8A9BB5' }}>{fact.reviewed ? 'reviewed' : 'unreviewed'}</span></div><div style={{ fontWeight: 800, color: confidenceColor(fact.confidence), fontSize: 13 }}>{Math.round(fact.confidence * 100)}%</div></div><div style={{ fontSize: 14, lineHeight: 1.6, color: '#E0E8FF' }}>{fact.value}</div><div style={{ marginTop: 8, fontSize: 11, color: '#8A9BB5', fontFamily: 'monospace' }}>{fact.key} · {timeAgo(fact.timestamp)}</div></div>)) : <EmptyState title="No facts indexed yet" body="Run the swarm again to repopulate 0G Storage KV." />)}

            {tab === 'tasks' && (tasks.length > 0 ? tasks.map((task) => (<div key={task.taskId} style={{ padding: 14, borderRadius: 12, backgroundColor: '#0A0F1E', border: '1px solid #1E2D4A' }}><div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 8 }}><span style={{ fontSize: 11, color: '#3D8FFF', fontFamily: 'monospace' }}>{task.taskId}</span><span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, color: statusColor(task.status) }}>{statusIcon(task.status)} {statusLabel(task.status)}</span></div><div style={{ fontSize: 14, lineHeight: 1.6, color: '#E0E8FF', marginBottom: 8 }}>{task.description}</div>{task.result ? <div style={{ padding: 10, borderRadius: 10, backgroundColor: '#1E2D4A', borderLeft: '2px solid #00D4AA', fontSize: 12, color: '#B8C7F0' }}>{task.result}</div> : null}<div style={{ marginTop: 8, fontSize: 11, color: '#8A9BB5' }}>→ {task.assignedTo} · {timeAgo(task.updatedAt)}</div></div>)) : <EmptyState title="No tasks indexed yet" body="Planner writes tasks into 0G Storage before Researcher starts work." />)}

            {tab === 'insights' && (insights.length > 0 ? [...insights].sort((a, b) => b.importance - a.importance).map((insight) => (<div key={insight.key} style={{ padding: 14, borderRadius: 12, backgroundColor: '#0A0F1E', border: '1px solid #1E2D4A', borderLeft: '3px solid #A855F7' }}><div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 8 }}><span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#A855F7' }}><Zap size={12} />Epoch {insight.epochNumber}</span><span style={{ fontWeight: 800, fontSize: 13, color: insight.importance >= 8 ? '#A855F7' : '#F5A623' }}>{insight.importance}/10</span></div><div style={{ fontSize: 14, lineHeight: 1.6, color: '#E0E8FF' }}>{insight.insight}</div><div style={{ marginTop: 8, fontSize: 11, color: '#8A9BB5', fontFamily: 'monospace' }}>{insight.key} · {timeAgo(insight.generatedAt)}</div></div>)) : <EmptyState title="No insights indexed yet" body="Reflection engine will populate these after the next compression cycle." />)}

            {tab === 'coordination' && (<div style={{ display: 'grid', gap: 12 }}><div style={{ padding: 16, borderRadius: 12, backgroundColor: '#0A0F1E', border: '1px solid #1E2D4A', borderLeft: '3px solid #1D6FEB' }}><div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}><Network size={14} color="#1D6FEB" /><div style={{ fontWeight: 700, color: '#FFFFFF' }}>Agent coordination proof</div></div><div style={{ fontSize: 13, lineHeight: 1.7, color: '#8A9BB5', marginBottom: 14 }}>Planner, Researcher, and Critic do not talk directly. They coordinate through shared 0G Storage keys. The proof below is rendered from the live swarm state returned by the backend.</div><div style={{ display: 'grid', gap: 10 }}>{[{ label: 'Planner', color: '#1D6FEB', value: `${counts.planner} tasks written`, detail: 'Sets the goal and serializes task state.' }, { label: 'Researcher', color: '#00D4AA', value: `${counts.researcher} facts written`, detail: 'Reads tasks and writes evidence back to KV.' }, { label: 'Critic', color: '#F5A623', value: `${counts.critic} review facts`, detail: 'Scores quality and marks tasks complete.' }, { label: 'Reflection', color: '#A855F7', value: `${counts.reflection} insights`, detail: 'Compresses memory and anchors snapshots.' }].map((step, index) => (<div key={step.label} style={{ display: 'grid', gridTemplateColumns: '40px 1fr auto', gap: 12, alignItems: 'center', padding: '10px 12px', borderRadius: 10, backgroundColor: '#060B16', border: '1px solid #1E2D4A' }}><div style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: `${step.color}18`, display: 'grid', placeItems: 'center', color: step.color, fontWeight: 800 }}>{index + 1}</div><div><div style={{ fontWeight: 700, color: '#FFFFFF' }}>{step.label}</div><div style={{ fontSize: 12, color: '#8A9BB5' }}>{step.detail}</div></div><div style={{ color: step.color, fontSize: 12, fontWeight: 800, whiteSpace: 'nowrap' }}>{step.value}</div></div>))}</div></div><div style={{ padding: 16, borderRadius: 12, backgroundColor: '#0A0F1E', border: '1px solid #1E2D4A' }}><div style={{ fontSize: 13, fontWeight: 700, color: '#FFFFFF', marginBottom: 8 }}>Evidence chain</div><div style={{ fontFamily: 'monospace', fontSize: 11, lineHeight: 1.9, color: '#8A9BB5' }}><div><span style={{ color: '#1D6FEB' }}>Planner</span> → <span style={{ color: '#3D8FFF' }}>swarm/{swarm?.swarmId ?? 'memorymerge-swarm-001'}/tasks</span></div><div><span style={{ color: '#00D4AA' }}>Researcher</span> → <span style={{ color: '#3D8FFF' }}>swarm/{swarm?.swarmId ?? 'memorymerge-swarm-001'}/facts</span></div><div><span style={{ color: '#F5A623' }}>Critic</span> → <span style={{ color: '#3D8FFF' }}>confidence scores + task completion</span></div><div><span style={{ color: '#A855F7' }}>Reflection</span> → <span style={{ color: '#3D8FFF' }}>insights + snapshot archive</span></div></div></div></div>)}

            {tab === 'snapshots' && (snapshots.length > 0 ? snapshots.map((snapshot) => (<div key={snapshot.rootHash} style={{ padding: 14, borderRadius: 12, backgroundColor: '#0A0F1E', border: '1px solid #1E2D4A', borderLeft: '3px solid #00D4AA' }}><div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 10, flexWrap: 'wrap' }}><div><div style={{ fontWeight: 700, color: '#FFFFFF' }}>{snapshot.label}</div><div style={{ fontSize: 11, color: '#8A9BB5' }}>{timeAgo(snapshot.timestamp)} · {snapshot.verified ? 'verified' : 'unverified'}</div></div><a href={snapshot.storagescanUrl} target="_blank" rel="noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: '#00D4AA', textDecoration: 'none', fontSize: 12, fontWeight: 700 }}><ExternalLink size={12} /> StorageScan</a></div><div style={{ fontFamily: 'monospace', fontSize: 11, color: '#3D8FFF', wordBreak: 'break-all', marginBottom: 10 }}>{snapshot.rootHash}</div><div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', fontSize: 12, color: '#8A9BB5' }}><span>{snapshot.factCount} facts</span><span>{snapshot.taskCount} tasks</span><span>{snapshot.insightCount} insights</span></div></div>)) : <EmptyState title="No snapshots indexed yet" body="Run the swarm to archive the first snapshot and make it available here." />)}
          </div>
        </SectionCard>
      </div>

      <div style={{ display: 'grid', gap: 16, alignContent: 'start' }}>
        <SectionCard title="Current Goal">
          <div style={{ color: '#FFFFFF', fontSize: 16, lineHeight: 1.7, fontWeight: 600 }}>{swarm?.goal || 'No goal loaded yet'}</div>
          <div style={{ marginTop: 10, fontSize: 11, color: '#8A9BB5', fontFamily: 'monospace' }}>SWARM_ID: {swarm?.swarmId ?? 'memorymerge-swarm-001'}</div>
        </SectionCard>

        <SectionCard title="Verified Snapshot">
          {verifiedSnapshot ? (<><div style={{ fontSize: 12, color: '#8A9BB5', marginBottom: 8 }}>Real proof from the backend snapshot feed</div><div style={{ fontFamily: 'monospace', fontSize: 12, color: '#3D8FFF', wordBreak: 'break-all', marginBottom: 10 }}>{verifiedSnapshot.rootHash}</div><div style={{ fontSize: 12, color: '#8A9BB5', marginBottom: 10 }}>{verifiedSnapshot.label}</div><div style={{ display: 'grid', gap: 8, fontSize: 12, color: '#8A9BB5', marginBottom: 12 }}><div>{verifiedSnapshot.factCount} facts · {verifiedSnapshot.taskCount} tasks · {verifiedSnapshot.insightCount} insights</div><div>{timeAgo(verifiedSnapshot.timestamp)}</div></div><a href={verifiedSnapshot.storagescanUrl} target="_blank" rel="noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '10px 14px', borderRadius: 10, backgroundColor: '#00D4AA15', border: '1px solid #00D4AA40', color: '#00D4AA', textDecoration: 'none', fontWeight: 700, fontSize: 12 }}><ExternalLink size={12} /> Verify on StorageScan</a></>) : (<EmptyState title="No snapshot proof yet" body="The snapshots API will surface the verified storage proof once the backend archive is available." />)}
        </SectionCard>

        <SectionCard title="On-Chain Anchor">
          <div style={{ fontSize: 12, color: '#8A9BB5', marginBottom: 8 }}>MemoryAnchor contract</div>
          <div style={{ fontFamily: 'monospace', fontSize: 12, color: '#3D8FFF', wordBreak: 'break-all', marginBottom: 10 }}>{CONTRACT_ADDRESS}</div>
          <div style={{ fontSize: 12, color: '#8A9BB5', marginBottom: 12 }}>0G Galileo · Chain ID 16602</div>
          <a href={`${CHAIN_EXPLORER}/address/${CONTRACT_ADDRESS}`} target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '10px 14px', borderRadius: 10, border: '1px solid #1D6FEB30', backgroundColor: '#1D6FEB15', color: '#1D6FEB', textDecoration: 'none', fontWeight: 700, fontSize: 12 }}>
            <ExternalLink size={12} /> View on Chain Explorer
          </a>
        </SectionCard>

        <SectionCard title="Agent Proof">
          <div style={{ display: 'grid', gap: 10 }}>
            {[
              { label: 'Planner', tone: '#1D6FEB', value: `${tasks.length} tasks`, detail: 'writes tasks into 0G Storage KV' },
              { label: 'Researcher', tone: '#00D4AA', value: `${facts.length} facts`, detail: 'reads tasks and writes evidence' },
              { label: 'Critic', tone: '#F5A623', value: `${facts.filter((fact) => fact.reviewed).length} reviewed`, detail: 'scores and approves facts' },
              { label: 'Reflection', tone: '#A855F7', value: `${insights.length} insights`, detail: 'compresses and anchors memory' },
            ].map((item) => (<div key={item.label} style={{ padding: 12, borderRadius: 12, backgroundColor: '#060B16', border: '1px solid #1E2D4A', borderLeft: `3px solid ${item.tone}` }}><div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}><div style={{ fontWeight: 700, color: item.tone }}>{item.label}</div><div style={{ fontSize: 12, fontWeight: 800, color: item.tone }}>{item.value}</div></div><div style={{ marginTop: 6, fontSize: 12, color: '#8A9BB5' }}>{item.detail}</div></div>))}
          </div>
        </SectionCard>
      </div>
    </section>
  );
}

function Docs({ snapshot }: { snapshot: SnapshotEntry | null }) {
  return (
    <section style={{ maxWidth: 1200, margin: '0 auto', padding: '24px 24px 0' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <SectionCard title="API Overview">
          <div style={{ display: 'grid', gap: 12 }}>
            <div>
              <div style={{ fontSize: 13, color: '#FFFFFF', fontWeight: 700, marginBottom: 8 }}>Backend routes</div>
              <CodeBlock lang="bash" code={`GET /api/swarm
GET /api/snapshots`} />
            </div>
            <div>
              <div style={{ fontSize: 13, color: '#FFFFFF', fontWeight: 700, marginBottom: 8 }}>Fetched data sources</div>
              <div style={{ display: 'grid', gap: 8, fontSize: 13, color: '#8A9BB5', lineHeight: 1.7 }}>
                <div>• <strong style={{ color: '#FFFFFF' }}>/api/swarm</strong> reads live 0G Storage memory from the root project.</div>
                <div>• <strong style={{ color: '#FFFFFF' }}>/api/snapshots</strong> exposes the verified storage proof feed.</div>
                <div>• The explorer surfaces planner, researcher, critic, and reflection data directly from those responses.</div>
              </div>
            </div>
          </div>
        </SectionCard>

        <SectionCard title="Live Snapshot Summary">
          {snapshot ? (
            <div style={{ display: 'grid', gap: 10 }}>
              <div style={{ fontFamily: 'monospace', fontSize: 12, color: '#3D8FFF', wordBreak: 'break-all' }}>{snapshot.rootHash}</div>
              <div style={{ color: '#FFFFFF', fontWeight: 700 }}>{snapshot.label}</div>
              <div style={{ color: '#8A9BB5', fontSize: 13, lineHeight: 1.7 }}>
                Verified snapshot data fetched from the backend. The page never falls back to sample hashes or fake records.
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8, fontSize: 12, color: '#8A9BB5' }}>
                <div>{snapshot.factCount} facts</div>
                <div>{snapshot.taskCount} tasks</div>
                <div>{snapshot.insightCount} insights</div>
                <div>{timeAgo(snapshot.timestamp)}</div>
              </div>
            </div>
          ) : (
            <EmptyState title="Snapshot feed unavailable" body="The UI will show a verified snapshot here once the backend route is present." />
          )}
        </SectionCard>
      </div>

      <div style={{ marginTop: 16 }}>
        <SectionCard title="SDK Reference">
          <CodeBlock lang="typescript" code={`import { createMemoryManager, createReflectionEngine } from 'memorymerge';

const memory = createMemoryManager('my-agent');
await memory.writeFact('key', 'value', 0.9);
await memory.getSwarmContext();

const reflection = createReflectionEngine(memory, 8);
await reflection.tick();`} />
        </SectionCard>
      </div>
    </section>
  );
}

function Overview({ swarm, snapshot, onRefresh }: { swarm: SwarmData | null; snapshot: SnapshotEntry | null; onRefresh: () => void }) {
  return (
    <>
      <Hero swarm={swarm} snapshot={snapshot} onRefresh={onRefresh} />
      <section style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px 24px' }}>
        <SectionCard title="Architecture">
          <ArchitectureDiagram />
        </SectionCard>

        <div style={{ ...cardStyle, padding: 18, borderLeft: '3px solid #00D4AA' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
            <div>
              <SectionLabel>Active goal</SectionLabel>
              <div style={{ marginTop: 8, fontSize: 16, fontWeight: 700, color: '#FFFFFF', lineHeight: 1.7 }}>{swarm?.goal || 'No active goal loaded'}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <SectionLabel>Last updated</SectionLabel>
              <div style={{ marginTop: 8, fontSize: 13, color: '#8A9BB5', fontFamily: 'monospace' }}>{swarm ? new Date(swarm.lastUpdated).toISOString() : '—'}</div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

export default function Page() {
  const [active, setActive] = useState('Overview');
  const [swarm, setSwarm] = useState<SwarmData | null>(null);
  const [snapshots, setSnapshots] = useState<SnapshotEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const [swarmRes, snapshotRes] = await Promise.all([
        fetch('/api/swarm', { cache: 'no-store' }),
        fetch('/api/snapshots', { cache: 'no-store' }),
      ]);

      if (!swarmRes.ok) throw new Error(`Failed to load /api/swarm (${swarmRes.status})`);
      if (!snapshotRes.ok) throw new Error(`Failed to load /api/snapshots (${snapshotRes.status})`);

      const swarmJson: SwarmData = await swarmRes.json();
      const snapshotJson: SnapshotResponse = await snapshotRes.json();

      setSwarm(swarmJson);
      setSnapshots(snapshotJson.snapshots ?? []);
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const timer = setInterval(load, 30000);
    return () => clearInterval(timer);
  }, [load]);

  const verifiedSnapshot = snapshots[0] ?? swarm?.snapshot ?? null;

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#0A0F1E', color: '#FFFFFF', display: 'grid', placeItems: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <Loader2 size={32} color="#1D6FEB" style={{ animation: 'spin 1s linear infinite' }} />
          <div style={{ marginTop: 16, color: '#8A9BB5', fontSize: 14 }}>Loading live swarm data from backend routes...</div>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#0A0F1E', color: '#FFFFFF', display: 'grid', placeItems: 'center', padding: 24 }}>
        <div style={{ ...cardStyle, padding: 28, maxWidth: 560, width: '100%', borderLeft: '3px solid #FF4D6A' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: '#FF4D6A20', display: 'grid', placeItems: 'center' }}>
              <AlertCircle size={20} color="#FF4D6A" />
            </div>
            <div>
              <div style={{ fontSize: 12, color: '#8A9BB5', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Render error</div>
              <h1 style={{ fontSize: 22, marginTop: 2 }}>MemoryMerge UI failed to load</h1>
            </div>
          </div>
          <p style={{ color: '#8A9BB5', lineHeight: 1.7, marginBottom: 18 }}>The page could not fetch live backend data. Use the retry button or inspect the error boundary.</p>
          <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', backgroundColor: '#060B16', border: '1px solid #1E2D4A', borderRadius: 12, padding: 14, color: '#FFB7C4', fontSize: 12, marginBottom: 18 }}>{error}</pre>
          <button onClick={load} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 16px', border: 'none', borderRadius: 10, backgroundColor: '#1D6FEB', color: '#fff', cursor: 'pointer', fontWeight: 700 }}>
            <RefreshCw size={14} /> Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <Shell active={active} setActive={setActive}>
      {active === 'Overview' && <Overview swarm={swarm} snapshot={verifiedSnapshot} onRefresh={load} />}
      {active === 'Explorer' && <AppSection swarm={swarm} snapshots={verifiedSnapshot ? [verifiedSnapshot] : []} />}
      {active === 'Coordination' && <AppSection swarm={swarm} snapshots={verifiedSnapshot ? [verifiedSnapshot] : []} />}
      {active === 'Snapshots' && <Docs snapshot={verifiedSnapshot} />}
      {active === 'Docs' && <Docs snapshot={verifiedSnapshot} />}
      <style>{`* { box-sizing: border-box; margin: 0; padding: 0; } body { background: #0A0F1E; }`}</style>
    </Shell>
  );
}
