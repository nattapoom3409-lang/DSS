import { useEffect, useMemo, useState } from 'react';
import { Database, Table2 } from 'lucide-react';
import { api } from '../api.js';
import { DataTable } from '../components/DataTable.jsx';
import { ErrorState, LoadingState, PageHeading } from '../components/UI.jsx';

const FILTER_OPTIONS = {
  shipping_original: ['year_ce', 'flow_en', 'province_en', 'category_en'],
  trade_record: ['year_ad', 'processing_indicator'],
  priority_score: ['year_ad', 'tier'],
};
const useDebounced = (value, delay = 300) => {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => { const timer = setTimeout(() => setDebounced(value), delay); return () => clearTimeout(timer); }, [value, delay]);
  return debounced;
};

export default function DataTables() {
  const [tables, setTables] = useState([]);
  const [active, setActive] = useState('shipping_original');
  const [data, setData] = useState(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [sort, setSort] = useState('id');
  const [order, setOrder] = useState('asc');
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState({});
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const debouncedQuery = useDebounced(query);

  useEffect(() => { api.tables().then(setTables).catch(setError); }, []);
  const queryString = useMemo(() => {
    const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize), order });
    if (sort) params.set('sort', sort);
    if (debouncedQuery) params.set('q', debouncedQuery);
    Object.entries(filters).forEach(([key, value]) => { if (value) params.set(`f.${key}`, value); });
    return params.toString();
  }, [page, pageSize, order, sort, debouncedQuery, filters]);
  useEffect(() => {
    let current = true;
    setError(null);
    setLoading(true);
    setData(null);
    api.table(active, queryString)
      .then((result) => { if (current) setData(result); })
      .catch((requestError) => { if (current) setError(requestError); })
      .finally(() => { if (current) setLoading(false); });
    return () => { current = false; };
  }, [active, queryString]);

  const onQuery = (value) => { setQuery(value); setPage(1); };
  const onSort = (column) => { setOrder(sort === column ? (order === 'asc' ? 'desc' : 'asc') : 'asc'); setSort(column); setPage(1); };
  const setFilter = (column, value) => { setFilters((current) => ({ ...current, [column]: value })); setPage(1); };
  const switchTable = (name) => { setActive(name); setPage(1); setSort(undefined); setOrder('asc'); setQuery(''); setFilters({}); };
  const exportParams = new URLSearchParams(queryString); exportParams.delete('page'); exportParams.delete('pageSize');
  const exportUrl = api.url(`/tables/${encodeURIComponent(active)}/export.csv?${exportParams}`);

  return <>
    <PageHeading eyebrow="Data explorer / 05" title="สำรวจตารางข้อมูล" description="ค้นหา กรอง เรียงลำดับ และดาวน์โหลดข้อมูลที่ระบบใช้ในการวิเคราะห์" action={<div className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-500"><Database size={15} className="text-brand-700" />ฐานข้อมูล PostgreSQL</div>} />
    {error && !data ? <ErrorState error={error} /> : null}
    <div className="mb-4 flex gap-2 overflow-x-auto pb-1">{tables.map((table) => <button key={table.name} onClick={() => switchTable(table.name)} className={`shrink-0 rounded-xl border px-4 py-3 text-left transition ${active === table.name ? 'border-brand-600 bg-brand-700 text-white shadow-sm' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}><span className="flex items-center gap-2 text-sm font-semibold"><Table2 size={15} />{table.label}</span><span className={`mt-1 block text-[10px] ${active === table.name ? 'text-blue-100' : 'text-slate-400'}`}>{table.name} · {Number(table.rowCount).toLocaleString('th-TH')} แถว</span></button>)}</div>
    {!tables.length && !error ? <LoadingState /> : null}
    {data && <DataTable columns={data.columns} rows={data.rows} sort={sort} order={order} onSort={onSort} loading={loading} page={page} pageSize={pageSize} total={data.total} onPage={setPage} onPageSize={(value) => { setPageSize(value); setPage(1); }} query={query} onQuery={onQuery} exportUrl={exportUrl}>
      {(FILTER_OPTIONS[active] || []).map((column) => <label key={column} className="flex items-center gap-1.5 text-[10px] font-medium text-slate-500">{column}<input aria-label={`กรอง ${column}`} value={filters[column] || ''} onChange={(event) => setFilter(column, event.target.value)} className="w-28 rounded-xl border border-slate-200 px-2.5 py-2.5 text-xs outline-none focus:border-brand-500 focus:ring-2 focus:ring-blue-100" placeholder="ทั้งหมด" /></label>)}
    </DataTable>}
    {error && data && <div className="mt-3"><ErrorState error={error} /></div>}
  </>;
}
