-- Catalog references from the existing 26W snapshot; no WU event dates changed.
begin;
insert into private.course_groups(semester_code, course_id, discipline, required) values
('26W', '0571', 'System Development and Operations', false),
('26W', '1192', 'Digital Markets and Strategies', true),
('26W', '1193', 'IT Governance, Risk and Control', false),
('26W', '1194', 'Business Process Management', false),
('26W', '1195', 'Value-Based System Engineering', false),
('26W', '1196', 'Marketing and Innovation', false),
('26W', '1228', 'Marketing and Innovation', false),
('26W', '1312', 'Digital Markets and Strategies', true),
('26W', '1327', 'IT Governance, Risk and Control', false),
('26W', '1341', 'System Development and Operations', false),
('26W', '1380', 'Security and Privacy', false),
('26W', '2430', 'Foundations of Digital Economy', true),
('26W', '2431', 'Foundations of Digital Economy', true),
('26W', '2432', 'Foundations of Digital Economy', true),
('26W', '1314', 'Marketing and Innovation', false),
('26W', '2458', 'Data Management', false),
('26W', '2463', 'Data Management', false);
insert into private.preset_templates(semester_code, presets) values ('26W', '{"iurii": {"name": "Iurii", "color": "#2f6feb", "courseIds": ["1312", "1327", "1195", "1314", "2432"]}, "anna": {"name": "Anna", "color": "#d14d8b", "courseIds": ["1192", "1327", "1196", "2430", "2463"]}}'::jsonb);
commit;
