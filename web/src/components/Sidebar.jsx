import { NavLink } from 'react-router-dom';
import { Anchor, BarChart3, ChevronRight, Database, Gauge, Layers3, Ship, SlidersHorizontal } from 'lucide-react';

const links = [
  { to: '/', label: 'ภาพรวม', icon: Gauge },
  { to: '/ranking', label: 'จัดอันดับ', icon: BarChart3 },
  { to: '/whatif', label: 'What-if', icon: SlidersHorizontal },
  { to: '/indicators', label: 'คะแนนตัวชี้วัด', icon: Layers3 },
  { to: '/tables', label: 'ตารางข้อมูล', icon: Database },
];

export default function Sidebar({ open, onClose }) {
  return <>
    {open && <button aria-label="ปิดเมนู" onClick={onClose} className="fixed inset-0 z-40 bg-slate-950/40 lg:hidden" />}
    <aside className={`fixed inset-y-0 left-0 z-50 flex w-[268px] flex-col bg-navy-950 text-white transition-transform lg:translate-x-0 ${open ? 'translate-x-0' : '-translate-x-full'}`}>
      <div className="flex h-20 items-center gap-3 border-b border-white/10 px-6">
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-brand-500"><Ship size={22} /></div>
        <div><div className="text-sm font-bold tracking-wide">PORT INTELLIGENCE</div><div className="mt-0.5 text-[11px] text-blue-200/70">DSS ท่าเรือ · 2565–2568</div></div>
      </div>
      <div className="px-5 pb-2 pt-7 text-[10px] font-bold uppercase tracking-[.2em] text-blue-200/50">เมนูหลัก</div>
      <nav className="space-y-1 px-3" aria-label="เมนูหลัก">
        {links.map(({ to, label, icon: Icon }) => <NavLink key={to} to={to} end={to === '/'} onClick={onClose} className={({ isActive }) => `group flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition ${isActive ? 'bg-white/10 text-white shadow-inner' : 'text-blue-100/70 hover:bg-white/5 hover:text-white'}`}>
          {({ isActive }) => <><Icon size={18} className={isActive ? 'text-sky-300' : 'text-blue-200/60'} /><span className="flex-1">{label}</span>{isActive && <ChevronRight size={15} className="text-sky-300" />}</>}
        </NavLink>)}
      </nav>
      <div className="mt-auto p-4">
        <div className="rounded-2xl border border-white/10 bg-white/[.04] p-4">
          <div className="flex items-center gap-2 text-xs font-semibold text-white"><Anchor size={15} className="text-sky-300" />ข้อมูลจากกรมเจ้าท่า</div>
          <p className="mt-2 text-[11px] leading-5 text-blue-100/55">ระบบสนับสนุนการจัดลำดับความสำคัญการลงทุนท่าเรือ</p>
          <div className="mt-3 border-t border-white/10 pt-3 text-[10px] text-blue-100/40">DATASET · 21_01_03</div>
        </div>
      </div>
    </aside>
  </>;
}
