import { lazy, Suspense, useState } from 'react';
import { Menu, Bell, CircleHelp, ChevronDown } from 'lucide-react';
import { Route, Routes, useLocation } from 'react-router-dom';
import Sidebar from './components/Sidebar.jsx';

const Overview = lazy(() => import('./pages/Overview.jsx'));
const Ranking = lazy(() => import('./pages/Ranking.jsx'));
const WhatIf = lazy(() => import('./pages/WhatIf.jsx'));
const Indicators = lazy(() => import('./pages/Indicators.jsx'));
const DataTables = lazy(() => import('./pages/DataTables.jsx'));

const titles = { '/': 'ภาพรวม', '/ranking': 'จัดอันดับพื้นที่', '/whatif': 'วิเคราะห์สถานการณ์ What-if', '/indicators': 'คะแนนตัวชี้วัด', '/tables': 'สำรวจตารางข้อมูล' };

export default function App() {
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();
  return <div className="min-h-screen bg-[#f7f8fa]">
    <Sidebar open={menuOpen} onClose={() => setMenuOpen(false)} />
    <div className="min-h-screen lg:pl-[268px]">
      <header className="sticky top-0 z-30 flex h-[72px] items-center justify-between border-b border-slate-200/80 bg-white/90 px-4 backdrop-blur sm:px-7 lg:px-9">
        <div className="flex items-center gap-3"><button onClick={() => setMenuOpen(true)} aria-label="เปิดเมนู" className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden"><Menu size={20} /></button><div><div className="text-[11px] font-medium text-slate-400">ระบบสนับสนุนการตัดสินใจ <span className="mx-1.5">/</span> <span className="text-slate-600">{titles[location.pathname] || 'DSS ท่าเรือ'}</span></div><div className="mt-1 text-sm font-bold text-slate-900">การลงทุนโครงสร้างพื้นฐานท่าเรือ</div></div></div>
        <div className="flex items-center gap-2 sm:gap-3"><span className="hidden rounded-full bg-emerald-50 px-3 py-1.5 text-[11px] font-semibold text-emerald-700 sm:inline-flex">ข้อมูล 2565–2568</span><button aria-label="ช่วยเหลือ" className="rounded-full p-2 text-slate-400 hover:bg-slate-100"><CircleHelp size={18} /></button><button aria-label="การแจ้งเตือน" className="relative rounded-full p-2 text-slate-400 hover:bg-slate-100"><Bell size={18} /><i className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-orange-500" /></button><button className="hidden items-center gap-2 border-l border-slate-200 pl-3 sm:flex"><span className="grid h-8 w-8 place-items-center rounded-full bg-blue-100 text-xs font-bold text-brand-700">D</span><span className="text-xs font-semibold text-slate-700">ผู้ดูแลระบบ</span><ChevronDown size={14} className="text-slate-400" /></button></div>
      </header>
      <main className="mx-auto max-w-[1440px] p-4 sm:p-7 lg:p-9">
        <Suspense fallback={<div className="panel grid min-h-64 place-items-center text-sm text-slate-500">กำลังเปิดหน้า…</div>}>
          <Routes>
            <Route path="/" element={<Overview />} />
            <Route path="/ranking" element={<Ranking />} />
            <Route path="/whatif" element={<WhatIf />} />
            <Route path="/indicators" element={<Indicators />} />
            <Route path="/tables" element={<DataTables />} />
            <Route path="*" element={<Overview />} />
          </Routes>
        </Suspense>
        <footer className="mt-10 flex flex-col justify-between gap-2 border-t border-slate-200 py-5 text-[11px] text-slate-400 sm:flex-row"><span>ข้อมูลอ้างอิง: กรมเจ้าท่า กระทรวงคมนาคม · dataset_21_01_03</span><span>DSS PORT · ระบบสนับสนุนการตัดสินใจ</span></footer>
      </main>
    </div>
  </div>;
}
