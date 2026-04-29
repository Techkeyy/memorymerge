'use client';

import { useState, useEffect, useCallback, type CSSProperties } from 'react';
import {
  Brain,
  Database,
  Zap,
  Activity,
  RefreshCw,
  ExternalLink,
  ChevronRight,
  CheckCircle,
  Clock,
  AlertCircle,
  Loader2,
  Copy,
  Check,
  ArrowRight,
  Shield,
  Cpu,
  Network,
  Sparkles,
  Layers,
  ScrollText,
  Terminal,
} from 'lucide-react';

interface FactEntry {
  key: string;
  value: string;
  confidence: number;
  authorAgent: string;
  timestamp: number;
  reviewed: boolean;
}

interface TaskPayload {
  taskId: string;
  status: 'pending' | 'in_progress' | 'pending_review' | 'complete';
  assignedTo: string;
  description: string;
  result?: string;
  createdAt: number;
  updatedAt: number;
}

interface InsightEntry {
  key: string;
  insight: string;
  importance: number;
  generatedAt: number;
  epochNumber: number;
}

interface SwarmData {
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
  } | null;
  message?: string;
  error?: string;
}

interface SnapshotEntry {
  rootHash: string;
  timestamp: number;
  label: string;
  factCount: number;
  taskCount: number;
  insightCount: number;
}

const MOCK: SwarmData = {
  swarmId: 'memorymerge-swarm-001',
  goal: 'Research the current state of decentralized AI infrastructure in 2026',
  facts: [
    {
      key: 'task_001_market_growth',
      value: 'Decentralized AI market grew 340% YoY in 2025, reaching $2.3B valuation',
      confidence: 0.92,
      authorAgent: 'researcher',
      timestamp: Date.now() - 120000,
      reviewed: true,
    },
    {
      key: 'task_001_key_players',
      value: '0G Labs leads the storage layer with 99.9% uptime on Galileo testnet',
      confidence: 0.88,
      authorAgent: 'researcher',
      timestamp: Date.now() - 100000,
      reviewed: true,
    },
    {
      key: 'task_002_compute_costs',
      value: 'Decentralized compute is 60-90% cheaper than cloud for AI inference workloads',
      confidence: 0.85,
      authorAgent: 'researcher',
      timestamp: Date.now() - 80000,
      reviewed: false,
    },
    {
      key: 'critic_review_001',
      value: 'Research quality high. Market data cross-referenced with multiple sources.',
      confidence: 0.95,
      authorAgent: 'critic',
      timestamp: Date.now() - 60000,
      reviewed: true,
    },
    {
      key: 'planner_assessment_1',
      value: 'Goal 60% complete. Storage and compute covered. Missing: governance layer.',
      confidence: 0.9,
      authorAgent: 'planner',
      timestamp: Date.now() - 40000,
      reviewed: true,
    },
  ],
  tasks: [
    {
      taskId: 'task_001',
      status: 'complete',
      assignedTo: 'researcher',
      description: 'Research market size and key players in decentralized AI infrastructure',
      result: 'Market at $2.3B, 0G Labs leading storage layer',
      createdAt: Date.now() - 180000,
      updatedAt: Date.now() - 60000,
    },
    {
      taskId: 'task_002',
      status: 'pending_review',
      assignedTo: 'researcher',
      description: 'Analyze cost comparison between decentralized and centralized compute',
      result: '60-90% cheaper for AI inference workloads',
      createdAt: Date.now() - 150000,
      updatedAt: Date.now() - 80000,
    },
    {
      taskId: 'task_003',
      status: 'pending',
      assignedTo: 'researcher',
      description: 'Research governance models and token economics of leading protocols',
      createdAt: Date.now() - 120000,
      updatedAt: Date.now() - 120000,
    },
  ],
  insights: [
    {
      key: 'insight_1',
      insight: 'Decentralized AI infrastructure is entering mainstream adoption with 340% YoY growth',
      importance: 9,
      generatedAt: Date.now() - 30000,
      epochNumber: 1,
    },
    {
      key: 'insight_2',
      insight: '0G Labs provides the most complete stack: Storage + Compute + DA + Chain',
      importance: 8,
      generatedAt: Date.now() - 30000,
      epochNumber: 1,
    },
    {
      key: 'insight_3',
      insight: 'Cost advantage of 60-90% makes decentralized compute commercially viable',
      importance: 7,
      generatedAt: Date.now() - 30000,
      epochNumber: 1,
    },
  ],
  lastUpdated: Date.now() - 10000,
  indexKeyCount: 12,
  snapshot: null,
};

const MOCK_SNAPSHOTS: SnapshotEntry[] = [
  {
    rootHash: '0x7f3a9b2c1d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a',
    timestamp: Date.now() - 30000,
    label: 'epoch-1-' + (Date.now() - 30000),
    factCount: 5,
    taskCount: 3,
    insightCount: 3,
  },
];

const timeAgo = (t: number) => {
  const s = Math.floor((Date.now() - t) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  return `${Math.floor(s / 3600)}h ago`;
};

const confColor = (c: number) => (c >= 0.8 ? '#00D4AA' : c >= 0.5 ? '#F5A623' : '#FF4D6A');

const agentColor = (a: string) =>
  ({
    planner: '#1D6FEB',
    researcher: '#00D4AA',
    critic: '#F5A623',
    reflection: '#A855F7',
  }[a] ?? '#8A9BB5');

const statusIcon = (s: TaskPayload['status']) =>
  ({
    complete: <CheckCircle size={13} color="#00D4AA" />,
    in_progress: <Loader2 size={13} color="#1D6FEB" className="animate-spin" />,
    pending_review: <AlertCircle size={13} color="#F5A623" />,
    pending: <Clock size={13} color="#8A9BB5" />,
  }[s]);

const statusLabel = (s: TaskPayload['status']) =>
  ({ complete: 'Complete', in_progress: 'In Progress', pending_review: 'In Review', pending: 'Pending' }[s] ?? s);

const S = {
  card: { backgroundColor: '#0D1428', border: '1px solid #1E2D4A', borderRadius: '12px' } as CSSProperties,
  label: {
    fontSize: '11px',
    fontWeight: 600,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.07em',
    color: '#8A9BB5',
  } as CSSProperties,
};

function CodeBlock({ code, lang = 'typescript' }: { code: string; lang?: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={{ position: 'relative', backgroundColor: '#060B16', border: '1px solid #1E2D4A', borderRadius: '10px', overflow: 'hidden' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', borderBottom: '1px solid #1E2D4A' }}>
        <span style={{ ...S.label, fontSize: '10px' }}>{lang}</span>
        <button
          onClick={copy}
          style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'none', border: 'none', cursor: 'pointer', color: copied ? '#00D4AA' : '#8A9BB5', fontSize: '11px' }}
        >
          {copied ? <Check size={12} /> : <Copy size={12} />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <pre style={{ margin: 0, padding: '14px', overflow: 'auto', fontSize: '12px', lineHeight: '1.7', color: '#C9D8FF', fontFamily: "'JetBrains Mono','Fira Code',monospace" }}>{code}</pre>
    </div>
  );
}

function scrollToSection(id: string) {
  const el = document.getElementById(id);
  el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function Nav({ onNavigate }: { onNavigate: (id: string) => void }) {
  const links = [
    ['Overview', 'overview'],
    ['Features', 'features'],
    ['How It Works', 'how-it-works'],
    ['Explorer', 'explorer'],
    ['Docs', 'docs'],
  ] as const;

  return (
    <header style={{ position: 'sticky', top: 0, zIndex: 200, backgroundColor: '#0A0F1EF0', backdropFilter: 'blur(12px)', borderBottom: '1px solid #1E2D4A' }}>
      <div style={{ maxWidth: '1160px', margin: '0 auto', padding: '0 24px', height: '60px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '30px', height: '30px', background: 'linear-gradient(135deg,#1D6FEB,#3D8FFF)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Brain size={16} color="white" />
          </div>
          <span style={{ fontWeight: 700, fontSize: '15px', letterSpacing: '-0.3px' }}>MemoryMerge</span>
          <span style={{ fontSize: '10px', padding: '2px 7px', borderRadius: '10px', backgroundColor: '#1D6FEB20', color: '#1D6FEB', fontWeight: 600 }}>BETA</span>
        </div>

        <nav style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', justifyContent: 'center' }}>
          {links.map(([label, id]) => (
            <button
              key={id}
              onClick={() => onNavigate(id)}
              style={{ padding: '7px 12px', borderRadius: '7px', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: 500, backgroundColor: 'transparent', color: '#8A9BB5', transition: 'all 0.15s' }}
            >
              {label}
            </button>
          ))}
        </nav>

        <div style={{ display: 'flex', gap: '8px' }}>
          <a href="https://github.com/Techkeyy/memorymerge" target="_blank" rel="noopener noreferrer" style={{ padding: '7px 14px', borderRadius: '7px', border: '1px solid #1E2D4A', fontSize: '12px', color: '#8A9BB5', textDecoration: 'none', fontWeight: 500 }}>
            GitHub
          </a>
          <a href="https://chainscan-galileo.0g.ai/address/0x4dbFC89D78Bc89578528a848B5bB5fC22b0C4079" target="_blank" rel="noopener noreferrer" style={{ padding: '7px 14px', borderRadius: '7px', border: 'none', backgroundColor: '#1D6FEB', fontSize: '12px', color: 'white', textDecoration: 'none', fontWeight: 600 }}>
            Contract ↗
          </a>
        </div>
      </div>
    </header>
  );
}

function Hero({ onNavigate }: { onNavigate: (id: string) => void }) {
  return (
    <section id="overview" style={{ maxWidth: '1160px', margin: '0 auto', padding: '86px 24px 54px', textAlign: 'center' }}>
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '6px 14px', borderRadius: '20px', backgroundColor: '#1D6FEB15', border: '1px solid #1D6FEB30', marginBottom: '26px' }}>
        <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#00D4AA' }} />
        <span style={{ fontSize: '12px', color: '#8A9BB5' }}>Built for 0G / Open Agents Hackathon · ETHGlobal 2026</span>
      </div>

      <h1 style={{ fontSize: '56px', fontWeight: 800, lineHeight: 1.06, letterSpacing: '-1.7px', marginBottom: '18px', background: 'linear-gradient(135deg, #FFFFFF 0%, #B7C4E6 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
        Persistent memory for<br />AI agent swarms
      </h1>

      <p style={{ fontSize: '18px', color: '#8A9BB5', maxWidth: '640px', margin: '0 auto 32px', lineHeight: 1.7 }}>
        MemoryMerge is a decentralized Memory OS that gives Planner, Researcher, and Critic agents a single shared, resumable state layer backed by 0G Storage, 0G Compute, and 0G Chain.
      </p>

      <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
        <button onClick={() => onNavigate('explorer')} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 24px', borderRadius: '9px', border: 'none', backgroundColor: '#1D6FEB', color: 'white', fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}>
          Live Explorer <ArrowRight size={16} />
        </button>
        <button onClick={() => onNavigate('docs')} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 24px', borderRadius: '9px', border: '1px solid #1E2D4A', backgroundColor: 'transparent', color: '#FFFFFF', fontSize: '14px', fontWeight: 500, cursor: 'pointer' }}>
          Quick Start <ChevronRight size={16} />
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginTop: '40px' }}>
        {[
          { label: 'Network', value: '0G Galileo', sub: 'Testnet' },
          { label: 'Contract', value: '0x4dbF...4079', sub: 'Anchors snapshots' },
          { label: 'Model', value: 'Qwen 2.5 7B', sub: 'TeeML verified' },
          { label: 'Tracks', value: 'Track 1 + 2', sub: 'Dual submission' },
        ].map((s, i) => (
          <div key={i} style={{ ...S.card, padding: '18px 20px', textAlign: 'left' }}>
            <div style={S.label}>{s.label}</div>
            <div style={{ fontSize: '18px', fontWeight: 700, color: '#FFFFFF', marginTop: '6px', letterSpacing: '-0.3px' }}>{s.value}</div>
            <div style={{ fontSize: '11px', color: '#8A9BB5', marginTop: '2px' }}>{s.sub}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

function Features() {
  const features = [
    { icon: <Database size={22} color="#1D6FEB" />, title: 'Decentralized Memory', body: '0G Storage KV for working memory and 0G Storage Log for permanent archives. The swarm never forgets.', color: '#1D6FEB' },
    { icon: <Cpu size={22} color="#A855F7" />, title: 'Autonomous Reflection', body: 'Every N turns, the reflection engine compresses facts into ranked insights using 0G Compute with TeeML verification.', color: '#A855F7' },
    { icon: <Network size={22} color="#00D4AA" />, title: 'Swarm Coordination', body: 'Planner, Researcher, and Critic coordinate exclusively through shared memory state — no direct messaging required.', color: '#00D4AA' },
    { icon: <Shield size={22} color="#F5A623" />, title: 'On-Chain Proof', body: 'Each snapshot root hash is anchored to the MemoryAnchor contract on 0G Chain for durable, auditable proof.', color: '#F5A623' },
    { icon: <Zap size={22} color="#3D8FFF" />, title: 'Drop-In SDK', body: 'Three lines of code. Import the MemoryMerge SDK and give any agent persistent decentralized memory.', color: '#3D8FFF' },
    { icon: <Activity size={22} color="#FF4D6A" />, title: 'Session Continuity', body: 'Restart on a different machine with the same SWARM_ID and the swarm restores all memory automatically.', color: '#FF4D6A' },
  ];

  return (
    <section id="features" style={{ borderTop: '1px solid #1E2D4A', borderBottom: '1px solid #1E2D4A', backgroundColor: '#0D1428' }}>
      <div style={{ maxWidth: '1160px', margin: '0 auto', padding: '72px 24px' }}>
        <div style={{ textAlign: 'center', marginBottom: '46px' }}>
          <div style={S.label}>What it does</div>
          <h2 style={{ fontSize: '32px', fontWeight: 700, letterSpacing: '-0.8px', marginTop: '10px', color: '#FFFFFF' }}>Built different. Built to last.</h2>
          <p style={{ fontSize: '15px', color: '#8A9BB5', marginTop: '10px', maxWidth: '540px', margin: '10px auto 0', lineHeight: 1.7 }}>
            MemoryMerge turns state into infrastructure. Agents write facts, tasks, and insights to 0G Storage; reflection compresses that memory; 0G Chain proves it forever.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
          {features.map((f, i) => (
            <div key={i} style={{ ...S.card, padding: '24px' }}>
              <div style={{ width: '42px', height: '42px', borderRadius: '10px', backgroundColor: f.color + '15', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}>{f.icon}</div>
              <div style={{ fontWeight: 600, fontSize: '15px', marginBottom: '8px', color: '#FFFFFF' }}>{f.title}</div>
              <div style={{ fontSize: '13px', color: '#8A9BB5', lineHeight: 1.65 }}>{f.body}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function HowItWorks() {
  const steps = [
    { n: '01', title: 'Planner reads goal, creates tasks', desc: 'Planner agent loads the swarm context from 0G Storage KV, reads the current goal, and writes 3 concrete subtasks back to 0G Storage.', agent: 'Planner', color: '#1D6FEB' },
    { n: '02', title: 'Researcher executes tasks', desc: 'Researcher reads pending tasks, performs research using 0G Compute inference, writes discovered facts, and marks tasks pending_review.', agent: 'Researcher', color: '#00D4AA' },
    { n: '03', title: 'Critic scores the findings', desc: 'Critic evaluates each research result, assigns confidence scores, checks contradictions, and marks tasks complete.', agent: 'Critic', color: '#F5A623' },
    { n: '04', title: 'Reflection engine fires', desc: 'Every N turns, the reflection engine pulls all facts from 0G Storage KV, compresses them through 0G Compute, writes insights, and archives a snapshot to 0G Storage Log.', agent: 'Reflection', color: '#A855F7' },
    { n: '05', title: 'Snapshot anchored on-chain', desc: 'The Merkle root of each snapshot is anchored to the MemoryAnchor contract on 0G Chain, providing a permanent proof of memory integrity.', agent: '0G Chain', color: '#FF4D6A' },
    { n: '06', title: 'Swarm resumes from anywhere', desc: 'Stop the process and restart with the same SWARM_ID. All memory is restored from 0G Storage automatically.', agent: 'Any Agent', color: '#3D8FFF' },
  ];

  return (
    <section id="how-it-works" style={{ maxWidth: '1160px', margin: '0 auto', padding: '72px 24px' }}>
      <div style={{ marginBottom: '40px' }}>
        <div style={S.label}>How It Works</div>
        <h2 style={{ fontSize: '28px', fontWeight: 700, letterSpacing: '-0.7px', marginTop: '8px' }}>The full execution flow</h2>
        <p style={{ fontSize: '14px', color: '#8A9BB5', marginTop: '6px', lineHeight: 1.7 }}>From goal input to permanent archival, every step is transparent, auditable, and fully resumable.</p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {steps.map((s, i) => (
          <div key={i} style={{ display: 'flex', gap: '24px', paddingBottom: i < steps.length - 1 ? '32px' : 0, position: 'relative' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
              <div style={{ width: '44px', height: '44px', borderRadius: '12px', backgroundColor: s.color + '20', border: `1px solid ${s.color}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '13px', color: s.color, fontFamily: 'monospace' }}>{s.n}</div>
              {i < steps.length - 1 && <div style={{ width: '1px', flex: 1, backgroundColor: '#1E2D4A', marginTop: '8px' }} />}
            </div>
            <div style={{ ...S.card, padding: '20px 24px', flex: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px', gap: '16px' }}>
                <h3 style={{ fontWeight: 600, fontSize: '16px', color: '#FFFFFF' }}>{s.title}</h3>
                <span style={{ fontSize: '10px', padding: '3px 8px', borderRadius: '6px', backgroundColor: s.color + '20', color: s.color, fontWeight: 600, flexShrink: 0 }}>{s.agent}</span>
              </div>
              <p style={{ fontSize: '13px', color: '#8A9BB5', lineHeight: 1.75, margin: 0 }}>{s.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function Explorer() {
  const [data, setData] = useState<SwarmData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastFetch, setLastFetch] = useState(Date.now());
  const [snapshots] = useState<SnapshotEntry[]>(MOCK_SNAPSHOTS);
  const [tab, setTab] = useState<'facts' | 'tasks' | 'insights'>('facts');
  const contractAddress = '0x4dbFC89D78Bc89578528a848B5bB5fC22b0C4079';
  const chainExplorer = 'https://chainscan-galileo.0g.ai';
  const storageExplorer = 'https://storagescan-galileo.0g.ai';

  const fetchData = useCallback(async () => {
    try {
      setError(null);
      const res = await fetch('/api/swarm', { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setData(json);
      setLastFetch(Date.now());
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const facts = data?.facts ?? [];
  const tasks = data?.tasks ?? [];
  const insights = data?.insights ?? [];
  const completed = tasks.filter((t) => t.status === 'complete').length;
  const avgConf = facts.length > 0 ? facts.reduce((sum, fact) => sum + fact.confidence, 0) / facts.length : 0;

  if (loading) {
    return (
      <div style={{ padding: '80px 24px', textAlign: 'center', color: '#8A9BB5' }}>
        Loading swarm data from 0G Storage...
      </div>
    );
  }

  if (error) {
    return (
      <section id="explorer" style={{ borderTop: '1px solid #1E2D4A', backgroundColor: '#0D1428' }}>
        <div style={{ maxWidth: '1160px', margin: '0 auto', padding: '72px 24px' }}>
          <div style={{ ...S.card, padding: '18px' }}>
            <div style={{ fontWeight: 700, color: '#FFFFFF', marginBottom: '8px' }}>Failed to load live swarm data</div>
            <div style={{ fontSize: '13px', color: '#8A9BB5', lineHeight: 1.7, marginBottom: '14px' }}>{error}</div>
            <button onClick={fetchData} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 12px', borderRadius: '8px', border: '1px solid #1E2D4A', backgroundColor: 'transparent', color: '#FFFFFF', cursor: 'pointer' }}>
              <RefreshCw size={12} /> Retry
            </button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section id="explorer" style={{ borderTop: '1px solid #1E2D4A', backgroundColor: '#0D1428' }}>
      <div style={{ maxWidth: '1160px', margin: '0 auto', padding: '72px 24px' }}>
        <div style={{ marginBottom: '26px' }}>
          <div style={S.label}>Live Explorer</div>
          <h2 style={{ fontSize: '28px', fontWeight: 700, letterSpacing: '-0.7px', marginTop: '8px' }}>Swarm memory state in real time</h2>
          <p style={{ fontSize: '14px', color: '#8A9BB5', marginTop: '6px', lineHeight: 1.7 }}>This dashboard mirrors the state stored in 0G Storage: facts, tasks, insights, snapshots, and on-chain anchors.</p>
          <div style={{ marginTop: '10px', fontSize: '11px', color: '#8A9BB5' }}>Last synced {timeAgo(lastFetch)}</div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '18px' }}>
          {[
            { label: 'Facts', value: facts.length, sub: `${facts.filter((f) => f.reviewed).length} reviewed`, color: '#1D6FEB', icon: <Database size={15} color="#1D6FEB" /> },
            { label: 'Tasks', value: `${completed}/${tasks.length}`, sub: `${tasks.length - completed} remaining`, color: '#00D4AA', icon: <CheckCircle size={15} color="#00D4AA" /> },
            { label: 'Insights', value: insights.length, sub: 'from reflection', color: '#A855F7', icon: <Zap size={15} color="#A855F7" /> },
            { label: 'Avg Confidence', value: `${(avgConf * 100).toFixed(0)}%`, sub: 'across all facts', color: '#F5A623', icon: <Activity size={15} color="#F5A623" /> },
          ].map((s, i) => (
            <div key={i} style={{ ...S.card, padding: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={S.label}>{s.label}</span>{s.icon}
              </div>
              <div style={{ fontSize: '22px', fontWeight: 700, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: '11px', color: '#8A9BB5', marginTop: '3px' }}>{s.sub}</div>
            </div>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '16px' }}>
          <div style={S.card}>
            <div style={{ display: 'flex', borderBottom: '1px solid #1E2D4A', padding: '0 16px' }}>
              {(['facts', 'tasks', 'insights'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  style={{ padding: '11px 16px', border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '13px', fontWeight: tab === t ? 600 : 400, color: tab === t ? '#FFFFFF' : '#8A9BB5', borderBottom: tab === t ? '2px solid #1D6FEB' : '2px solid transparent', marginBottom: '-1px', textTransform: 'capitalize' }}
                >
                  {t}
                  <span style={{ marginLeft: '5px', padding: '1px 6px', borderRadius: '9px', fontSize: '10px', backgroundColor: tab === t ? '#1D6FEB20' : '#1E2D4A', color: tab === t ? '#1D6FEB' : '#8A9BB5' }}>
                    {t === 'facts' ? facts.length : t === 'tasks' ? tasks.length : insights.length}
                  </span>
                </button>
              ))}
            </div>

            <div style={{ padding: '14px', maxHeight: '460px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {tab === 'facts' && facts.map((f, i) => (
                <div key={i} style={{ padding: '12px 14px', backgroundColor: '#0A0F1E', border: '1px solid #1E2D4A', borderRadius: '8px', borderLeft: `3px solid ${agentColor(f.authorAgent)}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', gap: '12px' }}>
                    <span style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '4px', backgroundColor: agentColor(f.authorAgent) + '15', color: agentColor(f.authorAgent), fontFamily: 'monospace' }}>{f.authorAgent}</span>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      {f.reviewed && <span style={{ fontSize: '10px', color: '#00D4AA' }}>✓ reviewed</span>}
                      <span style={{ fontSize: '12px', fontWeight: 700, color: confColor(f.confidence) }}>{(f.confidence * 100).toFixed(0)}%</span>
                    </div>
                  </div>
                  <div style={{ fontSize: '13px', color: '#E0E8FF', lineHeight: 1.5 }}>{f.value}</div>
                  <div style={{ fontSize: '10px', color: '#8A9BB5', marginTop: '6px', fontFamily: 'monospace' }}>{f.key} · {timeAgo(f.timestamp)}</div>
                </div>
              ))}

              {tab === 'tasks' && tasks.map((t, i) => (
                <div key={i} style={{ padding: '12px 14px', backgroundColor: '#0A0F1E', border: '1px solid #1E2D4A', borderRadius: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', gap: '12px' }}>
                    <span style={{ fontSize: '11px', fontFamily: 'monospace', color: '#3D8FFF' }}>{t.taskId}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>{statusIcon(t.status)}<span style={{ fontSize: '11px', color: '#8A9BB5' }}>{statusLabel(t.status)}</span></div>
                  </div>
                  <div style={{ fontSize: '13px', color: '#E0E8FF', lineHeight: 1.5, marginBottom: '6px' }}>{t.description}</div>
                  {t.result && <div style={{ fontSize: '12px', color: '#8A9BB5', padding: '8px', backgroundColor: '#1E2D4A', borderRadius: '6px', borderLeft: '2px solid #00D4AA' }}>{t.result}</div>}
                  <div style={{ fontSize: '10px', color: '#8A9BB5', marginTop: '6px' }}>assigned to {t.assignedTo} · updated {timeAgo(t.updatedAt)}</div>
                </div>
              ))}

              {tab === 'insights' && [...insights].sort((a, b) => b.importance - a.importance).map((ins, i) => (
                <div key={i} style={{ padding: '12px 14px', backgroundColor: '#0A0F1E', border: '1px solid #1E2D4A', borderRadius: '8px', borderLeft: '3px solid #A855F7' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', gap: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Zap size={12} color="#A855F7" /><span style={{ fontSize: '11px', color: '#A855F7' }}>Epoch {ins.epochNumber}</span></div>
                    <span style={{ fontSize: '12px', fontWeight: 700, color: ins.importance >= 8 ? '#A855F7' : '#F5A623' }}>{ins.importance}/10</span>
                  </div>
                  <div style={{ fontSize: '13px', color: '#E0E8FF', lineHeight: 1.5 }}>{ins.insight}</div>
                  <div style={{ fontSize: '10px', color: '#8A9BB5', marginTop: '6px', fontFamily: 'monospace' }}>{ins.key} · {timeAgo(ins.generatedAt)}</div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={S.card}>
              <div style={{ padding: '12px 14px', borderBottom: '1px solid #1E2D4A', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Database size={13} color="#1D6FEB" /><span style={S.label}>0G Storage Snapshot</span>
              </div>
              <div style={{ padding: '12px' }}>
                {snapshots.map((snap, i) => (
                  <div key={i} style={{ padding: '10px 12px', backgroundColor: '#0A0F1E', border: '1px solid #1E2D4A', borderRadius: '8px', marginBottom: '8px' }}>
                    <div style={{ fontSize: '10px', fontFamily: 'monospace', color: '#3D8FFF', marginBottom: '6px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{snap.rootHash.slice(0, 20)}...</div>
                    <div style={{ fontSize: '11px', color: '#8A9BB5', display: 'flex', justifyContent: 'space-between', gap: '12px' }}>
                      <span>{snap.factCount}f · {snap.taskCount}t · {snap.insightCount}i</span>
                      <span>{timeAgo(snap.timestamp)}</span>
                    </div>
                    <a href={`${storageExplorer}/tx/${snap.rootHash}`} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '8px', fontSize: '11px', color: '#1D6FEB', textDecoration: 'none' }}>
                      <ExternalLink size={10} />
                      View on StorageScan
                    </a>
                  </div>
                ))}
                <a href={storageExplorer} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', padding: '8px', borderRadius: '6px', border: '1px dashed #1E2D4A', fontSize: '11px', color: '#8A9BB5', textDecoration: 'none', marginTop: '4px' }}>
                  View all on 0G StorageScan
                  <ChevronRight size={12} />
                </a>
              </div>
            </div>

            <div style={S.card}>
              <div style={{ padding: '12px 14px', borderBottom: '1px solid #1E2D4A', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Zap size={13} color="#F5A623" /><span style={S.label}>On-Chain Anchor</span>
              </div>
              <div style={{ padding: '12px' }}>
                <div style={{ fontSize: '11px', color: '#8A9BB5', marginBottom: '6px' }}>MemoryAnchor Contract</div>
                <div style={{ fontSize: '10px', fontFamily: 'monospace', color: '#3D8FFF', padding: '8px', backgroundColor: '#0A0F1E', borderRadius: '6px', wordBreak: 'break-all', marginBottom: '8px' }}>{contractAddress}</div>
                <a href={`${chainExplorer}/address/${contractAddress}`} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '8px 12px', borderRadius: '6px', backgroundColor: '#1D6FEB15', border: '1px solid #1D6FEB30', fontSize: '12px', color: '#1D6FEB', textDecoration: 'none', fontWeight: 500 }}>
                  <ExternalLink size={11} />
                  View on Chain Explorer
                </a>
              </div>
            </div>

            <div style={{ ...S.card, padding: '14px' }}>
              <div style={{ ...S.label, marginBottom: '12px' }}>Agent Memory Flow</div>
              {[
                { name: 'Planner', desc: 'Goals → Tasks', color: '#1D6FEB' },
                { name: 'Researcher', desc: 'Tasks → Facts', color: '#00D4AA' },
                { name: 'Critic', desc: 'Facts → Scores', color: '#F5A623' },
                { name: 'Reflection', desc: 'Facts → Insights', color: '#A855F7' },
              ].map((a, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <div style={{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: a.color, flexShrink: 0 }} />
                  <span style={{ fontSize: '12px', fontWeight: 600, color: a.color, minWidth: '72px' }}>{a.name}</span>
                  <span style={{ fontSize: '11px', color: '#8A9BB5' }}>{a.desc}</span>
                </div>
              ))}
              <div style={{ marginTop: '10px', padding: '8px', backgroundColor: '#0A0F1E', borderRadius: '6px', fontSize: '11px', color: '#8A9BB5', borderLeft: '2px solid #1D6FEB' }}>
                Coordination via 0G Storage state only
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Docs() {
  return (
    <section id="docs" style={{ maxWidth: '1160px', margin: '0 auto', padding: '72px 24px' }}>
      <div style={{ marginBottom: '40px' }}>
        <div style={S.label}>Documentation</div>
        <h2 style={{ fontSize: '28px', fontWeight: 700, letterSpacing: '-0.7px', marginTop: '8px' }}>Quick Start & SDK Reference</h2>
        <p style={{ fontSize: '14px', color: '#8A9BB5', marginTop: '6px', lineHeight: 1.7 }}>Get a MemoryMerge swarm running in under 10 minutes.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: '32px', alignItems: 'start' }}>
        <div style={{ ...S.card, padding: '12px', position: 'sticky', top: '82px' }}>
          {['Installation', 'Environment Setup', '0G Compute Setup', 'Run Example', 'SDK Reference', 'Contract'].map((item, i) => (
            <div key={i} style={{ padding: '8px 10px', borderRadius: '7px', fontSize: '13px', color: i === 0 ? '#FFFFFF' : '#8A9BB5', fontWeight: i === 0 ? 600 : 400, cursor: 'pointer', marginBottom: '2px', backgroundColor: i === 0 ? '#1E2D4A' : 'transparent' }}>
              {item}
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '40px' }}>
          <section>
            <h3 style={{ fontWeight: 700, fontSize: '20px', marginBottom: '16px', color: '#FFFFFF' }}>Installation</h3>
            <CodeBlock lang="bash" code={`git clone https://github.com/Techkeyy/memorymerge.git
cd memorymerge
npm install`} />
          </section>

          <section>
            <h3 style={{ fontWeight: 700, fontSize: '20px', marginBottom: '8px', color: '#FFFFFF' }}>Environment Setup</h3>
            <p style={{ fontSize: '13px', color: '#8A9BB5', marginBottom: '14px', lineHeight: 1.7 }}>Copy the example env file and fill in your values. All 0G credentials come from the Galileo testnet.</p>
            <CodeBlock lang="bash" code={`cp .env.example .env`} />
            <div style={{ marginTop: '12px' }}>
              <CodeBlock lang="env" code={`# 0G Network - Galileo Testnet
ZG_EVM_RPC=https://evmrpc-testnet.0g.ai
ZG_INDEXER_RPC=https://indexer-storage-testnet-turbo.0g.ai
ZG_PRIVATE_KEY=your_testnet_wallet_private_key

# 0G Compute (from CLI setup below)
ZG_COMPUTE_PROVIDER=0xa48f01287233509FD694a22Bf840225062E67836
ZG_SERVICE_URL=your_service_url
ZG_API_SECRET=your_app_sk

# Contract - already deployed
MEMORY_ANCHOR_ADDRESS=0x4dbFC89D78Bc89578528a848B5bB5fC22b0C4079

# Swarm identity
SWARM_ID=memorymerge-swarm-001`} />
            </div>
          </section>

          <section>
            <h3 style={{ fontWeight: 700, fontSize: '20px', marginBottom: '8px', color: '#FFFFFF' }}>0G Compute Setup</h3>
            <p style={{ fontSize: '13px', color: '#8A9BB5', marginBottom: '14px', lineHeight: 1.7 }}>One-time setup. Funds your account and gets API credentials for the inference endpoint.</p>
            <CodeBlock lang="bash" code={`npm install -g @0glabs/0g-serving-broker

0g-compute-cli setup-network          # Select: Testnet
0g-compute-cli login                   # Enter private key
0g-compute-cli deposit --amount 3     # Fund compute account

0g-compute-cli inference acknowledge-provider \
  --provider 0xa48f01287233509FD694a22Bf840225062E67836

# Get your credentials - copy to .env
0g-compute-cli inference get-secret \
  --provider 0xa48f01287233509FD694a22Bf840225062E67836`} />
          </section>

          <section>
            <h3 style={{ fontWeight: 700, fontSize: '20px', marginBottom: '8px', color: '#FFFFFF' }}>Run the Example Swarm</h3>
            <CodeBlock lang="bash" code={`# Default research goal
npm run example

# Custom goal
npm run example -- "Research decentralized AI infrastructure in 2026"

# Resume previous session (same SWARM_ID)
npm run example`} />
            <div style={{ ...S.card, padding: '14px 18px', marginTop: '14px', borderLeft: '3px solid #00D4AA' }}>
              <p style={{ fontSize: '13px', color: '#8A9BB5', margin: 0, lineHeight: 1.7 }}>
                <strong style={{ color: '#00D4AA' }}>Session continuity:</strong> Run the same command again with the same SWARM_ID — the swarm loads all memory from 0G Storage and continues where it left off.
              </p>
            </div>
          </section>

          <section>
            <h3 style={{ fontWeight: 700, fontSize: '20px', marginBottom: '8px', color: '#FFFFFF' }}>SDK Reference</h3>
            <CodeBlock lang="typescript" code={`import { createMemoryManager, createReflectionEngine } from 'memorymerge';

const memory = createMemoryManager('my-agent');

// Facts — written to 0G Storage KV
await memory.writeFact('key', 'value', confidence);
await memory.readFact('key');
await memory.getAllFacts();
await memory.updateFactConfidence('key', 0.9, true);

// Tasks
await memory.writeTask('task-id', { status, assignedTo, description });
await memory.updateTaskStatus('task-id', 'complete', result);
await memory.getAllTasks();

// Insights (generated by reflection engine)
await memory.getAllInsights();

// Full swarm context — most important method
const ctx = await memory.getSwarmContext();
// Returns: { swarmId, goal, facts[], tasks[], insights[] }

// Archive snapshot to 0G Storage Log (permanent)
const snap = await memory.snapshot(epochNumber);
// Returns: { rootHash, timestamp, label, factCount }
// Verify at: https://storagescan-galileo.0g.ai

// Reflection Engine
const reflection = createReflectionEngine(memory, 20);
await reflection.tick();            // auto-fires after 20 turns
await reflection.forceReflection(); // manual trigger`} />
          </section>

          <section>
            <h3 style={{ fontWeight: 700, fontSize: '20px', marginBottom: '8px', color: '#FFFFFF' }}>Contract</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: '12px', marginBottom: '16px' }}>
              {[
                { label: 'Address', value: '0x4dbFC89D78Bc89578528a848B5bB5fC22b0C4079' },
                { label: 'Network', value: '0G Galileo Testnet' },
                { label: 'Chain ID', value: '16602' },
                { label: 'Explorer', value: 'chainscan-galileo.0g.ai' },
              ].map((r, i) => (
                <div key={i} style={{ ...S.card, padding: '12px 14px' }}>
                  <div style={{ ...S.label, marginBottom: '4px' }}>{r.label}</div>
                  <div style={{ fontSize: '12px', fontFamily: 'monospace', color: '#3D8FFF', wordBreak: 'break-all' }}>{r.value}</div>
                </div>
              ))}
            </div>
            <CodeBlock lang="solidity" code={`// MemoryAnchor.sol — anchors snapshot root hashes on-chain
function anchorSnapshot(
    string calldata swarmId,
    bytes32 rootHash,
    uint256 epochNumber,
    string calldata label
) external;

function getLatestSnapshot(string calldata swarmId)
    external view returns (MemorySnapshot memory);`} />
          </section>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer style={{ borderTop: '1px solid #1E2D4A', padding: '24px', marginTop: '24px' }}>
      <div style={{ maxWidth: '1160px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
        <div style={{ fontSize: '12px', color: '#8A9BB5' }}>MemoryMerge · Built for 0G / Open Agents Hackathon · ETHGlobal 2026</div>
        <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
          {[
            ['GitHub', 'https://github.com/Techkeyy/memorymerge'],
            ['Contract', 'https://chainscan-galileo.0g.ai/address/0x4dbFC89D78Bc89578528a848B5bB5fC22b0C4079'],
            ['StorageScan', 'https://storagescan-galileo.0g.ai'],
            ['0G Docs', 'https://docs.0g.ai'],
          ].map(([label, href]) => (
            <a key={label} href={href} target="_blank" rel="noopener noreferrer" style={{ fontSize: '12px', color: '#1D6FEB', textDecoration: 'none' }}>
              {label}
            </a>
          ))}
        </div>
      </div>
    </footer>
  );
}

export default function App() {
  const [isLive, setIsLive] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(Date.now());

  const refresh = useCallback(() => {
    setLastRefresh(Date.now());
  }, []);

  useEffect(() => {
    if (!isLive) return;
    const interval = window.setInterval(refresh, 5000);
    return () => window.clearInterval(interval);
  }, [isLive, refresh]);

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#0A0F1E', color: '#FFFFFF', fontFamily: "'Inter',-apple-system,sans-serif" }}>
      <Nav onNavigate={scrollToSection} />

      <main>
        <Hero onNavigate={scrollToSection} />

        <section style={{ maxWidth: '1160px', margin: '0 auto', padding: '0 24px 24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', gap: '16px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '999px', backgroundColor: isLive ? '#00D4AA' : '#8A9BB5' }} />
              <span style={{ fontSize: '12px', color: '#8A9BB5' }}>Preview state · refreshed {timeAgo(lastRefresh)}</span>
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => setIsLive(v => !v)}
                style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 12px', borderRadius: '8px', border: '1px solid #1E2D4A', backgroundColor: isLive ? '#00D4AA12' : 'transparent', color: isLive ? '#00D4AA' : '#8A9BB5', cursor: 'pointer' }}
              >
                <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: isLive ? '#00D4AA' : '#8A9BB5' }} />
                {isLive ? 'Live' : 'Paused'}
              </button>
              <button
                onClick={refresh}
                style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 12px', borderRadius: '8px', border: '1px solid #1E2D4A', backgroundColor: 'transparent', color: '#8A9BB5', cursor: 'pointer' }}
              >
                <RefreshCw size={12} /> Refresh
              </button>
            </div>
          </div>
        </section>

        <Features />
        <HowItWorks />
        <Explorer />
        <Docs />
      </main>

      <Footer />

      <style>{`
        * { box-sizing: border-box; }
        html { scroll-behavior: smooth; }
        @keyframes spin { to { transform: rotate(360deg); } }
        .animate-spin { animation: spin 1s linear infinite; }
      `}</style>
    </div>
  );
}