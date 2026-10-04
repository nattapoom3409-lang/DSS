-- Normalize the original 956-row dataset without changing its raw values.
CREATE TABLE province (
    province_id SERIAL PRIMARY KEY,
    name_th VARCHAR(100) NOT NULL UNIQUE,
    name_en VARCHAR(100) NOT NULL,
    is_ranked BOOLEAN NOT NULL DEFAULT TRUE
);

INSERT INTO province (name_th, name_en)
SELECT DISTINCT province_th, province_en
FROM shipping_original
ORDER BY province_th;

UPDATE province
SET is_ranked = FALSE
WHERE name_en = 'Exclusive Economic Zone';

CREATE TABLE goods_category (
    goods_category_id SERIAL PRIMARY KEY,
    category_name_th VARCHAR(100) NOT NULL UNIQUE,
    category_name_en VARCHAR(100) NOT NULL,
    original_goods_mapping TEXT
);

INSERT INTO goods_category (category_name_th, category_name_en, original_goods_mapping)
SELECT category_th,
       category_en,
       string_agg(DISTINCT good_th, ', ' ORDER BY good_th)
FROM shipping_original
GROUP BY category_th, category_en
ORDER BY category_th;

CREATE TABLE trade_record (
    record_id SERIAL PRIMARY KEY,
    year_be SMALLINT NOT NULL,
    year_ad SMALLINT NOT NULL,
    province_id INTEGER NOT NULL REFERENCES province(province_id),
    processing_indicator VARCHAR(10) NOT NULL CHECK (processing_indicator IN ('Arrival', 'Departure')),
    goods_category_id INTEGER NOT NULL REFERENCES goods_category(goods_category_id),
    total_weight_ton NUMERIC(18, 2) NOT NULL,
    UNIQUE (year_ad, province_id, processing_indicator, goods_category_id)
);

COMMENT ON COLUMN trade_record.total_weight_ton IS
  'Raw weight value as supplied; the source unit is assumed to be tonnes per DSS_PORT_SPEC.md and should be verified with the source dataset.';

INSERT INTO trade_record (
    year_be, year_ad, province_id, processing_indicator, goods_category_id, total_weight_ton
)
SELECT s.year_be,
       s.year_ce,
       p.province_id,
       s.flow_en,
       g.goods_category_id,
       SUM(s.weight_kg)
FROM shipping_original s
JOIN province p ON p.name_th = s.province_th
JOIN goods_category g ON g.category_name_th = s.category_th
GROUP BY s.year_be, s.year_ce, p.province_id, s.flow_en, g.goods_category_id;

CREATE INDEX idx_trade_year ON trade_record (year_ad);
CREATE INDEX idx_trade_province ON trade_record (province_id);
CREATE INDEX idx_trade_category ON trade_record (goods_category_id);
CREATE INDEX idx_trade_year_province ON trade_record (year_ad, province_id);

CREATE TABLE priority_score (
    score_id SERIAL PRIMARY KEY,
    province_id INTEGER NOT NULL REFERENCES province(province_id),
    year_ad SMALLINT NOT NULL,
    volume_score NUMERIC(6, 2),
    growth_score NUMERIC(6, 2),
    diversity_score NUMERIC(6, 2),
    balance_score NUMERIC(6, 2),
    stability_score NUMERIC(6, 2),
    final_priority_score NUMERIC(6, 2),
    rank INTEGER,
    tier SMALLINT CHECK (tier BETWEEN 1 AND 4),
    UNIQUE (province_id, year_ad)
);

CREATE VIEW v_province_year AS
SELECT province_id,
       year_ad,
       SUM(total_weight_ton) FILTER (WHERE processing_indicator = 'Arrival') AS arrival,
       SUM(total_weight_ton) FILTER (WHERE processing_indicator = 'Departure') AS departure,
       SUM(total_weight_ton) AS total
FROM trade_record
GROUP BY province_id, year_ad;
