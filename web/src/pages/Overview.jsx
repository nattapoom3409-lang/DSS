import { useEffect, useState } from 'react';
import { Activity, Anchor, ArrowUpRight, Boxes, MapPinned, Ship, TrendingUp } from 'lucide-react';
import { api } from '../api.js';
import { ErrorState, LoadingState, PageHeading, StatCard, useNumber } from '../components/UI.jsx';
import { Legend, YearlyChart } from '../components/ChartPanel.jsx';

export default function Overview() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const number = useNumber();
  useEffect(() => { api.overview().then(setData).catch(setError); }, []);
  if (error) return <><PageHeading eyebrow="Dashboard" title="ภาพรวม" description="สถานการณ์ปริมาณการขนส่งสินค้าทางเรือ" /><ErrorState error={error} /></>;
  if (!data) return <LoadingState />;

  const annual = data.annual || [];
  const latest = annual.at(-1);
  const latestMillion = (Number(latest?.total || 0) / 1e6).toFixed(1);
  const growth = Number(data.change_from_first_pct || 0);
  return <>
    <PageHeading eyebrow="Dashboard / 01" title="ภาพรวมการขนส่งทางเรือ" description="สรุปปริมาณสินค้าเข้า–ออกและแนวโน้มภาพรวมของพื้นที่ท่าเรือประเทศไทย" action={<div className="inline-flex items-center gap-2 self-start rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600"><span className="h-2 w-2 rounded-full bg-emerald-500" />อัปเดตข้อมูลล่าสุด · ปี {latest?.year_be}</div>} />
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="ตัวชี้วัดสำคัญ">
      <StatCard label={`ปริมาณรวมปี ${latest?.year_be}`} value={number(latestMillion)} suffix="ล้านตัน" note="รวมขาเข้าและขาออก" icon={Ship} />
      <StatCard label="เปลี่ยนแปลงจากปีแรก" value={`${growth >= 0 ? '+' : ''}${number(growth)}%`} suffix="2565 → 2568" note="เทียบปริมาณรวมทั้งปี" trend={growth < 0 ? 'down' : 'up'} icon={TrendingUp} />
      <StatCard label="สัดส่วนชลบุรี + ระยอง" value={number(data.chonburi_rayong_share)} suffix="% ของทั้งประเทศ" note="คำนวณจากข้อมูลปีล่าสุด" icon={MapPinned} />
      <StatCard label="ช่วงเวลาวิเคราะห์" value="4 ปี" suffix="2565–2568" note="ข้อมูลกรมเจ้าท่า" icon={Activity} />
    </section>

    <section className="mt-6 grid gap-5 xl:grid-cols-[minmax(0,1.55fr)_minmax(280px,.75fr)]">
      <article className="panel p-5 sm:p-6">
        <div className="mb-3 flex flex-col justify-between gap-3 sm:flex-row sm:items-start"><div><h2 className="text-base font-bold text-slate-900">ปริมาณสินค้ารายปี</h2><p className="mt-1 text-xs text-slate-500">เปรียบเทียบปริมาณขาเข้าและขาออก (ตัน)</p></div><Legend items={[{ label: 'ขาเข้า', color: '#2a78d6' }, { label: 'ขาออก', color: '#eb6834' }]} /></div>
        {annual.length ? <YearlyChart data={annual} /> : <div className="grid h-[310px] place-items-center text-sm text-slate-500">ไม่พบข้อมูลรายปี</div>}
        <div className="mt-1 border-t border-slate-100 pt-4 text-xs leading-5 text-slate-400">คำนวณจากชุดข้อมูลพื้นที่ทั้งหมดในฐานข้อมูล ปริมาณที่แสดงสอดคล้องกับหน่วยที่ระบุใน DSS_PORT_SPEC.md</div>
      </article>
      <article className="panel flex flex-col p-5 sm:p-6">
        <div className="flex items-start justify-between"><div><h2 className="text-base font-bold text-slate-900">ปริมาณปีล่าสุด</h2><p className="mt-1 text-xs text-slate-500">แยกตามทิศทางการขนส่ง</p></div><span className="grid h-10 w-10 place-items-center rounded-xl bg-orange-50 text-orange-600"><Boxes size={19} /></span></div>
        <div className="mt-7 space-y-6">
          <div><div className="mb-2 flex items-center justify-between text-xs"><span className="flex items-center gap-2 text-slate-500"><i className="h-2.5 w-2.5 rounded-sm bg-brand-500" />ขาเข้า</span><b className="font-semibold text-slate-800">{number(Number(latest?.arrival || 0) / 1e6)} ล้านตัน</b></div><div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-brand-500" style={{ width: `${latest?.total ? latest.arrival / latest.total * 100 : 0}%` }} /></div></div>
          <div><div className="mb-2 flex items-center justify-between text-xs"><span className="flex items-center gap-2 text-slate-500"><i className="h-2.5 w-2.5 rounded-sm bg-accent" />ขาออก</span><b className="font-semibold text-slate-800">{number(Number(latest?.departure || 0) / 1e6)} ล้านตัน</b></div><div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-accent" style={{ width: `${latest?.total ? latest.departure / latest.total * 100 : 0}%` }} /></div></div>
        </div>
        <div className="mt-auto pt-8"><div className="rounded-xl bg-slate-50 p-4"><div className="flex items-center gap-2 text-xs font-semibold text-slate-600"><Anchor size={15} className="text-brand-700" />สัดส่วนขาเข้า</div><div className="mt-2 text-2xl font-bold tabular-nums text-slate-900">{number(latest?.total ? latest.arrival / latest.total * 100 : 0)}<span className="ml-1 text-sm font-medium text-slate-500">%</span></div><div className="mt-1 text-[11px] text-slate-400">ของปริมาณขนส่งปี {latest?.year_be}</div></div></div>
      </article>
    </section>

    <section className="mt-6 grid gap-4 sm:grid-cols-2">
      {annual.slice(-2).map((row, index) => <article key={row.year_ad} className="panel flex items-center justify-between p-5"><div><div className="text-xs text-slate-500">สรุปปี {row.year_be} · {index === 1 ? 'ล่าสุด' : 'ก่อนหน้า'}</div><div className="mt-2 text-xl font-bold text-slate-900">{number(Number(row.total) / 1e6)} <span className="text-sm font-medium text-slate-500">ล้านตัน</span></div><div className="mt-1 text-xs text-slate-400">เข้า {number(Number(row.arrival) / 1e6)} · ออก {number(Number(row.departure) / 1e6)} ล้านตัน</div></div><span className="grid h-11 w-11 place-items-center rounded-2xl bg-blue-50 text-brand-700"><ArrowUpRight size={20} /></span></article>)}
    </section>
  </>;
}
