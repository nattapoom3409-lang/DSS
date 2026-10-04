import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

const ink = '#52514e';
const grid = '#e1e0d9';
const blue = '#2a78d6';
const orange = '#eb6834';
const sequential = ['#cde2fb', '#9ec5f4', '#6da7ec', '#3987e5', '#2a78d6', '#1c5cab', '#104281', '#0d366b'];
const nf = new Intl.NumberFormat('th-TH', { maximumFractionDigits: 1 });

function sequentialBlue(value) {
  const index = Math.max(0, Math.min(sequential.length - 1, Math.floor(Number(value || 0) / 100 * sequential.length)));
  return sequential[index];
}

function TooltipCard({ active, payload, label, unit = '' }) {
  if (!active || !payload?.length) return null;
  return <div className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 shadow-lg">
    <div className="mb-1.5 text-xs font-semibold text-slate-800">{label}</div>
    {payload.map((item) => <div key={item.dataKey} className="flex items-center justify-between gap-5 py-0.5 text-xs text-slate-600"><span className="flex items-center gap-2"><i className="h-2 w-2 rounded-sm" style={{ background: item.color }} />{item.name}</span><b className="tabular-nums text-slate-900">{nf.format(item.value)}{unit}</b></div>)}
  </div>;
}

export function YearlyChart({ data }) {
  const chartData = data.map((row) => ({ ...row, label: String(row.year_be) }));
  return <div className="h-[310px] w-full" role="img" aria-label="กราฟปริมาณสินค้าขาเข้าและขาออก จำแนกตามปี">
    <ResponsiveContainer width="100%" height="100%"><BarChart data={chartData} margin={{ top: 12, right: 8, bottom: 2, left: 4 }} barCategoryGap="34%">
      <CartesianGrid vertical={false} stroke={grid} strokeDasharray="3 5" />
      <XAxis dataKey="label" tick={{ fill: ink, fontSize: 12 }} axisLine={{ stroke: '#c3c2b7' }} tickLine={false} />
      <YAxis tickFormatter={(value) => `${Math.round(value / 1e6)}M`} tick={{ fill: ink, fontSize: 11 }} axisLine={false} tickLine={false} width={44} />
      <Tooltip content={<TooltipCard unit=" ตัน" />} cursor={{ fill: '#f4f7fb' }} />
      <Bar dataKey="arrival" name="ขาเข้า" fill={blue} radius={[4, 4, 0, 0]} maxBarSize={34} />
      <Bar dataKey="departure" name="ขาออก" fill={orange} radius={[4, 4, 0, 0]} maxBarSize={34} />
    </BarChart></ResponsiveContainer>
  </div>;
}

export function RankingChart({ data }) {
  const chartData = [...data].slice(0, 12).reverse().map((row) => ({ ...row, label: row.name_th }));
  return <div className="h-[440px] w-full" role="img" aria-label="กราฟแท่งคะแนนจัดอันดับพื้นที่ 12 อันดับแรก">
    <ResponsiveContainer width="100%" height="100%"><BarChart data={chartData} layout="vertical" margin={{ top: 8, right: 32, left: 4, bottom: 4 }}>
      <CartesianGrid horizontal={false} stroke={grid} strokeDasharray="3 5" />
      <XAxis type="number" domain={[0, 100]} tick={{ fill: ink, fontSize: 11 }} axisLine={{ stroke: '#c3c2b7' }} tickLine={false} />
      <YAxis type="category" dataKey="label" width={100} tick={{ fill: ink, fontSize: 12 }} axisLine={false} tickLine={false} />
      <Tooltip content={<TooltipCard unit=" คะแนน" />} cursor={{ fill: '#f4f7fb' }} />
      <Bar dataKey="score" name="คะแนนรวม" radius={[0, 4, 4, 0]} maxBarSize={22}>
        {chartData.map((row) => <Cell key={row.province_id} fill={sequentialBlue(row.score)} />)}
      </Bar>
    </BarChart></ResponsiveContainer>
  </div>;
}

export function Legend({ items }) {
  return <div className="flex flex-wrap gap-x-5 gap-y-2" aria-label="คำอธิบายสี">
    {items.map((item) => <div key={item.label} className="flex items-center gap-2 text-xs text-slate-600"><span className="h-2.5 w-2.5 rounded-sm" style={{ background: item.color }} />{item.label}</div>)}
  </div>;
}
