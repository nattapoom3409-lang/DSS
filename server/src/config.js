export const YEARS = [2022, 2023, 2024, 2025];
export const EXCLUDED_AREAS = ['Exclusive Economic Zone'];
export const DEFAULT_WEIGHTS = { V: 40, G: 25, D: 15, B: 10, S: 10 };
export const WEIGHT_PROFILES = {
  balanced: { V: 40, G: 25, D: 15, B: 10, S: 10 },
  capacity: { V: 50, G: 20, D: 10, B: 10, S: 10 },
  stability: { V: 20, G: 15, D: 10, B: 15, S: 40 },
};
export const DEFAULT_THRESHOLDS = { high: 65, mid: 50, volumeMt: 5 };
export const TABLES = {
  shipping_original: { label: 'ข้อมูลต้นฉบับ', defaultSort: 'id' },
  province: { label: 'จังหวัด/พื้นที่', defaultSort: 'province_id' },
  goods_category: { label: 'หมวดสินค้า', defaultSort: 'goods_category_id' },
  trade_record: { label: 'บันทึกการค้า', defaultSort: 'record_id' },
  priority_score: { label: 'คะแนนความสำคัญ', defaultSort: 'score_id' },
};
export const DATABASE_URL = process.env.DATABASE_URL
  || `postgres://${encodeURIComponent(process.env.PGUSER || 'dss')}:${encodeURIComponent(process.env.PGPASSWORD || '')}@${process.env.PGHOST || 'localhost'}:${process.env.PGPORT || '5432'}/${process.env.PGDATABASE || 'dss_port'}`;
