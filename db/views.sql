-- View: daily_stats
-- Aggregates total permits and exception count by date and station.

DROP VIEW IF EXISTS daily_stats;
CREATE VIEW daily_stats AS
SELECT 
  date(r.apply_date) AS day,
  s.id AS station_id,
  s.code AS station_code,
  s.name AS station_name,
  COUNT(*) AS permit_count,
  SUM(CASE WHEN r.status = 'exception' THEN 1 ELSE 0 END) AS exception_count
FROM permit_record r
JOIN police_station s ON s.id = r.station_id
GROUP BY day, station_id
ORDER BY day DESC, station_id ASC;
