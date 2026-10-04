import { useEffect, useMemo, useState } from 'react';
import { Download, Medal, Target, TrendingUp } from 'lucide-react';
import { api } from '../api.js';
import { ErrorState, LoadingState, PageHeading, TierPill, useNumber } from '../components/UI.jsx';
import { Legend, RankingChart } from '../components/ChartPanel.jsx';

const tierNames = { 1: 'ขยายกำลังรองรับ', 2: 'พัฒนาเฉพาะทาง', 3: 'พัฒนาเฉพาะทาง', 4: 'ติดตาม' };

export default function Ranking() {
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const number = useNumber();
  useEffect(() => { api.ranking().then(setResult).catch(setError); }, []);
  const ranking = result?.ranking || [];
  const tiers = useMemo(() => [
    { key: '1', label: 'ขยายกำลังรองรับ', count: ranking.filter((row) => row.tier === 1).length, tiers: [1] },
    { key: '2-3', label: 'พัฒนาเฉพาะทาง', count: ranking.filter((row) => row.tier === 2 || row.tier === 3).length, tiers: [2, 3] },
    { key: '4', label: 'ติดตาม', count: ranking.filter((row) => row.tier === 4).length, tiers: [4] },
  ], [ranking]);
  const summaryTier = { '1': 1, '2-3': 2, '4': 4 };
  if (error) return <><PageHeading eyebrow="Priority ranking / 02" title="จัดอันดับพื้นที่" description="จัดอันดับพื้นที่จากตัวชี้วัดปริมาณ การเติบโต ความหลากหลาย สมดุล และเสถียรภาพ" /><ErrorState error={error} /></>;
  if (!result) return <LoadingState />;
  const exportUrl = api.url('/ranking/export.csv');

  return <>
    <PageHeading eyebrow="Priority ranking / 02" title="จัดอันดับพื้นที่" description="จัดลำดับพื้นที่ที่ควรพิจารณาลงทุน โดยใช้น้ำหนักเริ่มต้นโปรไฟล์สมดุลและข้อมูลครบ 4 ปี" action={<a href={exportUrl} className="inline-flex items-center justify-center gap-2 rounded-xl bg-navy-950 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-800"><Download size={16} />ส่งออก CSV</a>} />
    <div className="mb-5 grid gap-4 sm:grid-cols-3">
      <div className="panel flex items-center gap-4 p-4"><span className="grid h-11 w-11 place-items-center rounded-xl bg-blue-50 text-brand-700"><Target size={20} /></span><div><div className="text-xs text-slate-500">พื้นที่เข้าเกณฑ์</div><div className="mt-1 text-xl font-bold text-slate-900">{ranking.length} <span className="text-sm font-medium text-slate-500">พื้นที่</span></div></div></div>
      <div className="panel flex items-center gap-4 p-4"><span className="grid h-11 w-11 place-items-center rounded-xl bg-orange-50 text-orange-700"><Medal size={20} /></span><div><div className="text-xs text-slate-500">อันดับ 1</div><div className="mt-1 text-xl font-bold text-slate-900">{ranking[0]?.name_th || '—'} <span className="text-sm font-medium text-slate-500">{number(ranking[0]?.score)} คะแนน</span></div></div></div>
      <div className="panel flex items-center gap-4 p-4"><span className="grid h-11 w-11 place-items-center rounded-xl bg-emerald-50 text-emerald-700"><TrendingUp size={20} /></span><div><div className="text-xs text-slate-500">น้ำหนักโปรไฟล์</div><div className="mt-1 text-sm font-bold text-slate-900">สมดุล · V40 G25 D15 B10 S10</div></div></div>
    </div>
    <section className="grid gap-5 xl:grid-cols-[minmax(0,1.3fr)_minmax(300px,.7fr)]">
      <article className="panel p-5 sm:p-6"><div className="mb-2 flex flex-col justify-between gap-3 sm:flex-row sm:items-start"><div><h2 className="text-base font-bold text-slate-900">คะแนนรวม 12 อันดับแรก</h2><p className="mt-1 text-xs text-slate-500">คะแนนถ่วงน้ำหนักบนสเกล 0–100</p></div><Legend items={[{ label: 'คะแนนต่ำกว่า', color: '#9ec5f4' }, { label: 'คะแนนสูงกว่า', color: '#104281' }]} /></div><RankingChart data={ranking} /></article>
      <article className="panel p-5 sm:p-6"><h2 className="text-base font-bold text-slate-900">พื้นที่ตามชั้นความสำคัญ</h2><p className="mt-1 text-xs text-slate-500">จัดชั้นจากคะแนนรวมและปริมาณเฉลี่ยต่อปี</p><div className="mt-5 space-y-3">{tiers.map(({ key, label, count }) => <div key={key} className="flex items-center justify-between rounded-xl border border-slate-100 px-3 py-3"><div><TierPill tier={summaryTier[key]} /><div className="mt-1.5 text-[11px] text-slate-400">{label}</div></div><div className="text-lg font-bold tabular-nums text-slate-900">{count}<span className="ml-1 text-xs font-medium text-slate-400">พื้นที่</span></div></div>)}</div><div className="mt-5 rounded-xl bg-slate-50 p-4 text-xs leading-5 text-slate-500">ชั้น 2 และ 3 แสดงความหมายรวมเป็น “พัฒนาเฉพาะทาง” ตามข้อสังเกตในสเปก แต่ยังคงเลขชั้นตามกฎต้นฉบับ</div></article>
    </section>
    <section className="panel mt-5 overflow-hidden"><div className="border-b border-slate-100 px-5 py-4"><h2 className="text-base font-bold text-slate-900">ผลการจัดอันดับทั้งหมด</h2><p className="mt-1 text-xs text-slate-500">เรียงตามคะแนนรวมจากมากไปน้อย</p></div><div className="overflow-x-auto"><table className="min-w-full text-sm"><thead className="bg-slate-50 text-xs font-semibold text-slate-500"><tr><th className="px-5 py-3 text-left">อันดับ</th><th className="px-5 py-3 text-left">พื้นที่</th><th className="px-5 py-3 text-right">คะแนน</th><th className="px-5 py-3 text-right">เฉลี่ย/ปี (ล้านตัน)</th><th className="px-5 py-3 text-left">ชั้น</th></tr></thead><tbody>{ranking.map((row) => <tr key={row.province_id} className="border-t border-slate-100 hover:bg-blue-50/40"><td className="px-5 py-3 font-bold tabular-nums text-slate-500">{String(row.rank).padStart(2, '0')}</td><td className="px-5 py-3"><div className="font-semibold text-slate-800">{row.name_th}</div><div className="mt-0.5 text-xs text-slate-400">{row.name_en}</div></td><td className="px-5 py-3 text-right font-bold tabular-nums text-slate-900">{number(row.score, 2)}</td><td className="px-5 py-3 text-right tabular-nums text-slate-600">{number(Number(row.avgVolumeTon) / 1e6, 2)}</td><td className="px-5 py-3"><TierPill tier={row.tier} /></td></tr>)}</tbody></table></div></section>
  </>;
}
