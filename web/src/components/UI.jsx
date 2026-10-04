import { AlertCircle, ArrowDownRight, ArrowUpRight, LoaderCircle } from 'lucide-react';

export function PageHeading({ eyebrow, title, description, action }) {
  return <div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
    <div><div className="mb-2 text-xs font-bold uppercase tracking-[.18em] text-brand-700">{eyebrow}</div><h1 className="text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">{title}</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">{description}</p></div>
    {action}
  </div>;
}

export function StatCard({ label, value, suffix, note, trend, icon: Icon }) {
  return <article className="panel p-5">
    <div className="flex items-start justify-between"><div className="text-sm font-medium text-slate-500">{label}</div>{Icon && <span className="grid h-10 w-10 place-items-center rounded-xl bg-blue-50 text-brand-700"><Icon size={19} aria-hidden="true" /></span>}</div>
    <div className="mt-5 flex items-baseline gap-2"><span className="text-2xl font-bold tracking-tight text-slate-950 tabular-nums">{value}</span>{suffix && <span className="text-sm text-slate-500">{suffix}</span>}</div>
    {note && <div className={`mt-2 inline-flex items-center gap-1 text-xs font-semibold ${trend === 'down' ? 'text-orange-700' : 'text-emerald-700'}`}>{trend === 'down' ? <ArrowDownRight size={14} /> : <ArrowUpRight size={14} />}{note}</div>}
  </article>;
}

export function LoadingState({ label = 'กำลังโหลดข้อมูล…' }) {
  return <div className="flex min-h-48 items-center justify-center gap-3 text-sm text-slate-500"><LoaderCircle className="animate-spin text-brand-600" size={20} />{label}</div>;
}

export function ErrorState({ error }) {
  return <div role="alert" className="flex items-center gap-3 rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-800"><AlertCircle size={20} />ไม่สามารถโหลดข้อมูลได้: {error?.message || 'โปรดลองใหม่'}</div>;
}

export function useNumber() {
  return (value, digits = 1) => Number(value || 0).toLocaleString('th-TH', { maximumFractionDigits: digits });
}

export function TierPill({ tier }) {
  const meta = {
    1: ['ชั้น 1', 'bg-red-50 text-red-700 ring-red-200'],
    2: ['ชั้น 2', 'bg-orange-50 text-orange-700 ring-orange-200'],
    3: ['ชั้น 3', 'bg-blue-50 text-blue-700 ring-blue-200'],
    4: ['ชั้น 4', 'bg-slate-100 text-slate-600 ring-slate-200'],
  }[tier] || ['—', 'bg-slate-100 text-slate-600 ring-slate-200'];
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${meta[1]}`}>{meta[0]} · {tier === 1 ? 'ขยายกำลังรองรับ' : tier === 2 || tier === 3 ? 'พัฒนาเฉพาะทาง' : 'ติดตาม'}</span>;
}
