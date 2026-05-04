'use client';
import { useState } from 'react';

const modes = {
  Regulatory: ['SEBI Grade A', 'RBI Grade B', 'NABARD Grade A', 'IRDAI AM', 'IFSCA Grade A'],
  Banking: ['IBPS PO', 'SBI Clerk', 'RBI Assistant', 'IBPS Clerk'],
  SSC: ['SSC CGL', 'SSC CHSL', 'SSC MTS', 'SSC GD'],
  Railways: ['RRB NTPC', 'RRB Group D', 'RRB JE'],
  UPSC: ['CSE', 'CDS', 'CAPF', 'EPFO'],
  'State PSC': ['MPPSC', 'BPSC', 'UPPSC', 'MPSC'],
  PSU: ['GAIL', 'ONGC', 'BHEL', 'NTPC'],
} as const;

type Mode = keyof typeof modes;

export default function AspirantModePreview() {
  const [mode, setMode] = useState<Mode>('Regulatory');

  return (
    <div className="cc-mode-selector">
      <div className="cc-mode-chips">
        {(Object.keys(modes) as Mode[]).map((m) => (
          <button key={m} type="button" onClick={() => setMode(m)} className={m === mode ? 'is-active' : ''}>{m}</button>
        ))}
      </div>
      <ul>
        {modes[mode].map((item) => <li key={item}>{item}</li>)}
      </ul>
    </div>
  );
}
