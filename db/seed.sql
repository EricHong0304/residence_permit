-- Seed data for police_station and permit_record
INSERT INTO police_station (code, name, short_name, remark) VALUES
  ('PS001', '第一派出所', '一所', '示例派出所1'),
  ('PS002', '第二派出所', '二所', '示例派出所2'),
  ('PS003', '第三派出所', '三所', '示例派出所3')
ON CONFLICT(code) DO NOTHING;

-- Generate a few records across dates
INSERT INTO permit_record (station_id, apply_date, status, exception_reason)
VALUES
  (1, date('now', '-2 day'), 'success', NULL),
  (1, date('now', '-2 day'), 'exception', '材料缺失'),
  (1, date('now', '-1 day'), 'success', NULL),
  (2, date('now', '-1 day'), 'exception', '系统错误'),
  (2, date('now'), 'success', NULL),
  (3, date('now'), 'success', NULL),
  (3, date('now'), 'exception', '照片不合规');
