import { useEffect, useState } from 'react';
import { useStore, engine } from '../state/store';
import { compareTracks, CompareResult } from '../engine/compare';
import { listMixes, getMixBlob, MixMeta } from '../state/mixes';

interface SourceRef {
  id: string;
  label: string;
  kind: 'library' | 'mix';
}

async function bufferFor(ref: SourceRef): Promise<AudioBuffer | null> {
  if (ref.kind === 'library') {
    return useStore.getState().library.find((t) => t.id === ref.id)?.buffer ?? null;
  }
  const blob = await getMixBlob(ref.id);
  if (!blob) return null;
  return engine.decode(await blob.arrayBuffer());
}

function Bar({ label, value }: { label: string; value: number }) {
  return (
    <div className="cmp-bar">
      <span>{label}</span>
      <div className="cmp-track">
        <div className="cmp-fill" style={{ width: `${Math.round(value * 100)}%` }} />
      </div>
      <b>{Math.round(value * 100)}%</b>
    </div>
  );
}

/** Compare any two sounds (library tracks or recorded mixes): structure, tone, BPM. */
export function ComparePanel() {
  const library = useStore((s) => s.library);
  const recording = useStore((s) => s.recording);
  const [mixes, setMixes] = useState<MixMeta[]>([]);
  const [selA, setSelA] = useState('');
  const [selB, setSelB] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<CompareResult | null>(null);

  useEffect(() => {
    void listMixes().then(setMixes);
  }, [recording]);

  const sources: SourceRef[] = [
    ...library.map((t) => ({ id: t.id, label: `♫ ${t.name}`, kind: 'library' as const })),
    ...mixes.map((m) => ({ id: m.id, label: `● ${m.name}`, kind: 'mix' as const })),
  ];
  if (sources.length < 2) return null;

  const run = async () => {
    const a = sources.find((s) => s.id === selA);
    const b = sources.find((s) => s.id === selB);
    if (!a || !b) return;
    setBusy(true);
    setResult(null);
    try {
      const [ba, bb] = await Promise.all([bufferFor(a), bufferFor(b)]);
      if (ba && bb) setResult(compareTracks(ba, bb));
    } finally {
      setBusy(false);
    }
  };

  const pick = (v: string, set: (s: string) => void) => set(v);

  return (
    <div className="compare">
      <span className="lib-title">COMPARE</span>
      <div className="cmp-controls">
        <select value={selA} onChange={(e) => pick(e.target.value, setSelA)}>
          <option value="">reference…</option>
          {sources.map((s) => (
            <option key={s.id} value={s.id}>
              {s.label}
            </option>
          ))}
        </select>
        <span className="cmp-vs">vs</span>
        <select value={selB} onChange={(e) => pick(e.target.value, setSelB)}>
          <option value="">candidate…</option>
          {sources.map((s) => (
            <option key={s.id} value={s.id}>
              {s.label}
            </option>
          ))}
        </select>
        <button disabled={!selA || !selB || selA === selB || busy} onClick={() => void run()}>
          {busy ? 'analyzing…' : 'COMPARE'}
        </button>
      </div>
      {result && (
        <div className="cmp-result">
          <Bar label="overall" value={result.overall} />
          <Bar label="structure (energy arc)" value={result.structure} />
          <Bar label="tonal balance" value={result.spectralBalance} />
          <Bar label="low / mid / high shape" value={(result.bandStructure.low + result.bandStructure.mid + result.bandStructure.high) / 3} />
          <div className="cmp-bpm">
            BPM: {result.bpmA ?? '—'} vs {result.bpmB ?? '—'}
            {result.bpmDelta !== null && <> · Δ {result.bpmDelta.toFixed(1)}</>}
          </div>
        </div>
      )}
    </div>
  );
}
