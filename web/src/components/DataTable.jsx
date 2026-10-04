import { ChevronLeft, ChevronRight, ChevronsUpDown, Download, Search } from 'lucide-react';

export function DataTable({ columns, rows, sort, order, onSort, loading, page, pageSize, total, onPage, onPageSize, query, onQuery, exportUrl, children }) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  return <div className="panel overflow-hidden">
    <div className="flex flex-col gap-3 border-b border-slate-100 p-4 md:flex-row md:items-center">
      <label className="relative block flex-1 md:max-w-sm"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} /><span className="sr-only">ค้นหาข้อมูล</span><input value={query} onChange={(event) => onQuery(event.target.value)} placeholder="ค้นหาจากทุกคอลัมน์…" className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-brand-500 focus:bg-white focus:ring-4 focus:ring-blue-100" /></label>
      {children}
      <select value={pageSize} onChange={(event) => onPageSize(Number(event.target.value))} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-600 outline-none"><option value={25}>25 แถว/หน้า</option><option value={50}>50 แถว/หน้า</option><option value={100}>100 แถว/หน้า</option></select>
      <a href={exportUrl} className="inline-flex items-center justify-center gap-2 rounded-xl bg-navy-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-800"><Download size={15} />ส่งออก CSV</a>
    </div>
    <div className="overflow-x-auto">
      <table className="min-w-full border-collapse text-left text-sm">
        <thead className="sticky top-0 z-10 bg-slate-50"><tr>{columns.map((column) => <th key={column.column_name} scope="col" className="whitespace-nowrap border-b border-slate-200 px-4 py-3 font-semibold text-slate-600"><button onClick={() => onSort(column.column_name)} className="inline-flex items-center gap-1.5 hover:text-brand-700">{column.column_name}{sort === column.column_name ? <span aria-label={order === 'asc' ? 'เรียงจากน้อยไปมาก' : 'เรียงจากมากไปน้อย'}>{order === 'asc' ? '↑' : '↓'}</span> : <ChevronsUpDown size={13} className="text-slate-300" />}</button></th>)}</tr></thead>
        <tbody className={loading ? 'opacity-50' : ''}>
          {rows.map((row, index) => <tr key={index} className="border-b border-slate-100 last:border-0 hover:bg-blue-50/50">{columns.map((column) => { const value = row[column.column_name]; const numeric = ['integer', 'smallint', 'numeric', 'bigint', 'double precision'].includes(column.data_type); return <td key={column.column_name} className={`whitespace-nowrap px-4 py-3 text-slate-700 ${numeric ? 'text-right tabular-nums' : ''}`}>{value == null ? '—' : typeof value === 'number' && column.data_type === 'numeric' ? value.toLocaleString('th-TH', { maximumFractionDigits: 2 }) : String(value)}</td>; })}</tr>)}
          {!loading && rows.length === 0 && <tr><td colSpan={Math.max(columns.length, 1)} className="px-4 py-12 text-center text-slate-500">ไม่พบข้อมูลที่ตรงกับการค้นหา</td></tr>}
          {loading && rows.length === 0 && <tr><td colSpan={Math.max(columns.length, 1)} className="px-4 py-12 text-center text-slate-500">กำลังโหลด…</td></tr>}
        </tbody>
      </table>
    </div>
    <div className="flex flex-col gap-3 border-t border-slate-100 px-4 py-3 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
      <span>ทั้งหมด {total.toLocaleString('th-TH')} รายการ · หน้า {page.toLocaleString('th-TH')} / {pages.toLocaleString('th-TH')}</span>
      <div className="flex items-center gap-2"><button aria-label="หน้าก่อน" disabled={page <= 1} onClick={() => onPage(page - 1)} className="rounded-lg border border-slate-200 p-2 hover:bg-slate-50 disabled:opacity-40"><ChevronLeft size={16} /></button><button aria-label="หน้าถัดไป" disabled={page >= pages} onClick={() => onPage(page + 1)} className="rounded-lg border border-slate-200 p-2 hover:bg-slate-50 disabled:opacity-40"><ChevronRight size={16} /></button></div>
    </div>
  </div>;
}
