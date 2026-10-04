# DSS ท่าเรือ — ระบบสนับสนุนการตัดสินใจจัดลำดับความสำคัญการลงทุนท่าเรือ

> Decision Support System for Prioritizing Port Investments Based on Import and Export Cargo Volume
> ข้อมูล: กรมเจ้าท่า กระทรวงคมนาคม ปี 2565–2568 (datagov.mot.go.th, dataset_21_01_03)

เอกสารนี้เป็นสเปกสำหรับสร้างระบบจริงจากสไลด์ `DSS__4_.pdf` และไฟล์ `shipping_original.sql`
Stack: **React (Vite, JavaScript) + Tailwind CSS + Node.js (Express) + PostgreSQL (Docker)**

---

## 1. สิ่งที่ตรวจพบจากไฟล์ SQL (อ่านก่อนเริ่มเขียนโค้ด)

| หัวข้อ | ข้อมูล |
|---|---|
| ตารางต้นฉบับ | `shipping_original` ตารางเดียว (flat) จำนวน **956 แถว** |
| ปี | พ.ศ. 2565–2568 (`year_be`) / ค.ศ. 2022–2025 (`year_ce`) |
| พื้นที่ | 23 ค่า (จังหวัด + "เขตเศรษฐกิจจำเพาะ") |
| ทิศทาง | `ขาเข้า` / `ขาออก` (Arrival / Departure) |
| สินค้าเดิม | 23 รายการ → จัดเป็น 7 หมวดใหม่ |
| Index เดิม | `year_ce`, `province_en`, `category_en` |
| ไวยากรณ์ SQL | ใช้กับ PostgreSQL ได้ทันที (`DROP TABLE IF EXISTS`, `CREATE TABLE`, `INSERT`) |

### 1.1 ประเด็นที่ต้องตัดสินใจ / ระวัง

1. **หน่วยของ `weight_kg` น่าจะเป็น "ตัน" ไม่ใช่ กก.**
   ผลรวมดิบของปี 2565 ขาเข้า = 206,100,000 ตรงกับสไลด์ที่แสดง **206.1 ล้านตัน** (ขาออก 164.0, ปี 2568 รวม 340.6)
   ถ้าเป็น กก. จริง ผลรวมจะเหลือเพียง 206,100 ตัน ซึ่งไม่สมเหตุสมผลกับท่าเรือแหลมฉบัง
   แนะนำ: เก็บชื่อคอลัมน์เดิมใน `shipping_original` แต่ในตารางใหม่ตั้งชื่อ `total_weight_ton` และใส่คอมเมนต์ไว้ชัดเจน
   ทั้งนี้ควรยืนยันกับเอกสารต้นทางของกรมเจ้าท่าอีกครั้ง
2. **"เขตเศรษฐกิจจำเพาะ" ไม่ใช่จังหวัดหรือท่าเรือ** ต้องตัดออกจากการจัดอันดับ (แต่ยังแสดงในหน้าตารางข้อมูล)
3. **พื้นที่ที่ข้อมูลไม่ครบ 4 ปี**: ปัตตานี (มีเฉพาะ 2565, 2568), พังงา (2565–2566), พระนครศรีอยุธยา (2566), สมุทรสงคราม (2566)
   ถ้าตัดเขตเศรษฐกิจจำเพาะและพื้นที่เหล่านี้ออก จะเหลือ **18 พื้นที่** ตรงกับสไลด์ ("12 อันดับแรกจาก 18")
   ทำเป็น config `EXCLUDED_AREAS` และเงื่อนไข `min_years = 4`
4. **สัดส่วนชลบุรี+ระยอง**: สไลด์ใช้ 84.7% ส่วนข้อมูลปี 2568 ทุกพื้นที่คำนวณได้ราว 85.1% ให้ระบุให้ชัดว่า 84.7% คำนวณจากชุดใด (เช่น 18 พื้นที่ หรือรวม 4 ปี) แล้วให้ระบบคำนวณเองแทนการ hardcode
5. **ชั้นความสำคัญ**: ตารางกฎ (สไลด์ 11) มี 4 ชั้น แต่ชั้น 2 และ 3 มีความหมายเดียวกัน ("พัฒนาเฉพาะทาง") และหน้า Prototype แสดงเพียง 3 กลุ่ม
   (เช่น สงขลา 61.7 คะแนน อยู่ "ชั้น 2" ทั้งที่ตามกฎจะเป็นชั้น 3)
   แนะนำ: ระบบเก็บ `tier` 1–4 ตามตารางกฎ แล้วในหน้าจอแสดงชั้น 2 และ 3 รวมกันเป็น "พัฒนาเฉพาะทาง" หรือแก้สไลด์ให้ตรงกัน
6. ค่า `pg` ชนิด `NUMERIC` จะถูกส่งกลับเป็น string ใน node-postgres ต้องแปลงด้วย `Number()` หรือ `parseFloat`

---

## 2. โครงสร้างโปรเจกต์

```
dss-port/
├── docker-compose.yml
├── .env
├── db/
│   └── init/
│       ├── 01_shipping_original.sql     # ไฟล์ที่มีอยู่แล้ว (ไม่ต้องแก้)
│       └── 02_normalize.sql             # สร้างตาราง province / goods_category / trade_record / priority_score
├── server/
│   ├── package.json
│   ├── Dockerfile
│   └── src/
│       ├── index.js
│       ├── db.js
│       ├── config.js
│       ├── scoring.js                   # สูตรตัวชี้วัด + Weighted Scoring + กฎชั้น
│       └── routes/
│           ├── overview.js              # FR1, FR2
│           ├── ranking.js               # FR3, FR4, FR5
│           ├── tables.js                # หน้าแสดงตารางทั้งหมด (ใหม่)
│           └── export.js                # FR6 (CSV)
└── web/
    ├── package.json
    ├── Dockerfile
    ├── vite.config.js
    ├── tailwind.config.js
    └── src/
        ├── main.jsx
        ├── App.jsx
        ├── api.js
        ├── lib/scoring.js               # สูตรเดียวกับ server ใช้คำนวณ what-if ฝั่ง client ให้สไลเดอร์ตอบสนองทันที
        ├── components/
        │   ├── Sidebar.jsx
        │   ├── StatCard.jsx
        │   ├── DataTable.jsx            # ตารางแบบ reusable (ใหม่)
        │   └── Pagination.jsx
        └── pages/
            ├── Overview.jsx             # ภาพรวม
            ├── Ranking.jsx              # จัดอันดับ
            ├── WhatIf.jsx               # What-if
            ├── Indicators.jsx           # คะแนนตัวชี้วัด
            └── DataTables.jsx           # ตารางข้อมูลทั้งหมด (ใหม่)
```

---

## 3. Docker

### 3.1 `docker-compose.yml`

```yaml
services:
  db:
    image: postgres:16
    restart: unless-stopped
    environment:
      POSTGRES_USER: ${DB_USER}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
      POSTGRES_DB: ${DB_NAME}
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data
      # ไฟล์ใน init จะรันตามลำดับชื่อ เฉพาะตอนสร้าง volume ครั้งแรก
      - ./db/init:/docker-entrypoint-initdb.d:ro
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${DB_USER} -d ${DB_NAME}"]
      interval: 5s
      timeout: 5s
      retries: 10

  api:
    build: ./server
    restart: unless-stopped
    environment:
      DATABASE_URL: postgres://${DB_USER}:${DB_PASSWORD}@db:5432/${DB_NAME}
      PORT: 3001
    depends_on:
      db:
        condition: service_healthy
    ports:
      - "3001:3001"

  web:
    build: ./web
    restart: unless-stopped
    environment:
      VITE_API_URL: http://localhost:3001
    depends_on:
      - api
    ports:
      - "5173:5173"

volumes:
  pgdata:
```

### 3.2 `.env`

```
DB_USER=dss
DB_PASSWORD=dss_password
DB_NAME=dss_port
```

> หากแก้ไฟล์ใน `db/init/` ภายหลัง ต้องลบ volume แล้วสร้างใหม่: `docker compose down -v && docker compose up --build`
> ถ้า SQL ถูกใส่ใน Docker ไว้แล้วด้วยวิธีอื่น ให้ปรับ path ใน `volumes` ให้ตรงกัน

### 3.3 Dockerfile (ตัวอย่างสำหรับ dev)

`server/Dockerfile`
```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
CMD ["npm", "run", "dev"]
```

`web/Dockerfile`
```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 5173
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
```

---

## 4. ฐานข้อมูล

ตามสไลด์ 15–17 (Data Modeling / Entity Diagram) ได้ 4 เอนทิตี สร้างจาก `shipping_original` ด้วย `db/init/02_normalize.sql`

```sql
-- ===== PROVINCE =====
CREATE TABLE province (
    province_id    SERIAL PRIMARY KEY,
    name_th        VARCHAR(100) NOT NULL UNIQUE,   -- ProvinceName_TH
    name_en        VARCHAR(100) NOT NULL,          -- ProvinceName_EN
    is_ranked      BOOLEAN NOT NULL DEFAULT TRUE   -- FALSE = ไม่นำมาจัดอันดับ (เช่น เขตเศรษฐกิจจำเพาะ)
);

INSERT INTO province (name_th, name_en)
SELECT DISTINCT province_th, province_en FROM shipping_original ORDER BY province_th;

UPDATE province SET is_ranked = FALSE WHERE name_en = 'Exclusive Economic Zone';

-- ===== GOODS_CATEGORY =====
CREATE TABLE goods_category (
    goods_category_id       SERIAL PRIMARY KEY,
    category_name_th        VARCHAR(100) NOT NULL UNIQUE,
    category_name_en        VARCHAR(100) NOT NULL,
    original_goods_mapping  TEXT                      -- รายการสินค้าเดิมในหมวด คั่นด้วย ,
);

INSERT INTO goods_category (category_name_th, category_name_en, original_goods_mapping)
SELECT category_th, category_en, string_agg(DISTINCT good_th, ', ' ORDER BY good_th)
FROM shipping_original
GROUP BY category_th, category_en
ORDER BY category_th;

-- ===== TRADE_RECORD =====
CREATE TABLE trade_record (
    record_id             SERIAL PRIMARY KEY,
    year_be               SMALLINT NOT NULL,
    year_ad               SMALLINT NOT NULL,
    province_id           INTEGER NOT NULL REFERENCES province(province_id),
    processing_indicator  VARCHAR(10) NOT NULL CHECK (processing_indicator IN ('Arrival','Departure')),
    goods_category_id     INTEGER NOT NULL REFERENCES goods_category(goods_category_id),
    total_weight          NUMERIC(18,2) NOT NULL,     -- หน่วยตัน (ดูหมายเหตุข้อ 1.1)
    UNIQUE (year_ad, province_id, processing_indicator, goods_category_id)
);

INSERT INTO trade_record (year_be, year_ad, province_id, processing_indicator, goods_category_id, total_weight)
SELECT s.year_be, s.year_ce, p.province_id, s.flow_en, g.goods_category_id, SUM(s.weight_kg)
FROM shipping_original s
JOIN province p        ON p.name_th = s.province_th
JOIN goods_category g  ON g.category_name_th = s.category_th
GROUP BY s.year_be, s.year_ce, p.province_id, s.flow_en, g.goods_category_id;

CREATE INDEX idx_trade_year     ON trade_record (year_ad);
CREATE INDEX idx_trade_province ON trade_record (province_id);
CREATE INDEX idx_trade_category ON trade_record (goods_category_id);

-- ===== PRIORITY_SCORE (snapshot ของโปรไฟล์ "สมดุล") =====
CREATE TABLE priority_score (
    score_id              SERIAL PRIMARY KEY,
    province_id           INTEGER NOT NULL REFERENCES province(province_id),
    year_ad               SMALLINT NOT NULL,           -- ปีล่าสุดที่ใช้คำนวณ (เช่น 2025)
    volume_score          NUMERIC(6,2),
    growth_score          NUMERIC(6,2),
    diversity_score       NUMERIC(6,2),
    balance_score         NUMERIC(6,2),
    stability_score       NUMERIC(6,2),
    final_priority_score  NUMERIC(6,2),
    rank                  INTEGER,
    tier                  SMALLINT,                    -- ส่วนเพิ่ม: ชั้น 1–4
    UNIQUE (province_id, year_ad)
);

-- ===== View ช่วยคำนวณ =====
CREATE VIEW v_province_year AS
SELECT province_id, year_ad,
       SUM(total_weight) FILTER (WHERE processing_indicator = 'Arrival')   AS arrival,
       SUM(total_weight) FILTER (WHERE processing_indicator = 'Departure') AS departure,
       SUM(total_weight) AS total
FROM trade_record
GROUP BY province_id, year_ad;
```

> `priority_score` คำนวณและบันทึกโดย Node.js ตอนเริ่มระบบหรือเมื่อมีการอัปเดตข้อมูล (use case "คำนวณอัตโนมัติเมื่อข้อมูลอัปเดต")
> ส่วน what-if ไม่เขียนลง DB คำนวณชั่วคราวในหน่วยความจำ

---

## 5. สูตรการให้คะแนน (Weighted Scoring)

```
คะแนนรวม = wV·V + wG·G + wD·D + wB·B + wS·S      (ค่าเริ่มต้น 0.40 / 0.25 / 0.15 / 0.10 / 0.10)
```

ทุกตัวชี้วัดปรับเป็น 0–100 ด้วย **min–max ข้ามพื้นที่ที่นำมาจัดอันดับ** (ตรงกับสไลด์ 21 ที่มีคะแนน 100 ในหลายคอลัมน์)

| ตัวชี้วัด | ค่าดิบ | การปรับเป็น 0–100 |
|---|---|---|
| **V** ปริมาณ | ค่าเฉลี่ยต่อปีของปริมาณรวม (เข้า+ออก) | `log10(avg)` แล้ว min–max |
| **G** การเติบโต | ค่าเฉลี่ยของ YoY (2565→66, 66→67, 67→68) | min–max (แนะนำ winsorize ที่ P5/P95 เพื่อกันพื้นที่ฐานเล็กที่โตหลายเท่า) |
| **D** ความหลากหลาย | `1 − HHI` ของสัดส่วน 7 หมวดสินค้า (รวม 4 ปี) | min–max |
| **B** สมดุลเข้า–ออก | `1 − |เข้า − ออก| ÷ (เข้า + ออก)` (รวม 4 ปี) | min–max |
| **S** เสถียรภาพ | CV = `stddev ÷ mean` ของปริมาณรวมรายปี | min–max แล้วกลับด้าน (`100 − x`) เพราะ CV ต่ำ = ดี |

### กฎจัดชั้น (สไลด์ 11)

| ชั้น | เงื่อนไข | ความหมาย |
|---|---|---|
| 1 | คะแนน ≥ 65 **และ** ปริมาณเฉลี่ย ≥ 5 ล้านตัน/ปี | ขยายกำลังรองรับ |
| 2 | คะแนน ≥ 65 **และ** ปริมาณเฉลี่ย < 5 ล้านตัน/ปี | พัฒนาเฉพาะทาง |
| 3 | 50 ≤ คะแนน < 65 | พัฒนาเฉพาะทาง |
| 4 | คะแนน < 50 | ติดตาม |

เกณฑ์ 65 / 50 / 5 ล้านตัน ต้องปรับได้ (เก็บใน `config.js` และให้ส่งผ่าน query ได้)

### โปรไฟล์น้ำหนักสำเร็จรูป (สไลด์ 10)

| โปรไฟล์ | V | G | D | B | S |
|---|---|---|---|---|---|
| สมดุล (ค่าเริ่มต้น) | 40 | 25 | 15 | 10 | 10 |
| เน้นขยายกำลังรองรับ | 50 | 20 | 10 | 10 | 10 |
| เน้นความเสถียรภาพ | 20 | 15 | 10 | 15 | 40 |

ผู้ใช้ปรับสไลเดอร์ได้อิสระ (FR3) ถ้าผลรวมไม่เท่ากับ 100 ให้ **normalize ด้วยผลรวมจริง** และแสดงคำเตือน

### `server/src/scoring.js`

```js
export const DEFAULT_WEIGHTS = { V: 40, G: 25, D: 15, B: 10, S: 10 };
export const DEFAULT_THRESHOLDS = { high: 65, mid: 50, volumeMt: 5 };

const mean = (a) => a.reduce((s, x) => s + x, 0) / a.length;
const std = (a) => {
  const m = mean(a);
  return Math.sqrt(mean(a.map((x) => (x - m) ** 2)));
};

function minMax(values, invert = false) {
  const min = Math.min(...values);
  const max = Math.max(...values);
  return values.map((v) => {
    const s = max === min ? 50 : ((v - min) / (max - min)) * 100;
    return invert ? 100 - s : s;
  });
}

/**
 * yearly:     [{ province_id, name_th, name_en, year_ad, arrival, departure }]
 * categories: [{ province_id, goods_category_id, weight }]   (รวมทุกปี)
 * คืนค่า: indicator 0–100 ของแต่ละพื้นที่ + ค่าดิบที่ใช้ตัดชั้น
 */
export function buildIndicators(yearly, categories) {
  const byProv = new Map();
  for (const r of yearly) {
    if (!byProv.has(r.province_id)) byProv.set(r.province_id, { ...r, rows: [] });
    byProv.get(r.province_id).rows.push(r);
  }

  const raw = [...byProv.values()].map((p) => {
    const rows = p.rows.sort((a, b) => a.year_ad - b.year_ad);
    const totals = rows.map((r) => Number(r.arrival || 0) + Number(r.departure || 0));
    const arrival = rows.reduce((s, r) => s + Number(r.arrival || 0), 0);
    const departure = rows.reduce((s, r) => s + Number(r.departure || 0), 0);

    const yoy = [];
    for (let i = 1; i < totals.length; i++) {
      if (totals[i - 1] > 0) yoy.push(totals[i] / totals[i - 1] - 1);
    }

    const cats = categories.filter((c) => c.province_id === p.province_id);
    const sum = cats.reduce((s, c) => s + Number(c.weight), 0);
    const hhi = cats.reduce((s, c) => s + (Number(c.weight) / sum) ** 2, 0);

    const avg = mean(totals);
    return {
      province_id: p.province_id,
      name_th: p.name_th,
      name_en: p.name_en,
      avgVolume: avg,
      growth: yoy.length ? mean(yoy) : 0,
      diversity: 1 - hhi,
      balance: arrival + departure > 0 ? 1 - Math.abs(arrival - departure) / (arrival + departure) : 0,
      cv: avg > 0 ? std(totals) / avg : 0,
      totals,
    };
  });

  const V = minMax(raw.map((r) => Math.log10(Math.max(r.avgVolume, 1))));
  const G = minMax(raw.map((r) => r.growth));
  const D = minMax(raw.map((r) => r.diversity));
  const B = minMax(raw.map((r) => r.balance));
  const S = minMax(raw.map((r) => r.cv), true);

  return raw.map((r, i) => ({ ...r, V: V[i], G: G[i], D: D[i], B: B[i], S: S[i] }));
}

export function normalizeWeights(w) {
  const total = Object.values(w).reduce((s, x) => s + Number(x), 0) || 1;
  return Object.fromEntries(Object.entries(w).map(([k, v]) => [k, Number(v) / total]));
}

export function tierOf(score, avgVolumeTon, t = DEFAULT_THRESHOLDS) {
  if (score >= t.high) return avgVolumeTon >= t.volumeMt * 1e6 ? 1 : 2;
  if (score >= t.mid) return 3;
  return 4;
}

export function rank(indicators, weights = DEFAULT_WEIGHTS, thresholds = DEFAULT_THRESHOLDS) {
  const w = normalizeWeights(weights);
  return indicators
    .map((r) => {
      const score = w.V * r.V + w.G * r.G + w.D * r.D + w.B * r.B + w.S * r.S;
      return { ...r, score, tier: tierOf(score, r.avgVolume, thresholds) };
    })
    .sort((a, b) => b.score - a.score)
    .map((r, i) => ({ ...r, rank: i + 1 }));
}
```

คัดลอกไฟล์เดียวกันไปไว้ที่ `web/src/lib/scoring.js` (เฉพาะ `normalizeWeights`, `tierOf`, `rank`) เพื่อให้หน้า What-if ปรับสไลเดอร์แล้วอันดับเปลี่ยนทันทีโดยไม่ต้องเรียก API ทุกครั้ง
ฝั่ง server ยังคำนวณเองสำหรับ FR4/FR5 และ export เพื่อให้ผลตรวจสอบได้

---

## 6. API

Base URL: `http://localhost:3001/api`

| Method | Path | ใช้กับ | คำอธิบาย |
|---|---|---|---|
| GET | `/overview` | FR1, FR2 | ปริมาณรวมรายปี (เข้า/ออก), % เทียบปีแรก, สัดส่วนชลบุรี+ระยอง |
| GET | `/provinces/yearly` | FR1, FR2 | ปริมาณรายจังหวัด/ปี พร้อม YoY |
| GET | `/indicators` | FR4 | ตัวชี้วัด V,G,D,B,S (0–100) ของทุกพื้นที่ที่จัดอันดับ |
| GET | `/ranking?V=40&G=25&D=15&B=10&S=10` | FR3–FR5 | จัดอันดับตามน้ำหนัก + ชั้น |
| GET | `/ranking/export.csv?...` | FR6 | ส่งออกผลจัดอันดับเป็น CSV |
| GET | `/tables` | **หน้าตารางทั้งหมด** | รายชื่อตาราง, จำนวนแถว, รายการคอลัมน์ |
| GET | `/tables/:name` | **หน้าตารางทั้งหมด** | ข้อมูลของตารางแบบแบ่งหน้า / ค้นหา / เรียง / กรอง |
| GET | `/tables/:name/export.csv` | **หน้าตารางทั้งหมด** | ดาวน์โหลดตารางตามตัวกรองปัจจุบัน |

### `server/src/db.js`

```js
import pg from 'pg';
const { Pool, types } = pg;

// NUMERIC (1700) และ BIGINT (20) ให้กลายเป็น number
types.setTypeParser(1700, (v) => (v === null ? null : parseFloat(v)));
types.setTypeParser(20, (v) => (v === null ? null : parseInt(v, 10)));

export const pool = new Pool({ connectionString: process.env.DATABASE_URL });
```

### `server/src/routes/tables.js` — API หน้าตารางทั้งหมด

หลักความปลอดภัย: **อนุญาตเฉพาะชื่อตารางใน whitelist** และชื่อคอลัมน์ที่ดึงจาก `information_schema` เท่านั้น ห้ามต่อ string จาก query ตรง ๆ ค่า filter/search ต้องใช้ parameterized query (`$1, $2, ...`)

```js
import { Router } from 'express';
import { pool } from '../db.js';

const router = Router();

const TABLES = {
  shipping_original: { label: 'ข้อมูลต้นฉบับ', defaultSort: 'id' },
  province:          { label: 'จังหวัด/พื้นที่', defaultSort: 'province_id' },
  goods_category:    { label: 'หมวดสินค้า', defaultSort: 'goods_category_id' },
  trade_record:      { label: 'บันทึกการค้า', defaultSort: 'record_id' },
  priority_score:    { label: 'คะแนนความสำคัญ', defaultSort: 'score_id' },
};

async function getColumns(name) {
  const { rows } = await pool.query(
    `SELECT column_name, data_type
       FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = $1
      ORDER BY ordinal_position`,
    [name]
  );
  return rows;
}

// รายการตารางทั้งหมด + จำนวนแถว
router.get('/', async (_req, res, next) => {
  try {
    const out = [];
    for (const [name, meta] of Object.entries(TABLES)) {
      const { rows } = await pool.query(`SELECT COUNT(*)::int AS n FROM ${name}`); // name มาจาก whitelist
      out.push({ name, label: meta.label, rowCount: rows[0].n, columns: await getColumns(name) });
    }
    res.json(out);
  } catch (e) { next(e); }
});

// ข้อมูลของตาราง
router.get('/:name', async (req, res, next) => {
  try {
    const { name } = req.params;
    if (!TABLES[name]) return res.status(404).json({ error: 'unknown table' });

    const cols = await getColumns(name);
    const colNames = cols.map((c) => c.column_name);
    const textCols = cols
      .filter((c) => ['character varying', 'text'].includes(c.data_type))
      .map((c) => c.column_name);

    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const pageSize = Math.min(Math.max(parseInt(req.query.pageSize) || 25, 1), 200);
    const sort = colNames.includes(req.query.sort) ? req.query.sort : TABLES[name].defaultSort;
    const order = req.query.order === 'desc' ? 'DESC' : 'ASC';

    const where = [];
    const params = [];

    // ค้นหาข้อความ: ILIKE ทุกคอลัมน์ข้อความ
    if (req.query.q && textCols.length) {
      params.push(`%${req.query.q}%`);
      where.push('(' + textCols.map((c) => `${c}::text ILIKE $${params.length}`).join(' OR ') + ')');
    }
    // กรองตรงตัว: ?f.year_ce=2025&f.flow_en=Arrival
    for (const [k, v] of Object.entries(req.query)) {
      if (k.startsWith('f.') && colNames.includes(k.slice(2)) && v !== '') {
        params.push(v);
        where.push(`${k.slice(2)}::text = $${params.length}`);
      }
    }
    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

    const total = (await pool.query(`SELECT COUNT(*)::int AS n FROM ${name} ${whereSql}`, params)).rows[0].n;
    const { rows } = await pool.query(
      `SELECT * FROM ${name} ${whereSql}
        ORDER BY ${sort} ${order}
        LIMIT ${pageSize} OFFSET ${(page - 1) * pageSize}`,
      params
    );

    res.json({ table: name, columns: cols, page, pageSize, total, rows });
  } catch (e) { next(e); }
});

export default router;
```

### `server/src/index.js`

```js
import express from 'express';
import cors from 'cors';
import tables from './routes/tables.js';
// import overview, ranking, export ตามที่สร้าง

const app = express();
app.use(cors());
app.use(express.json());

app.get('/api/health', (_req, res) => res.json({ ok: true }));
app.use('/api/tables', tables);
// app.use('/api', overview); app.use('/api', ranking);

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: 'internal error' });
});

app.listen(process.env.PORT || 3001, () => console.log('API ready'));
```

`server/package.json` (ส่วนสำคัญ)
```json
{
  "type": "module",
  "scripts": { "dev": "node --watch src/index.js" },
  "dependencies": { "cors": "^2.8.5", "express": "^4.19.2", "pg": "^8.12.0" }
}
```

---

## 7. หน้าจอ (Frontend)

เมนูด้านซ้าย (Sidebar สีกรมท่า ตามสไลด์): **ภาพรวม · จัดอันดับ · What-if · คะแนนตัวชี้วัด · ตารางข้อมูล**

| หน้า | เนื้อหา | FR |
|---|---|---|
| ภาพรวม | การ์ดสรุป (ปริมาณรวมปีล่าสุด, % เปลี่ยนแปลงเทียบ 2565, สัดส่วนชลบุรี+ระยอง) + กราฟแท่งซ้อนขาเข้า/ขาออก รายปี | FR1, FR2, FR6 |
| จัดอันดับ | กราฟแท่งแนวนอน 12 อันดับแรก + การ์ดชั้น 1/2/3 + ปุ่ม Export CSV | FR4, FR5, FR6 |
| What-if | ปุ่มเลือกสถานการณ์ (ค่าเริ่มต้น / ขยายกำลัง / ความเสถียรภาพ) + สไลเดอร์ 5 ตัว + ตารางอันดับฐานเทียบอันดับใหม่ (▲▼) | FR3 |
| คะแนนตัวชี้วัด | ตาราง 8 อันดับแรก คอลัมน์ V,G,D,B,S,รวม,ชั้น ระบายสี heatmap ตามค่า | FR4 |
| **ตารางข้อมูล (ใหม่)** | ดูข้อมูลทุกตารางในฐานข้อมูล ดูรายละเอียดข้างล่าง | — |

### 7.1 หน้า "ตารางข้อมูล" (DataTables) — ข้อกำหนด

แสดงข้อมูลทุกตารางที่ระบบใช้ในที่เดียว:

| แท็บ | ตาราง | จำนวนแถว (โดยประมาณ) |
|---|---|---|
| ข้อมูลต้นฉบับ | `shipping_original` | 956 |
| จังหวัด/พื้นที่ | `province` | 23 |
| หมวดสินค้า | `goods_category` | 7 |
| บันทึกการค้า | `trade_record` | ตามผลการจัดกลุ่ม |
| คะแนนความสำคัญ | `priority_score` | ตามจำนวนพื้นที่ที่จัดอันดับ |

ฟังก์ชัน:
1. **แท็บเลือกตาราง** แสดงชื่อไทย + ชื่อตาราง + จำนวนแถวบนแท็บ (ดึงจาก `GET /api/tables`)
2. **แบ่งหน้าฝั่ง server** เลือกจำนวนแถวต่อหน้า 25 / 50 / 100 (`page`, `pageSize`)
3. **ค้นหา** ช่องเดียวค้นทุกคอลัมน์ข้อความ ใช้ debounce 300 ms (`q`)
4. **กรอง** ตารางที่มีคอลัมน์ปี/ทิศทาง/พื้นที่/หมวด ให้มี dropdown กรองตรงตัว (`f.<column>`) เช่น `year_ce`, `flow_en`, `province_en`, `category_en`
5. **เรียงลำดับ** คลิกหัวคอลัมน์สลับ ASC/DESC (`sort`, `order`) แสดงลูกศรบอกทิศทาง
6. **จัดรูปแบบตัวเลข** น้ำหนักใช้ `toLocaleString('th-TH')` ชิดขวา, ข้อความชิดซ้าย, `NULL` แสดงเป็น `—`
7. **Export CSV** ของตารางและตัวกรองปัจจุบัน (เติม BOM `\uFEFF` ให้ Excel อ่านภาษาไทยได้)
8. แสดงข้อความ "กำลังโหลด…", "ไม่พบข้อมูล" และ error state; หัวตารางตรึง (sticky) เมื่อเลื่อน
9. รองรับมือถือ: ห่อตารางด้วย `overflow-x-auto`

### `web/src/pages/DataTables.jsx` (ตัวอย่างพร้อมใช้)

```jsx
import { useEffect, useMemo, useState } from 'react';

const API = import.meta.env.VITE_API_URL ?? 'http://localhost:3001';

const FILTERS = {
  shipping_original: ['year_ce', 'flow_en', 'province_en', 'category_en'],
  trade_record: ['year_ad', 'processing_indicator'],
  priority_score: ['year_ad', 'tier'],
};

function useDebounced(value, ms = 300) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

export default function DataTables() {
  const [tables, setTables] = useState([]);
  const [active, setActive] = useState('shipping_original');
  const [data, setData] = useState(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [sort, setSort] = useState(null);
  const [order, setOrder] = useState('asc');
  const [q, setQ] = useState('');
  const [filters, setFilters] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const dq = useDebounced(q);

  useEffect(() => {
    fetch(`${API}/api/tables`).then((r) => r.json()).then(setTables).catch((e) => setError(e.message));
  }, []);

  const queryString = useMemo(() => {
    const p = new URLSearchParams({ page, pageSize, order });
    if (sort) p.set('sort', sort);
    if (dq) p.set('q', dq);
    Object.entries(filters).forEach(([k, v]) => v && p.set(`f.${k}`, v));
    return p.toString();
  }, [page, pageSize, sort, order, dq, filters]);

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetch(`${API}/api/tables/${active}?${queryString}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [active, queryString]);

  const switchTable = (name) => {
    setActive(name); setPage(1); setSort(null); setOrder('asc'); setQ(''); setFilters({});
  };
  const toggleSort = (col) => {
    if (sort === col) setOrder(order === 'asc' ? 'desc' : 'asc');
    else { setSort(col); setOrder('asc'); }
    setPage(1);
  };

  const totalPages = data ? Math.max(Math.ceil(data.total / data.pageSize), 1) : 1;
  const isNum = (t) => ['integer', 'smallint', 'numeric', 'bigint'].includes(t);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-slate-800 mb-4">ตารางข้อมูลทั้งหมด</h1>

      {/* แท็บ */}
      <div className="flex flex-wrap gap-2 mb-4">
        {tables.map((t) => (
          <button
            key={t.name}
            onClick={() => switchTable(t.name)}
            className={`px-4 py-2 rounded-full text-sm border transition ${
              active === t.name
                ? 'bg-sky-700 text-white border-sky-700'
                : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
            }`}
          >
            {t.label} <span className="opacity-70">({t.rowCount.toLocaleString('th-TH')})</span>
          </button>
        ))}
      </div>

      {/* เครื่องมือ */}
      <div className="flex flex-wrap items-center gap-3 mb-3">
        <input
          value={q}
          onChange={(e) => { setQ(e.target.value); setPage(1); }}
          placeholder="ค้นหา…"
          className="border border-slate-300 rounded-lg px-3 py-2 text-sm w-64"
        />
        {(FILTERS[active] ?? []).map((col) => (
          <input
            key={col}
            value={filters[col] ?? ''}
            onChange={(e) => { setFilters({ ...filters, [col]: e.target.value }); setPage(1); }}
            placeholder={col}
            className="border border-slate-300 rounded-lg px-3 py-2 text-sm w-36"
          />
        ))}
        <select
          value={pageSize}
          onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
          className="border border-slate-300 rounded-lg px-2 py-2 text-sm"
        >
          {[25, 50, 100].map((n) => <option key={n} value={n}>{n} แถว/หน้า</option>)}
        </select>
        <a
          href={`${API}/api/tables/${active}/export.csv?${queryString}`}
          className="ml-auto px-4 py-2 rounded-lg bg-slate-800 text-white text-sm hover:bg-slate-700"
        >
          Export CSV
        </a>
      </div>

      {error && <div className="mb-3 p-3 rounded bg-red-50 text-red-700 text-sm">เกิดข้อผิดพลาด: {error}</div>}

      {/* ตาราง */}
      <div className="overflow-x-auto border border-slate-200 rounded-xl bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-800 text-white sticky top-0">
            <tr>
              {data?.columns.map((c) => (
                <th
                  key={c.column_name}
                  onClick={() => toggleSort(c.column_name)}
                  className={`px-3 py-2 font-medium cursor-pointer select-none whitespace-nowrap ${
                    isNum(c.data_type) ? 'text-right' : 'text-left'
                  }`}
                >
                  {c.column_name}
                  {sort === c.column_name && (order === 'asc' ? ' ▲' : ' ▼')}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className={loading ? 'opacity-50' : ''}>
            {data?.rows.map((row, i) => (
              <tr key={i} className="border-t border-slate-100 hover:bg-sky-50">
                {data.columns.map((c) => {
                  const v = row[c.column_name];
                  return (
                    <td
                      key={c.column_name}
                      className={`px-3 py-2 whitespace-nowrap ${isNum(c.data_type) ? 'text-right tabular-nums' : ''}`}
                    >
                      {v === null || v === undefined
                        ? '—'
                        : typeof v === 'number' && c.data_type === 'numeric'
                        ? v.toLocaleString('th-TH', { maximumFractionDigits: 2 })
                        : String(v)}
                    </td>
                  );
                })}
              </tr>
            ))}
            {data && data.rows.length === 0 && (
              <tr><td colSpan={data.columns.length} className="px-3 py-8 text-center text-slate-500">ไม่พบข้อมูล</td></tr>
            )}
            {!data && loading && (
              <tr><td className="px-3 py-8 text-center text-slate-500">กำลังโหลด…</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* แบ่งหน้า */}
      {data && (
        <div className="flex items-center justify-between mt-3 text-sm text-slate-600">
          <span>ทั้งหมด {data.total.toLocaleString('th-TH')} แถว</span>
          <div className="flex items-center gap-2">
            <button disabled={page <= 1} onClick={() => setPage(1)} className="px-2 py-1 border rounded disabled:opacity-40">«</button>
            <button disabled={page <= 1} onClick={() => setPage(page - 1)} className="px-3 py-1 border rounded disabled:opacity-40">ก่อนหน้า</button>
            <span>หน้า {page} / {totalPages}</span>
            <button disabled={page >= totalPages} onClick={() => setPage(page + 1)} className="px-3 py-1 border rounded disabled:opacity-40">ถัดไป</button>
            <button disabled={page >= totalPages} onClick={() => setPage(totalPages)} className="px-2 py-1 border rounded disabled:opacity-40">»</button>
          </div>
        </div>
      )}
    </div>
  );
}
```

> ตัวอย่างนี้เรียก `/api/tables/:name/export.csv` ซึ่งต้องเพิ่ม route ใน `tables.js` (ใช้ query เดียวกับ `/:name` แต่ไม่มี `LIMIT` แล้วส่งเป็น `text/csv; charset=utf-8` พร้อม BOM)
> ตัวกรองในตัวอย่างเป็นช่องพิมพ์แบบง่าย ถ้าต้องการ dropdown ให้เพิ่ม endpoint `/api/tables/:name/distinct/:column` คืนค่าที่ไม่ซ้ำ

### 7.2 ตั้งค่า Vite + Tailwind

```bash
cd web
npm create vite@latest . -- --template react
npm install
npm install -D tailwindcss@3 postcss autoprefixer
npx tailwindcss init -p
npm install react-router-dom recharts
```

`tailwind.config.js`
```js
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: { navy: { 900: '#0b1d4a', 800: '#12296a' }, brand: '#0b6aa3', accent: '#b80000' },
      fontFamily: { sans: ['"Noto Sans Thai"', 'sans-serif'] },
    },
  },
  plugins: [],
};
```

`src/index.css`
```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

เพิ่ม Google Font "Noto Sans Thai" ใน `index.html` และใช้ `react-router-dom` สำหรับ 5 หน้า (`/`, `/ranking`, `/whatif`, `/indicators`, `/tables`)
กราฟใช้ `recharts` (BarChart แนวตั้ง/แนวนอน)

---

## 8. ลำดับการพัฒนาที่แนะนำ

1. `docker compose up db` ตรวจว่า `shipping_original` มี 956 แถว และ `province` / `goods_category` / `trade_record` ถูกสร้าง
   ```bash
   docker compose exec db psql -U dss -d dss_port -c "SELECT COUNT(*) FROM shipping_original;"
   docker compose exec db psql -U dss -d dss_port -c "SELECT year_ad, processing_indicator, ROUND(SUM(total_weight)/1e6,1) FROM trade_record GROUP BY 1,2 ORDER BY 1,2;"
   ```
   ผลควรตรงสไลด์ 18: 2565 เข้า 206.1 / ออก 164.0, 2566 เข้า 181.4 / ออก 186.9, 2567 เข้า 197.6 / ออก 151.0, 2568 เข้า 202.6 / ออก 138.0
2. เขียน `server` ให้ `/api/health` และ `/api/tables` ใช้งานได้ แล้วทำหน้า **ตารางข้อมูล** ก่อน (ได้ใช้ตรวจข้อมูลไปด้วยระหว่างพัฒนาหน้าอื่น)
3. เขียน `scoring.js` + unit test เทียบกับสไลด์ 21 (ชลบุรีควรได้ V=100, รวมประมาณ 83.6; ภูเก็ต D=100; สมุทรปราการ D=100 และ B=100) หากต่างมากให้ทบทวนวิธี normalize (min–max / winsorize)
4. ทำหน้า ภาพรวม → จัดอันดับ → คะแนนตัวชี้วัด → What-if
5. ปุ่ม Export CSV (FR6) และเกลาหน้าจอตาม Prototype

## 9. เช็กลิสต์ความสอดคล้องกับ Functional Requirements

- [ ] FR1 ปริมาณรวม (เข้า+ออก) แยกตามจังหวัดและปี
- [ ] FR2 YoY Growth ต่อจังหวัด
- [ ] FR3 ปรับน้ำหนัก 5 ปัจจัยได้เอง + โปรไฟล์สำเร็จรูป 3 แบบ
- [ ] FR4 คำนวณ Priority Score ด้วย Weighted Scoring
- [ ] FR5 จัดอันดับพื้นที่ที่ควรลงทุนก่อน–หลัง พร้อมชั้นความสำคัญ
- [ ] FR6 แดชบอร์ดเชิงภาพ + ส่งออกรายงาน (CSV)
- [ ] ตารางข้อมูลทั้งหมด: แท็บ, ค้นหา, กรอง, เรียง, แบ่งหน้า, Export CSV
- [ ] Use case นำเข้า/อัปเดตข้อมูลดิบ (อัปโหลดเข้า `shipping_original` แล้วรัน normalize + คำนวณคะแนนใหม่) — ขอบเขตเพิ่มเติม ทำภายหลังได้
