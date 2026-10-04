import { useEffect, useMemo, useState } from 'react';
import { Activity, ArrowDown, ArrowUp, ArrowUpDown, Layers3 } from 'lucide-react';
import { api } from '../api.js';
import { ErrorState, LoadingState, PageHeading, TierPill, useNumber } from '../components/UI.jsx';

const keys = ['V', 'G', 'D', 'B', 'S'];
const labels = { V: 'ปริมาณ', G: 'เติบโต', D: 'หลากหลาย', B: 'สมดุล', S: 'เสถียร' };
const indicatorRamp = ['#cde2fb', '#9ec5f4', '#6da7ec', '#3987e5', '#2a78d6', '#1c5cab', '#104281', '#0d366b'];
const columns = [
  { key: 'rank', label: 'อันดับ', numeric: true, className: 'text-left' },
  { key: 'name_th', label: 'พื้นที่', numeric: false, className: 'text-left' },
  ...keys.map((key) => ({ key, label: `${key} ${labels[key]}`, numeric: true, className: 'text-center' })),
  { key: 'score', label: 'คะแนนรวม', numeric: true, className: 'text-right' },
  { key: 'tier', label: 'ชั้น', numeric: true, className: 'text-left' },
];

function heat(value) {
  const score = Math.max(0, Math.min(100, Number(value || 0)));
  const index = Math.min(indicatorRamp.length - 1, Math.floor(score / 100 * indicatorRamp.length));
  const hex = indicatorRamp[index].slice(1);
  const red = Number.parseInt(hex.slice(0, 2), 16);
  const green = Number.parseInt(hex.slice(2, 4), 16);
  const blue = Number.parseInt(hex.slice(4, 6), 16);
  return { backgroundColor: `rgba(${red}, ${green}, ${blue}, 0.5)`, color: index >= 5 ? '#104281' : '#174f95' };
}

function SortButton({ column, sortKey, sortDirection, onSort }) {
  const active = sortKey === column.key;
  const Icon = !active ? ArrowUpDown : sortDirection === 'desc' ? ArrowDown : ArrowUp;
  return <button
    type="button"
    onClick={() => onSort(column.key)}
    aria-label={`เรียงตาม${column.label}${active ? sortDirection === 'desc' ? ' จากมากไปน้อย' : ' จากน้อยไปมาก' : ''}`}
    aria-sort={active ? sortDirection === 'desc' ? 'descending' : 'ascending' : 'none'}
    className={`inline-flex items-center gap-1.5 rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 ${column.className === 'text-right' ? 'justify-end' : column.className === 'text-center' ? 'justify-center' : 'justify-start'} hover:text-brand-700`}
  >
    {column.key === 'name_th' ? column.label : column.key === 'rank' ? column.label : column.key === 'tier' ? column.label : column.key === 'score' ? column.label : <>{column.key}<span className="block font-normal text-[10px]">{labels[column.key]}</span></>}
    <Icon size={13} aria-hidden="true" className={active ? 'text-brand-700' : 'text-slate-300'} />
  </button>;
}

export default function Indicators() {
  const [rows, setRows] = useState(null);
  const [error, setError] = useState(null);
  const [sortKey, setSortKey] = useState('score');
  const [sortDirection, setSortDirection] = useState('desc');
  const number = useNumber();
  useEffect(() => { api.indicators().then(setRows).catch(setError); }, []);

  const sortedRows = useMemo(() => {
    if (!rows) return [];
    const multiplier = sortDirection === 'asc' ? 1 : -1;
    return [...rows].sort((a, b) => {
      const left = a[sortKey];
      const right = b[sortKey];
      if (typeof left === 'number' && typeof right === 'number') return (left - right) * multiplier;
      return String(left ?? '').localeCompare(String(right ?? ''), 'th') * multiplier;
    });
  }, [rows, sortKey, sortDirection]);

  const handleSort = (key) => {
    if (sortKey === key) setSortDirection((current) => current === 'desc' ? 'asc' : 'desc');
    else {
      setSortKey(key);
      setSortDirection(key === 'name_th' ? 'asc' : 'desc');
    }
  };

  if (error) return <><PageHeading eyebrow="Scoring model / 04" title="คะแนนตัวชี้วัด" description="เปรียบเทียบคะแนน 5 ปัจจัยที่ใช้จัดอันดับพื้นที่" /><ErrorState error={error} /></>;
  if (!rows) return <LoadingState />;
  return <>
    <PageHeading eyebrow="Scoring model / 04" title="คะแนนตัวชี้วัด" description="คะแนนดิบถูกปรับด้วย min–max เป็นสเกล 0–100 ในกลุ่มพื้นที่ที่ครบเงื่อนไขจัดอันดับ" action={<div className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-500"><Activity size={15} className="text-brand-700" />{rows.length} พื้นที่</div>} />
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">{keys.map((key) => <article key={key} className="panel p-4"><div className="flex items-center justify-between"><span className="grid h-9 w-9 place-items-center rounded-lg bg-blue-50 text-sm font-bold text-brand-700">{key}</span><span className="text-xs text-slate-400">0—100</span></div><div className="mt-3 text-sm font-bold text-slate-800">{labels[key]}</div><div className="mt-1 text-xs leading-5 text-slate-500">{key === 'V' ? 'ปริมาณเฉลี่ยต่อปี' : key === 'G' ? 'อัตราเติบโตเฉลี่ย' : key === 'D' ? 'ความหลากหลายสินค้า' : key === 'B' ? 'สมดุลขาเข้า–ออก' : 'เสถียรภาพปริมาณรายปี'}</div></article>)}</div>
    <section className="panel mt-5 overflow-hidden"><div className="flex flex-col justify-between gap-2 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center"><div><h2 className="flex items-center gap-2 text-base font-bold text-slate-900"><Layers3 size={17} className="text-brand-700" />ตารางคะแนนแยกตามตัวชี้วัด</h2><p className="mt-1 text-xs text-slate-500">กดหัวคอลัมน์เพื่อเรียงลำดับ · ค่าเริ่มต้นคะแนนรวมมากไปน้อย</p></div><div className="flex items-center gap-2 text-[11px] text-slate-400"><span>ต่ำ</span><span className="h-2.5 w-24 rounded-full bg-gradient-to-r from-blue-50 via-blue-300 to-blue-800" /><span>สูง</span></div></div><div className="overflow-x-auto"><table className="min-w-[760px] w-full text-sm"><thead className="bg-slate-50 text-xs text-slate-500"><tr>{columns.map((column) => <th key={column.key} scope="col" className={`px-3 py-3 ${column.className}`}><SortButton column={column} sortKey={sortKey} sortDirection={sortDirection} onSort={handleSort} /></th>)}</tr></thead><tbody>{sortedRows.map((row, index) => <tr key={row.province_id} className="border-t border-slate-100 hover:bg-slate-50/80"><td className="px-5 py-3 font-bold tabular-nums text-slate-400">{String(index + 1).padStart(2, '0')}</td><td className="px-5 py-3"><div className="font-semibold text-slate-800">{row.name_th}</div><div className="text-[11px] text-slate-400">{row.name_en}</div></td>{keys.map((key) => <td key={key} className="px-3 py-3 text-center"><span title={`${labels[key]} ${number(row[key], 2)} คะแนน`} className="inline-flex min-w-12 justify-center rounded-lg px-2.5 py-1.5 font-semibold tabular-nums" style={heat(row[key])}>{number(row[key], 1)}</span></td>)}<td className="px-4 py-3 text-right font-bold tabular-nums text-slate-800">{number(row.score, 2)}</td><td className="px-5 py-3"><TierPill tier={row.tier} /></td></tr>)}</tbody></table></div><div className="border-t border-slate-100 px-5 py-3 text-[11px] leading-5 text-slate-400">V ปริมาณ · G การเติบโต · D ความหลากหลาย · B สมดุล · S เสถียรภาพ</div></section>
  </>;
}
