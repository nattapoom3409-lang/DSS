import { useEffect, useMemo, useState } from 'react';
import { RotateCcw, SlidersHorizontal, Sparkles } from 'lucide-react';
import { api } from '../api.js';
import { DEFAULT_WEIGHTS, FACTORS, PROFILES, rankLocal } from '../lib/scoring.js';
import { ErrorState, LoadingState, PageHeading, TierPill, useNumber } from '../components/UI.jsx';

const factorNames = { V: 'ปริมาณสินค้า', G: 'การเติบโต', D: 'ความหลากหลาย', B: 'สมดุลเข้า–ออก', S: 'เสถียรภาพ' };
const factorHelp = { V: 'ขนาดการขนส่งเฉลี่ย', G: 'การเปลี่ยนแปลงรายปี', D: 'การกระจายหมวดสินค้า', B: 'สมดุลปริมาณเข้าและออก', S: 'ความสม่ำเสมอของปริมาณ' };
const swatches = { V: '#2a78d6', G: '#eb6834', D: '#1baf7a', B: '#eda100', S: '#4a3aa7' };

export default function WhatIf() {
  const [baseline, setBaseline] = useState([]);
  const [indicators, setIndicators] = useState([]);
  const [weights, setWeights] = useState(DEFAULT_WEIGHTS);
  const [profile, setProfile] = useState('balanced');
  const [error, setError] = useState(null);
  const number = useNumber();
  useEffect(() => {
    Promise.all([api.ranking(), api.indicators()]).then(([ranked, rows]) => { setBaseline(ranked.ranking); setIndicators(rows); }).catch(setError);
  }, []);
  const adjusted = useMemo(() => rankLocal(indicators, weights), [indicators, weights]);
  const baseRanks = new Map(baseline.map((row) => [row.province_id, row.rank]));
  const adjustedRanks = new Map(adjusted.map((row) => [row.province_id, row.rank]));
  const weightTotal = Object.values(weights).reduce((sum, value) => sum + value, 0);
  const warning = weightTotal !== 100;
  const invalidWeights = weightTotal === 0;

  if (error) return <><PageHeading eyebrow="Scenario lab / 03" title="วิเคราะห์สถานการณ์ What-if" description="ทดลองปรับน้ำหนักตัวชี้วัดและเปรียบเทียบผลการจัดอันดับแบบทันที" /><ErrorState error={error} /></>;
  if (!baseline.length || !indicators.length) return <LoadingState />;

  return <>
    <PageHeading eyebrow="Scenario lab / 03" title="วิเคราะห์สถานการณ์ What-if" description="ปรับน้ำหนักปัจจัย 5 ด้านเพื่อจำลองมุมมองการลงทุนที่แตกต่าง โดยไม่เปลี่ยนข้อมูลหรือผลจัดอันดับถาวร" action={<button onClick={() => { setWeights(DEFAULT_WEIGHTS); setProfile('balanced'); }} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50"><RotateCcw size={15} />คืนค่าเริ่มต้น</button>} />
    <div className="mb-5 grid gap-3 sm:grid-cols-3">{Object.entries(PROFILES).map(([key, item]) => <button key={key} onClick={() => { setProfile(key); setWeights(item.weights); }} className={`rounded-2xl border p-4 text-left transition ${profile === key ? 'border-brand-500 bg-blue-50 ring-4 ring-blue-100/70' : 'border-slate-200 bg-white hover:border-slate-300'}`}><div className="flex items-center justify-between"><div className="text-sm font-bold text-slate-900">{item.label}</div>{profile === key && <Sparkles size={16} className="text-brand-700" />}</div><div className="mt-2 text-xs text-slate-500">{FACTORS.map((factor) => `${factor} ${item.weights[factor]}`).join(' · ')}</div></button>)}</div>
    <div className="grid gap-5 xl:grid-cols-[minmax(340px,.75fr)_minmax(0,1.25fr)]">
      <section className="panel p-5 sm:p-6"><div className="mb-5 flex items-start gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-blue-50 text-brand-700"><SlidersHorizontal size={19} /></span><div><h2 className="text-base font-bold text-slate-900">กำหนดน้ำหนักปัจจัย</h2><p className="mt-1 text-xs text-slate-500">เลื่อนแถบเพื่อปรับความสำคัญ (0–100)</p></div></div>
        <div className="space-y-5">{FACTORS.map((factor) => <label key={factor} className="block"><div className="mb-2 flex items-center justify-between"><span className="flex items-center gap-2 text-sm font-semibold text-slate-700"><i className="h-2.5 w-2.5 rounded-full" style={{ background: swatches[factor] }} />{factorNames[factor]} <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-500">{factor}</span></span><span className="text-sm font-bold tabular-nums text-slate-900">{weights[factor]}%</span></div><input aria-label={`น้ำหนัก ${factorNames[factor]}`} type="range" min="0" max="100" value={weights[factor]} onChange={(event) => { setWeights((prev) => ({ ...prev, [factor]: Number(event.target.value) })); setProfile('custom'); }} className="weight-slider w-full" style={{ '--range-color': swatches[factor], '--range-progress': `${weights[factor]}%` }} /><div className="mt-1 text-[11px] text-slate-400">{factorHelp[factor]}</div></label>)}</div>
        <div role="status" className={`mt-6 rounded-xl p-4 ${invalidWeights ? 'border border-red-200 bg-red-50' : warning ? 'border border-amber-200 bg-amber-50' : 'border border-emerald-100 bg-emerald-50'}`}><div className={`text-sm font-bold ${invalidWeights ? 'text-red-800' : warning ? 'text-amber-800' : 'text-emerald-800'}`}>ผลรวมน้ำหนัก {weightTotal}%</div><p className={`mt-1 text-xs leading-5 ${invalidWeights ? 'text-red-700' : warning ? 'text-amber-700' : 'text-emerald-700'}`}>{invalidWeights ? 'ต้องมีอย่างน้อยหนึ่งปัจจัยที่มีน้ำหนักมากกว่า 0' : warning ? 'ระบบจะปรับสัดส่วนให้รวมเป็น 100% ก่อนคำนวณคะแนน' : 'น้ำหนักรวมครบ 100% พร้อมคำนวณคะแนน'}</p></div>
      </section>
      <section className="panel overflow-hidden"><div className="border-b border-slate-100 p-5"><div className="text-base font-bold text-slate-900">เปรียบเทียบอันดับ</div><p className="mt-1 text-xs text-slate-500">อันดับเดิมเทียบผลจำลองจากน้ำหนักปัจจุบัน</p></div><div className="overflow-x-auto"><table className="min-w-full text-sm"><thead className="bg-slate-50 text-xs text-slate-500"><tr><th className="px-4 py-3 text-left">พื้นที่</th><th className="px-3 py-3 text-center">เดิม</th><th className="px-3 py-3 text-center">ใหม่</th><th className="px-4 py-3 text-right">คะแนนจำลอง</th><th className="px-4 py-3 text-left">ชั้น</th></tr></thead><tbody>{adjusted.slice(0, 12).map((row) => { const oldRank = baseRanks.get(row.province_id); const diff = oldRank - row.rank; return <tr key={row.province_id} className="border-t border-slate-100 hover:bg-blue-50/40"><td className="px-4 py-3 font-semibold text-slate-800">{row.name_th}</td><td className="px-3 py-3 text-center tabular-nums text-slate-500">{oldRank ?? '—'}</td><td className="px-3 py-3 text-center font-bold tabular-nums text-slate-900">{row.rank}</td><td className="px-4 py-3 text-right tabular-nums text-slate-700">{number(row.score, 2)}</td><td className="px-4 py-3"><div className="flex items-center gap-2"><TierPill tier={row.tier} /><span className={`text-xs font-bold ${diff > 0 ? 'text-emerald-700' : diff < 0 ? 'text-orange-700' : 'text-slate-400'}`}>{diff > 0 ? `▲ ${diff}` : diff < 0 ? `▼ ${Math.abs(diff)}` : '—'}</span></div></td></tr>; })}</tbody></table></div><div className="border-t border-slate-100 px-5 py-3 text-[11px] leading-5 text-slate-400">การจำลองเป็นการคำนวณชั่วคราวบนหน้าเว็บ ไม่บันทึกทับคะแนนพื้นฐานในฐานข้อมูล</div></section>
    </div>
  </>;
}
