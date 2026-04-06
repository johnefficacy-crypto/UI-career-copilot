-- =============================================================================
-- CAREER COPILOT — COMPLETE SEED DATA  (schema-exact, uuid-safe)
-- =============================================================================
-- Root cause of previous error:
--   organizations.id is uuid (DEFAULT uuid_generate_v4()).
--   Inserting string literals like 'org-001' raises:
--     ERROR 22P02: invalid input syntax for type uuid
--
-- Fix: every PK/FK in this file is a real UUID declared as a
-- DO-block variable so the entire FK chain stays consistent across
-- sections without a single string-slug.
--
-- Run order:
--   1. Enable RLS migration (run separately if not done)
--   2. This file in Supabase SQL Editor
--   3. forum_rls_fix.sql
--
-- Idempotent: every INSERT uses ON CONFLICT DO NOTHING / DO UPDATE.
-- Safe to re-run at any time.
-- =============================================================================

-- =============================================================================
-- SECTION 0: SEED USERS IN auth.users
-- (skip this block if users already exist in Supabase Auth dashboard)
-- =============================================================================
DO $$
BEGIN
  INSERT INTO auth.users (
    id, email, encrypted_password, email_confirmed_at,
    created_at, updated_at, raw_user_meta_data, role, aud
  ) VALUES
    ('a1b2c3d4-0001-0001-0001-000000000001','arjun.mehta@example.com',
      crypt('Password@123',gen_salt('bf')),now(),now(),now(),
      '{"full_name":"Arjun Mehta"}'::jsonb,'authenticated','authenticated'),
    ('a1b2c3d4-0002-0002-0002-000000000002','priya.sharma@example.com',
      crypt('Password@123',gen_salt('bf')),now(),now(),now(),
      '{"full_name":"Priya Sharma"}'::jsonb,'authenticated','authenticated'),
    ('a1b2c3d4-0003-0003-0003-000000000003','sneha.patel@example.com',
      crypt('Password@123',gen_salt('bf')),now(),now(),now(),
      '{"full_name":"Sneha Patel"}'::jsonb,'authenticated','authenticated'),
    ('a1b2c3d4-0004-0004-0004-000000000004','rahul.singh@example.com',
      crypt('Password@123',gen_salt('bf')),now(),now(),now(),
      '{"full_name":"Rahul Singh"}'::jsonb,'authenticated','authenticated'),
    ('a1b2c3d4-0005-0005-0005-000000000005','kavya.nair@example.com',
      crypt('Password@123',gen_salt('bf')),now(),now(),now(),
      '{"full_name":"Kavya Nair"}'::jsonb,'authenticated','authenticated'),
    ('a1b2c3d4-0006-0006-0006-000000000006','vikram.joshi@example.com',
      crypt('Password@123',gen_salt('bf')),now(),now(),now(),
      '{"full_name":"Vikram Joshi"}'::jsonb,'authenticated','authenticated'),
    ('a1b2c3d4-0007-0007-0007-000000000007','admin@careercopilot.in',
      crypt('Admin@Secure123',gen_salt('bf')),now(),now(),now(),
      '{"full_name":"CC Admin"}'::jsonb,'authenticated','authenticated'),
    ('a1b2c3d4-0008-0008-0008-000000000008','deepa.reddy@example.com',
      crypt('Password@123',gen_salt('bf')),now(),now(),now(),
      '{"full_name":"Deepa Reddy"}'::jsonb,'authenticated','authenticated')
  ON CONFLICT (id) DO NOTHING;
END $$;

-- =============================================================================
-- SECTION 1: SUBSCRIPTION PLANS  (must exist before profiles)
-- =============================================================================
INSERT INTO subscription_plans (id, name, price_inr, razorpay_plan_id, features, is_active) VALUES
  ('free','Free',0,null,
   '{"study_plans_limit":1,"plan_regenerations_per_month":1,"notifications_limit":5,"eligibility_check":true,"ai_career_chat":false,"marketplace_access":false,"download_pdf_plan":false,"priority_support":false}'::jsonb,
   true),
  ('pro','Pro',199,'plan_PROdummyRazorpay01',
   '{"study_plans_limit":5,"plan_regenerations_per_month":10,"notifications_limit":null,"eligibility_check":true,"ai_career_chat":true,"marketplace_access":true,"download_pdf_plan":true,"priority_support":false}'::jsonb,
   true),
  ('elite','Elite',499,'plan_ELITEdummyRazorpay1',
   '{"study_plans_limit":null,"plan_regenerations_per_month":null,"notifications_limit":null,"eligibility_check":true,"ai_career_chat":true,"marketplace_access":true,"download_pdf_plan":true,"priority_support":true}'::jsonb,
   true)
ON CONFLICT (id) DO UPDATE SET
  name=EXCLUDED.name, price_inr=EXCLUDED.price_inr,
  features=EXCLUDED.features, is_active=EXCLUDED.is_active;

-- =============================================================================
-- SECTION 2: PROFILES
-- =============================================================================
INSERT INTO profiles (
  id, full_name, dob, gender, category, pwbd_status,
  domicile_state, nationality, ex_serviceman, govt_employee,
  phone, target_exam, target_type, career_stage,
  plan_id, is_admin, is_instructor, onboarding_completed, onboarding_step,
  instructor_bio, avatar_url
) VALUES
  ('a1b2c3d4-0001-0001-0001-000000000001','Arjun Mehta',
    '1997-03-15','male','general','none','Maharashtra','indian',false,false,
    '+91 9876543210','SEBI Grade A','regulatory','working',
    'pro',false,false,true,99,null,null),
  ('a1b2c3d4-0002-0002-0002-000000000002','Priya Sharma',
    '1998-07-22','female','obc','none','Delhi','indian',false,false,
    '+91 9812345678','RBI Grade B','banking','gap_year',
    'elite',false,false,true,99,null,null),
  ('a1b2c3d4-0003-0003-0003-000000000003','Sneha Patel',
    '2000-11-05','female','general','none','Gujarat','indian',false,false,
    '+91 9988776655','SSC CGL','central_govt','fresh_graduate',
    'free',false,false,true,99,null,null),
  ('a1b2c3d4-0004-0004-0004-000000000004','Rahul Singh',
    '1995-04-10','male','sc','none','Uttar Pradesh','indian',false,true,
    '+91 9123456789','UPSC CSE','central_govt','working',
    'pro',false,false,true,99,null,null),
  ('a1b2c3d4-0005-0005-0005-000000000005','Kavya Nair',
    '2001-09-18','female','obc','none','Kerala','indian',false,false,
    '+91 8877665544','IBPS PO','banking','student',
    'free',false,false,true,99,null,null),
  ('a1b2c3d4-0006-0006-0006-000000000006','Vikram Joshi',
    '1990-01-30','male','general','none','Rajasthan','indian',false,false,
    '+91 9001234567','NABARD Grade A','banking','gap_year',
    'elite',false,true,true,99,
    'Ex-RBI Grade B officer, 8 yrs experience. Cleared RBI Grade B 2016, SEBI Grade A 2018.',null),
  ('a1b2c3d4-0007-0007-0007-000000000007','CC Admin',
    '1985-06-01','male','general','none','Delhi','indian',false,false,
    '+91 9000000001',null,null,'working',
    'elite',true,false,true,99,null,null),
  ('a1b2c3d4-0008-0008-0008-000000000008','Deepa Reddy',
    '1993-12-12','female','st','none','Telangana','indian',false,false,
    '+91 9876501234','SEBI Grade A','regulatory','working',
    'pro',false,true,true,99,
    'CA and CFA charterholder. Cleared SEBI Grade A 2020 (Finance stream).',null)
ON CONFLICT (id) DO UPDATE SET
  full_name=EXCLUDED.full_name, plan_id=EXCLUDED.plan_id,
  is_admin=EXCLUDED.is_admin, is_instructor=EXCLUDED.is_instructor,
  onboarding_completed=EXCLUDED.onboarding_completed;

-- =============================================================================
-- SECTION 3: ASPIRANT TABLES
-- =============================================================================
INSERT INTO aspirant_education
  (user_id, level, degree, stream, institution, graduation_year, percentage, cgpa, is_completed)
VALUES
  ('a1b2c3d4-0001-0001-0001-000000000001','10th',null,null,'CBSE',2013,91.2,null,true),
  ('a1b2c3d4-0001-0001-0001-000000000001','12th',null,'Commerce','CBSE',2015,88.6,null,true),
  ('a1b2c3d4-0001-0001-0001-000000000001','graduate','B.Com (Hons)','Finance','Delhi University',2018,72.4,null,true),
  ('a1b2c3d4-0001-0001-0001-000000000001','postgraduate','MBA','Finance','IIM Lucknow',2020,null,3.6,true),
  ('a1b2c3d4-0002-0002-0002-000000000002','10th',null,null,'UP Board',2014,85.0,null,true),
  ('a1b2c3d4-0002-0002-0002-000000000002','12th',null,'Science','UP Board',2016,79.2,null,true),
  ('a1b2c3d4-0002-0002-0002-000000000002','graduate','B.Sc','Economics','Delhi University',2019,68.5,null,true),
  ('a1b2c3d4-0002-0002-0002-000000000002','postgraduate','M.A','Economics','JNU',2021,74.8,null,true),
  ('a1b2c3d4-0003-0003-0003-000000000003','10th',null,null,'GSEB',2016,82.3,null,true),
  ('a1b2c3d4-0003-0003-0003-000000000003','12th',null,'Commerce','GSEB',2018,76.1,null,true),
  ('a1b2c3d4-0003-0003-0003-000000000003','graduate','B.Com','Accounting','Gujarat University',2021,69.3,null,true),
  ('a1b2c3d4-0004-0004-0004-000000000004','10th',null,null,'UP Board',2011,72.0,null,true),
  ('a1b2c3d4-0004-0004-0004-000000000004','12th',null,'Arts','UP Board',2013,68.4,null,true),
  ('a1b2c3d4-0004-0004-0004-000000000004','graduate','B.A','History','Allahabad University',2016,65.8,null,true),
  ('a1b2c3d4-0005-0005-0005-000000000005','10th',null,null,'CBSE',2017,94.6,null,true),
  ('a1b2c3d4-0005-0005-0005-000000000005','12th',null,'Commerce','CBSE',2019,91.0,null,true),
  ('a1b2c3d4-0005-0005-0005-000000000005','graduate','B.Com (Hons)','Finance','Cochin University',2023,null,8.9,false),
  ('a1b2c3d4-0006-0006-0006-000000000006','10th',null,null,'RBSE',2006,88.0,null,true),
  ('a1b2c3d4-0006-0006-0006-000000000006','12th',null,'Science','RBSE',2008,84.2,null,true),
  ('a1b2c3d4-0006-0006-0006-000000000006','graduate','B.E','Electronics','Rajasthan University',2012,71.0,null,true),
  ('a1b2c3d4-0006-0006-0006-000000000006','postgraduate','MBA','Finance','IIM Ahmedabad',2014,null,3.8,true),
  ('a1b2c3d4-0008-0008-0008-000000000008','10th',null,null,'TSBIE',2009,95.0,null,true),
  ('a1b2c3d4-0008-0008-0008-000000000008','12th',null,'Commerce','TSBIE',2011,93.2,null,true),
  ('a1b2c3d4-0008-0008-0008-000000000008','graduate','B.Com (Hons)','Finance','Osmania University',2014,82.0,null,true),
  ('a1b2c3d4-0008-0008-0008-000000000008','postgraduate','CA Final','Chartered Accountancy','ICAI',2017,null,null,true)
ON CONFLICT DO NOTHING;

INSERT INTO aspirant_experience (user_id, sector, role, organization, start_date, end_date, years_experience) VALUES
  ('a1b2c3d4-0001-0001-0001-000000000001','FINANCE','Research Analyst','Kotak Securities','2020-07-01',null,3.8),
  ('a1b2c3d4-0004-0004-0004-000000000004','GOVT','Junior Clerk','District Collectorate, Allahabad','2017-03-01',null,7.2),
  ('a1b2c3d4-0006-0006-0006-000000000006','BANKING','Grade B Officer','Reserve Bank of India','2014-08-01','2022-06-30',7.9),
  ('a1b2c3d4-0006-0006-0006-000000000006','FINANCE','Financial Educator','Self-employed','2022-07-01',null,1.8),
  ('a1b2c3d4-0008-0008-0008-000000000008','FINANCE','Portfolio Manager','HDFC AMC','2017-06-01',null,6.9)
ON CONFLICT DO NOTHING;

INSERT INTO aspirant_certifications (user_id, certification_name, issuing_body, year_completed, is_active) VALUES
  ('a1b2c3d4-0001-0001-0001-000000000001','NISM Series VIII (Equity Derivatives)','NISM',2021,true),
  ('a1b2c3d4-0001-0001-0001-000000000001','CFA Level I','CFA Institute',2022,true),
  ('a1b2c3d4-0002-0002-0002-000000000002','NISM Series V-A (MF Distributor)','NISM',2022,true),
  ('a1b2c3d4-0006-0006-0006-000000000006','CFA Charterholder','CFA Institute',2019,true),
  ('a1b2c3d4-0006-0006-0006-000000000006','FRM Part I & II','GARP',2018,true),
  ('a1b2c3d4-0008-0008-0008-000000000008','CA Final','ICAI',2017,true),
  ('a1b2c3d4-0008-0008-0008-000000000008','CFA Charterholder','CFA Institute',2020,true)
ON CONFLICT DO NOTHING;

INSERT INTO aspirant_preferences (user_id, preferred_sectors, preferred_states, target_exams, willing_to_relocate) VALUES
  ('a1b2c3d4-0001-0001-0001-000000000001',ARRAY['REGULATORY','BANKING'],ARRAY['Maharashtra','Delhi','Karnataka'],ARRAY['SEBI Grade A','RBI Grade B','NABARD Grade A'],true),
  ('a1b2c3d4-0002-0002-0002-000000000002',ARRAY['BANKING','REGULATORY'],ARRAY['All India'],ARRAY['RBI Grade B','SEBI Grade A'],true),
  ('a1b2c3d4-0003-0003-0003-000000000003',ARRAY['CENTRAL_GOVT'],ARRAY['Gujarat','Rajasthan','Maharashtra'],ARRAY['SSC CGL','SSC CHSL'],false),
  ('a1b2c3d4-0004-0004-0004-000000000004',ARRAY['CENTRAL_GOVT'],ARRAY['All India'],ARRAY['UPSC CSE'],true),
  ('a1b2c3d4-0005-0005-0005-000000000005',ARRAY['BANKING'],ARRAY['Kerala','Tamil Nadu','Karnataka'],ARRAY['IBPS PO','SBI PO','RBI Grade B'],true),
  ('a1b2c3d4-0006-0006-0006-000000000006',ARRAY['BANKING','REGULATORY'],ARRAY['All India'],ARRAY['NABARD Grade A','RBI Grade B','SEBI Grade A'],true)
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO aspirant_reservations (user_id, category, sub_category, is_pwd, is_ex_serviceman, is_jk_domicile, age_relaxation_extra_years) VALUES
  ('a1b2c3d4-0001-0001-0001-000000000001','general',null,false,false,false,0),
  ('a1b2c3d4-0002-0002-0002-000000000002','obc','OBC-NCL',false,false,false,3),
  ('a1b2c3d4-0003-0003-0003-000000000003','general',null,false,false,false,0),
  ('a1b2c3d4-0004-0004-0004-000000000004','sc',null,false,false,false,5),
  ('a1b2c3d4-0005-0005-0005-000000000005','obc','OBC-NCL',false,false,false,3),
  ('a1b2c3d4-0006-0006-0006-000000000006','general',null,false,false,false,0)
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO aspirant_location (user_id, state, district, is_rural, domicile_certificate) VALUES
  ('a1b2c3d4-0001-0001-0001-000000000001','Maharashtra','Mumbai',false,true),
  ('a1b2c3d4-0002-0002-0002-000000000002','Delhi','South Delhi',false,true),
  ('a1b2c3d4-0003-0003-0003-000000000003','Gujarat','Ahmedabad',false,true),
  ('a1b2c3d4-0004-0004-0004-000000000004','Uttar Pradesh','Allahabad',false,true),
  ('a1b2c3d4-0005-0005-0005-000000000005','Kerala','Kochi',false,true)
ON CONFLICT (user_id) DO NOTHING;

-- =============================================================================
-- SECTION 4: RECRUITMENT DATA — all UUIDs, FK-consistent via DO block
-- =============================================================================
DO $$
DECLARE
  -- ── Organisation UUIDs ──────────────────────────────────────────────────────
  o_sebi   uuid := 'b0000001-0000-0000-0000-000000000001';
  o_rbi    uuid := 'b0000001-0000-0000-0000-000000000002';
  o_nabard uuid := 'b0000001-0000-0000-0000-000000000003';
  o_ssc    uuid := 'b0000001-0000-0000-0000-000000000004';
  o_ibps   uuid := 'b0000001-0000-0000-0000-000000000005';
  o_upsc   uuid := 'b0000001-0000-0000-0000-000000000006';
  o_sbi    uuid := 'b0000001-0000-0000-0000-000000000007';
  o_irdai  uuid := 'b0000001-0000-0000-0000-000000000008';
  o_lic    uuid := 'b0000001-0000-0000-0000-000000000009';
  o_rrb    uuid := 'b0000001-0000-0000-0000-000000000010';
  o_mpsc   uuid := 'b0000001-0000-0000-0000-000000000011';
  o_kpsc   uuid := 'b0000001-0000-0000-0000-000000000012';

  -- ── Recruitment UUIDs ───────────────────────────────────────────────────────
  r_sebi25   uuid := 'c0000001-0000-0000-0000-000000000001';
  r_rbi25    uuid := 'c0000001-0000-0000-0000-000000000002';
  r_nab25    uuid := 'c0000001-0000-0000-0000-000000000003';
  r_ssc24    uuid := 'c0000001-0000-0000-0000-000000000004';
  r_ibps25   uuid := 'c0000001-0000-0000-0000-000000000005';
  r_upsc25   uuid := 'c0000001-0000-0000-0000-000000000006';
  r_sbi25    uuid := 'c0000001-0000-0000-0000-000000000007';
  r_irdai25  uuid := 'c0000001-0000-0000-0000-000000000008';
  r_lic25    uuid := 'c0000001-0000-0000-0000-000000000009';
  r_rrb25    uuid := 'c0000001-0000-0000-0000-000000000010';
  r_ibpscl25 uuid := 'c0000001-0000-0000-0000-000000000011';
  r_sbicl25  uuid := 'c0000001-0000-0000-0000-000000000012';
  r_sscgl25  uuid := 'c0000001-0000-0000-0000-000000000013';

  -- ── Post UUIDs ──────────────────────────────────────────────────────────────
  p_sebi_gen uuid := 'd0000001-0000-0000-0000-000000000001';
  p_sebi_law uuid := 'd0000001-0000-0000-0000-000000000002';
  p_sebi_it  uuid := 'd0000001-0000-0000-0000-000000000003';
  p_sebi_res uuid := 'd0000001-0000-0000-0000-000000000004';
  p_rbi_gen  uuid := 'd0000001-0000-0000-0000-000000000005';
  p_rbi_depr uuid := 'd0000001-0000-0000-0000-000000000006';
  p_rbi_dsim uuid := 'd0000001-0000-0000-0000-000000000007';
  p_nab_gen  uuid := 'd0000001-0000-0000-0000-000000000008';
  p_nab_agri uuid := 'd0000001-0000-0000-0000-000000000009';
  p_ssc_ins  uuid := 'd0000001-0000-0000-0000-000000000010';
  p_ssc_aso  uuid := 'd0000001-0000-0000-0000-000000000011';
  p_ssc_iti  uuid := 'd0000001-0000-0000-0000-000000000012';
  p_upsc_ias uuid := 'd0000001-0000-0000-0000-000000000013';
  p_upsc_ips uuid := 'd0000001-0000-0000-0000-000000000014';
  p_upsc_ifs uuid := 'd0000001-0000-0000-0000-000000000015';
  p_ibps_po  uuid := 'd0000001-0000-0000-0000-000000000016';
  p_lic_aao  uuid := 'd0000001-0000-0000-0000-000000000017';
  p_sscgl_ins uuid := 'd0000001-0000-0000-0000-000000000018';

BEGIN

-- ── ORGANISATIONS ─────────────────────────────────────────────────────────────
INSERT INTO organizations (id, name, type, state) VALUES
  (o_sebi,  'Securities and Exchange Board of India',             'Regulatory',   null),
  (o_rbi,   'Reserve Bank of India',                              'Banking',      null),
  (o_nabard,'National Bank for Agriculture and Rural Development','Banking',      null),
  (o_ssc,   'Staff Selection Commission',                         'Central Govt', null),
  (o_ibps,  'Institute of Banking Personnel Selection',           'Banking',      null),
  (o_upsc,  'Union Public Service Commission',                    'Central Govt', null),
  (o_sbi,   'State Bank of India',                                'Banking',      null),
  (o_irdai, 'Insurance Regulatory and Development Authority of India','Regulatory',null),
  (o_lic,   'Life Insurance Corporation of India',                'PSU',          null),
  (o_rrb,   'Railway Recruitment Board',                          'Central Govt', null),
  (o_mpsc,  'Maharashtra Public Service Commission',              'State Govt',   'Maharashtra'),
  (o_kpsc,  'Kerala Public Service Commission',                   'State Govt',   'Kerala')
ON CONFLICT (id) DO NOTHING;

-- ── RECRUITMENTS ──────────────────────────────────────────────────────────────
INSERT INTO recruitments
  (id, organization_id, name, year, notification_date, apply_start_date, apply_end_date, status)
VALUES
  (r_sebi25,   o_sebi,  'SEBI Grade A Officer 2025',                     2025,'2025-01-10','2025-01-15','2025-02-14','open'),
  (r_rbi25,    o_rbi,   'RBI Grade B DR (General) 2025',                 2025,'2025-02-01','2025-02-10','2025-03-10','open'),
  (r_nab25,    o_nabard,'NABARD Grade A Development Assistant 2025',      2025,'2025-03-15','2025-03-20','2025-04-20','upcoming'),
  (r_ssc24,    o_ssc,   'SSC CGL 2024',                                   2024,'2024-06-24','2024-06-24','2024-07-24','closed'),
  (r_ibps25,   o_ibps,  'IBPS PO XIV 2025',                               2025,'2025-06-01','2025-06-07','2025-06-27','upcoming'),
  (r_upsc25,   o_upsc,  'UPSC Civil Services Examination 2025',           2025,'2025-01-22','2025-02-01','2025-02-21','open'),
  (r_sbi25,    o_sbi,   'SBI PO 2025',                                    2025,'2025-04-01','2025-04-07','2025-04-27','upcoming'),
  (r_irdai25,  o_irdai, 'IRDAI Assistant Manager (Grade A) 2025',         2025,'2025-04-15','2025-04-20','2025-05-15','upcoming'),
  (r_lic25,    o_lic,   'LIC AAO Generalist 2025',                        2025,'2025-01-20','2025-01-25','2025-02-15','open'),
  (r_rrb25,    o_rrb,   'RRB Group D 2025',                               2025,'2025-03-01','2025-05-10','2025-06-09','upcoming'),
  (r_ibpscl25, o_ibps,  'IBPS Clerk XV 2025',                             2025,'2025-07-01','2025-07-01','2025-07-21','upcoming'),
  (r_sbicl25,  o_sbi,   'SBI Clerk 2025',                                 2025,'2025-09-01','2025-09-07','2025-09-28','upcoming'),
  (r_sscgl25,  o_ssc,   'SSC CGL 2025',                                   2025,'2025-06-24','2025-06-24','2025-07-24','upcoming')
ON CONFLICT (id) DO NOTHING;

-- ── EXAM STAGES ───────────────────────────────────────────────────────────────
INSERT INTO exam_stages (recruitment_id, stage_name, stage_order) VALUES
  (r_sebi25,'Phase I — Objective Paper',1),
  (r_sebi25,'Phase II — Descriptive Paper',2),
  (r_sebi25,'Phase III — Interview',3),
  (r_rbi25, 'Phase I — Online Examination',1),
  (r_rbi25, 'Phase II — Online Examination',2),
  (r_rbi25, 'Phase III — Interview',3),
  (r_nab25, 'Phase I — Preliminary Exam',1),
  (r_nab25, 'Phase II — Main Exam',2),
  (r_nab25, 'Phase III — Interview',3),
  (r_ssc24, 'Tier I — Computer Based Test',1),
  (r_ssc24, 'Tier II — Computer Based Test',2),
  (r_ssc24, 'Tier III — Descriptive Paper',3),
  (r_upsc25,'Prelims',1),
  (r_upsc25,'Mains',2),
  (r_upsc25,'Personality Test (Interview)',3),
  (r_ibps25,'Preliminary Examination',1),
  (r_ibps25,'Main Examination',2),
  (r_ibps25,'Interview',3)
ON CONFLICT DO NOTHING;

-- ── POSTS ─────────────────────────────────────────────────────────────────────
INSERT INTO posts (id, recruitment_id, post_name, group_type, pay_level, job_type) VALUES
  (p_sebi_gen, r_sebi25,'Officer Grade A (General)',    'A','Level 14 (₹44,500–₹89,150)','Permanent'),
  (p_sebi_law, r_sebi25,'Officer Grade A (Legal)',      'A','Level 14 (₹44,500–₹89,150)','Permanent'),
  (p_sebi_it,  r_sebi25,'Officer Grade A (IT)',         'A','Level 14 (₹44,500–₹89,150)','Permanent'),
  (p_sebi_res, r_sebi25,'Officer Grade A (Research)',   'A','Level 14 (₹44,500–₹89,150)','Permanent'),
  (p_rbi_gen,  r_rbi25, 'Grade B DR — General',        'B','Level 12 (₹55,200–₹1,01,400)','Permanent'),
  (p_rbi_depr, r_rbi25, 'Grade B DR — DEPR',           'B','Level 12 (₹55,200–₹1,01,400)','Permanent'),
  (p_rbi_dsim, r_rbi25, 'Grade B DR — DSIM',           'B','Level 12 (₹55,200–₹1,01,400)','Permanent'),
  (p_nab_gen,  r_nab25, 'Assistant Manager Grade A — General',    'A','NABARD Scale I (₹44,500+)','Permanent'),
  (p_nab_agri, r_nab25, 'Assistant Manager Grade A — Agriculture','A','NABARD Scale I (₹44,500+)','Permanent'),
  (p_ssc_ins,  r_ssc24, 'Inspector (Central Excise)',   'B','Pay Level 7 (₹44,900–₹1,42,400)','Permanent'),
  (p_ssc_aso,  r_ssc24, 'Assistant Section Officer',   'B','Pay Level 7 (₹44,900–₹1,42,400)','Permanent'),
  (p_ssc_iti,  r_ssc24, 'Income Tax Inspector',        'B','Pay Level 7 (₹44,900–₹1,42,400)','Permanent'),
  (p_upsc_ias, r_upsc25,'Indian Administrative Service','A','Pay Matrix Level 10+','Permanent'),
  (p_upsc_ips, r_upsc25,'Indian Police Service',        'A','Pay Matrix Level 10+','Permanent'),
  (p_upsc_ifs, r_upsc25,'Indian Foreign Service',       'A','Pay Matrix Level 10+','Permanent'),
  (p_ibps_po,  r_ibps25,'Probationary Officer / Management Trainee','B','JMGS-I (₹48,480–₹85,920)','Permanent'),
  (p_lic_aao,  r_lic25, 'Assistant Administrative Officer','B','Level 9 (₹53,600–₹1,27,100)','Permanent'),
  (p_sscgl_ins,r_sscgl25,'Inspector Posts 2025',        'B','Pay Level 7 (₹44,900+)','Permanent')
ON CONFLICT (id) DO NOTHING;

-- ── VACANCIES ─────────────────────────────────────────────────────────────────
INSERT INTO vacancies (post_id, category, vacancy_count, state) VALUES
  (p_sebi_gen,'UR',60,null),(p_sebi_gen,'OBC',32,null),(p_sebi_gen,'SC',18,null),
  (p_sebi_gen,'ST',10,null),(p_sebi_gen,'EWS',15,null),
  (p_sebi_law,'UR',10,null),(p_sebi_law,'OBC',5,null),(p_sebi_law,'SC',3,null),
  (p_rbi_gen, 'UR',102,null),(p_rbi_gen,'OBC',55,null),(p_rbi_gen,'SC',30,null),
  (p_rbi_gen, 'ST',15,null),(p_rbi_gen,'EWS',20,null),
  (p_nab_gen, 'UR',100,null),(p_nab_gen,'OBC',54,null),(p_nab_gen,'SC',30,null),
  (p_nab_gen, 'ST',16,null),
  (p_ssc_ins, 'UR',150,null),(p_ssc_ins,'OBC',81,null),(p_ssc_ins,'SC',45,null),
  (p_ssc_ins, 'ST',23,null),
  (p_ibps_po, 'UR',2200,null),(p_ibps_po,'OBC',1188,null),(p_ibps_po,'SC',660,null),
  (p_ibps_po, 'ST',330,null),(p_ibps_po,'EWS',440,null),
  (p_sscgl_ins,'UR',7000,null),(p_sscgl_ins,'OBC',3780,null),
  (p_sscgl_ins,'SC',2100,null),(p_sscgl_ins,'ST',1050,null),(p_sscgl_ins,'EWS',1400,null)
ON CONFLICT DO NOTHING;

-- ── AGE CRITERIA ──────────────────────────────────────────────────────────────
INSERT INTO age_criteria (post_id, min_age, max_age, cutoff_date) VALUES
  (p_sebi_gen,21,30,'2025-02-14'),
  (p_sebi_law,21,30,'2025-02-14'),
  (p_sebi_it, 21,30,'2025-02-14'),
  (p_rbi_gen, 21,30,'2025-03-10'),
  (p_rbi_depr,21,30,'2025-03-10'),
  (p_nab_gen, 21,30,'2025-04-20'),
  (p_ssc_ins, 18,27,'2024-07-24'),
  (p_upsc_ias,21,32,'2025-08-01'),
  (p_ibps_po, 20,30,'2025-06-27'),
  (p_lic_aao, 21,30,'2025-02-15'),
  (p_sscgl_ins,18,32,'2025-07-24')
ON CONFLICT DO NOTHING;

-- ── EDUCATION CRITERIA ────────────────────────────────────────────────────────
INSERT INTO education_criteria (post_id, min_qualification_level, min_percentage, allowed_disciplines) VALUES
  (p_sebi_gen,'graduate',    60.0,'["Any discipline from a recognised university"]'::jsonb),
  (p_sebi_law,'graduate',    55.0,'["Law (LLB / LLM)", "Any law degree from a recognised university"]'::jsonb),
  (p_sebi_it, 'graduate',    60.0,'["B.E/B.Tech (CS/IT)", "MCA", "M.Sc (Computer Science)"]'::jsonb),
  (p_rbi_gen, 'graduate',    60.0,'["Any discipline from a recognised university"]'::jsonb),
  (p_rbi_depr,'postgraduate',55.0,'["Economics","Statistics","Econometrics","Finance","Management"]'::jsonb),
  (p_nab_gen, 'graduate',    50.0,'["Any discipline from a recognised university"]'::jsonb),
  (p_ssc_ins, 'graduate',    null,'["Any discipline from a recognised university"]'::jsonb),
  (p_upsc_ias,'graduate',    null,'["Any discipline from a recognised university"]'::jsonb),
  (p_ibps_po, 'graduate',    60.0,'["Any discipline from a recognised university"]'::jsonb),
  (p_sscgl_ins,'graduate',   null,'["Any discipline from a recognised university"]'::jsonb)
ON CONFLICT DO NOTHING;

-- ── ATTEMPT LIMITS ────────────────────────────────────────────────────────────
INSERT INTO attempt_limits (post_id, category, max_attempts) VALUES
  (p_rbi_gen, 'general',6),(p_rbi_gen,'obc',9),
  (p_rbi_gen, 'sc',null),(p_rbi_gen,'st',null),
  (p_upsc_ias,'general',6),(p_upsc_ias,'obc',9),(p_upsc_ias,'ews',9),
  (p_upsc_ias,'sc',null),(p_upsc_ias,'st',null),
  (p_ibps_po, 'general',null)
ON CONFLICT DO NOTHING;

-- ── SALARY DETAILS ────────────────────────────────────────────────────────────
INSERT INTO salary_details (post_id, pay_level, basic_pay_min, basic_pay_max, grade_pay, in_hand_estimate) VALUES
  (p_sebi_gen,'Level 14',      44500, 89150,  null,'₹1.2L–1.5L/mo (CTC ~₹22L/yr)'),
  (p_rbi_gen, 'Level 12',      55200, 101400, null,'₹1.5L–2.0L/mo (CTC ~₹28L/yr)'),
  (p_nab_gen, 'NABARD Scale I',44500, 89000,  null,'₹1.1L–1.4L/mo'),
  (p_ssc_ins, 'Level 7',       44900, 142400, 4600,'₹55,000–75,000/mo'),
  (p_upsc_ias,'Level 10',      56100, 177500, null,'₹80,000–1.2L/mo (varies by posting)'),
  (p_ibps_po, 'JMGS-I',        48480, 85920,  null,'₹65,000–85,000/mo'),
  (p_lic_aao, 'Level 9',       53600, 127100, null,'₹75,000–95,000/mo (with allowances)')
ON CONFLICT DO NOTHING;

-- ── ELIGIBILITY RESULTS ───────────────────────────────────────────────────────
INSERT INTO eligibility_results (user_id, post_id, recruitment_id, is_eligible, fail_reasons) VALUES
  ('a1b2c3d4-0001-0001-0001-000000000001',p_sebi_gen,r_sebi25,true, ARRAY[]::text[]),
  ('a1b2c3d4-0002-0002-0002-000000000002',p_rbi_gen, r_rbi25, true, ARRAY[]::text[]),
  ('a1b2c3d4-0003-0003-0003-000000000003',p_ssc_ins, r_ssc24, true, ARRAY[]::text[]),
  ('a1b2c3d4-0004-0004-0004-000000000004',p_upsc_ias,r_upsc25,true, ARRAY[]::text[]),
  ('a1b2c3d4-0005-0005-0005-000000000005',p_ibps_po, r_ibps25,true, ARRAY[]::text[]),
  ('a1b2c3d4-0001-0001-0001-000000000001',p_sebi_law,r_sebi25,false,
    ARRAY['Education: Law degree required. You have: MBA (Finance). Required: LLB/LLM.']),
  ('a1b2c3d4-0005-0005-0005-000000000005',p_rbi_depr,r_rbi25, false,
    ARRAY['Education: Postgraduate required. You have: B.Com (pursuing). Required: postgraduate.'])
ON CONFLICT DO NOTHING;

-- ── USER TARGETS ──────────────────────────────────────────────────────────────
INSERT INTO user_targets (user_id, recruitment_id, status) VALUES
  ('a1b2c3d4-0001-0001-0001-000000000001',r_sebi25,'applied'),
  ('a1b2c3d4-0001-0001-0001-000000000001',r_rbi25, 'interested'),
  ('a1b2c3d4-0002-0002-0002-000000000002',r_rbi25, 'applied'),
  ('a1b2c3d4-0002-0002-0002-000000000002',r_sebi25,'interested'),
  ('a1b2c3d4-0003-0003-0003-000000000003',r_ssc24, 'appeared'),
  ('a1b2c3d4-0004-0004-0004-000000000004',r_upsc25,'applied'),
  ('a1b2c3d4-0005-0005-0005-000000000005',r_ibps25,'interested'),
  ('a1b2c3d4-0006-0006-0006-000000000006',r_nab25, 'applied')
ON CONFLICT DO NOTHING;

-- ── USER EXAM ATTEMPTS ────────────────────────────────────────────────────────
INSERT INTO user_exam_attempts (user_id, recruitment_id, attempts_used) VALUES
  ('a1b2c3d4-0001-0001-0001-000000000001',r_sebi25,2),
  ('a1b2c3d4-0002-0002-0002-000000000002',r_rbi25, 1),
  ('a1b2c3d4-0003-0003-0003-000000000003',r_ssc24, 1),
  ('a1b2c3d4-0004-0004-0004-000000000004',r_upsc25,3),
  ('a1b2c3d4-0006-0006-0006-000000000006',r_nab25, 1)
ON CONFLICT DO NOTHING;

-- ── STUDY PLANS ───────────────────────────────────────────────────────────────
DECLARE
  plan_sebi  uuid := 'e0000001-0000-0000-0000-000000000001';
  plan_rbi   uuid := 'e0000001-0000-0000-0000-000000000002';
  plan_ssc   uuid := 'e0000001-0000-0000-0000-000000000003';
  plan_upsc  uuid := 'e0000001-0000-0000-0000-000000000004';
  plan_ibps  uuid := 'e0000001-0000-0000-0000-000000000005';
BEGIN
  INSERT INTO study_plans (id, user_id, recruitment_id, exam_name, target_date, daily_hours, weekly_days, current_level, status) VALUES
    (plan_sebi,'a1b2c3d4-0001-0001-0001-000000000001',r_sebi25,'SEBI Grade A','2025-02-14',4,6,'intermediate','active'),
    (plan_rbi, 'a1b2c3d4-0002-0002-0002-000000000002',r_rbi25, 'RBI Grade B', '2025-03-10',6,6,'advanced','active'),
    (plan_ssc, 'a1b2c3d4-0003-0003-0003-000000000003',r_ssc24, 'SSC CGL',     '2024-07-24',3,5,'beginner','archived'),
    (plan_upsc,'a1b2c3d4-0004-0004-0004-000000000004',r_upsc25,'UPSC CSE',    '2025-08-01',8,7,'intermediate','active'),
    (plan_ibps,'a1b2c3d4-0005-0005-0005-000000000005',r_ibps25,'IBPS PO',     '2025-06-27',3,5,'beginner','active')
  ON CONFLICT (id) DO NOTHING;

  -- ── STUDY WEEKS ───────────────────────────────────────────────────────────────
  INSERT INTO study_weeks (plan_id, week_number, title, focus_area, description, topics, daily_tasks, resources, status, completed_at) VALUES
    (plan_sebi,1,'Securities Law Foundations','Securities Laws & SEBI Act',
      'Build a strong foundation in the SEBI Act 1992, SCRA 1956, and core regulatory framework.',
      ARRAY['SEBI Act 1992 (all chapters)','SCRA 1956','Depositories Act 1996','Prevention of Insider Trading'],
      '[{"day":"Monday","task":"SEBI Act Chapters 1–5 + 20 MCQs"},{"day":"Tuesday","task":"SEBI Act Chapters 6–11 + PYQs"},{"day":"Wednesday","task":"SCRA 1956 full read + notes"},{"day":"Thursday","task":"Depositories Act + 30 MCQs"},{"day":"Friday","task":"Insider Trading Regulations — full"},{"day":"Saturday","task":"Full mock test (Securities Laws)"}]'::jsonb,
      '[{"title":"SEBI Annual Report 2024","url":"https://sebi.gov.in","type":"official"},{"title":"ICSI Study Material — Securities Law","type":"book"},{"title":"Vision IAS — Securities Market Basics","type":"notes"}]'::jsonb,
      'completed',now() - interval '13 days'),
    (plan_sebi,2,'Capital Markets & Instruments','Capital Markets',
      'Master equity, debt, derivatives markets and their regulatory framework under SEBI.',
      ARRAY['Primary market — IPO/FPO/Rights Issue','Secondary market — Exchanges & trading','Derivatives — Futures & Options basics','Mutual Funds — SEBI MF Regulations'],
      '[{"day":"Monday","task":"IPO/FPO regulations + ASBA mechanism"},{"day":"Tuesday","task":"Listing obligations (LODR) — key provisions"},{"day":"Wednesday","task":"Derivatives basics + F&O settlement"},{"day":"Thursday","task":"Mutual Fund regulation — NAV/AUM/categories"},{"day":"Friday","task":"30 MCQs + previous year paper analysis"},{"day":"Saturday","task":"Topic-wise mock: Capital Markets"}]'::jsonb,
      '[{"title":"SEBI LODR Regulations 2015","url":"https://sebi.gov.in","type":"official"},{"title":"NSE Learning Module — Capital Markets","type":"online"},{"title":"NISM Series VIII Study Material","type":"book"}]'::jsonb,
      'completed',now() - interval '6 days'),
    (plan_sebi,3,'Finance & Accounts','Finance & Accounting',
      'Financial statements analysis, ratio analysis, and corporate finance fundamentals.',
      ARRAY['Financial statements — P&L, Balance Sheet, Cash Flow','Ratio analysis (liquidity, profitability, leverage)','Time value of money','Valuation methods — DCF, PE, EV/EBITDA'],
      '[{"day":"Monday","task":"Balance sheet reading + 3-statement model"},{"day":"Tuesday","task":"All key financial ratios — formula + interpretation"},{"day":"Wednesday","task":"TVM — PV, FV, annuity, NPV, IRR"},{"day":"Thursday","task":"Valuation — DCF walkthrough + PE multiple"},{"day":"Friday","task":"35 MCQs (Finance) + error analysis"},{"day":"Saturday","task":"Full mock test (Finance & Accounts)"}]'::jsonb,
      '[{"title":"Prasanna Chandra — Financial Management","type":"book"},{"title":"ICAI Study Material — Accounts","type":"book"}]'::jsonb,
      'in_progress',null),
    (plan_upsc,1,'Polity & Governance Foundations','Indian Polity',
      'Complete the Constitution systematically — Preamble, Fundamental Rights, DPSP, and Parliament.',
      ARRAY['Preamble + Fundamental Rights (Art 12–35)','DPSP (Art 36–51)','Fundamental Duties','Parliament — composition, sessions, bills'],
      '[{"day":"Monday","task":"Preamble + FR Articles 12–22 with cases"},{"day":"Tuesday","task":"FR Articles 23–35 + Article 32 in detail"},{"day":"Wednesday","task":"DPSP + Fundamental Duties — compare with FR"},{"day":"Thursday","task":"Parliament — Rajya Sabha, Lok Sabha structure"},{"day":"Friday","task":"Parliament — sessions, bills, joint sitting"},{"day":"Saturday","task":"Polity MCQ practice (50 Qs) + answer writing (2 Qs)"},{"day":"Sunday","task":"Rest + light revision"}]'::jsonb,
      '[{"title":"M. Laxmikanth — Indian Polity (6th Ed)","type":"book"},{"title":"Constitution of India — Bare Act","type":"official"},{"title":"Vision IAS Polity Notes","type":"notes"}]'::jsonb,
      'completed',now() - interval '28 days'),
    (plan_upsc,2,'History — Ancient & Medieval','History',
      'Indus Valley to Mughal period — art, culture, economy, and polity for Prelims and Mains.',
      ARRAY['Indus Valley Civilisation','Vedic Period','Maurya and Gupta Empires','Sultanate and Mughal periods'],
      '[{"day":"Monday","task":"IVC — seals, town planning, trade"},{"day":"Tuesday","task":"Vedic period — Rig Veda, Sabha, Samiti"},{"day":"Wednesday","task":"Maurya — Ashoka, Arthashastra, Edicts"},{"day":"Thursday","task":"Gupta — Golden Age, science, literature"},{"day":"Friday","task":"Sultanate — Delhi, administrative system"},{"day":"Saturday","task":"Mughal — Akbar policy, Mansabdari + MCQs (40)"},{"day":"Sunday","task":"Rest + newspaper reading"}]'::jsonb,
      '[{"title":"RS Sharma — Ancient India (NCERT)","type":"book"},{"title":"Satish Chandra — Medieval India (NCERT)","type":"book"}]'::jsonb,
      'in_progress',null)
  ON CONFLICT DO NOTHING;

  -- ── STUDY LOGS ────────────────────────────────────────────────────────────────
  INSERT INTO study_logs (user_id, plan_id, logged_date, hours_studied, topics_covered, notes, mood) VALUES
    ('a1b2c3d4-0001-0001-0001-000000000001',plan_sebi,current_date-14,4.5,ARRAY['SEBI Act Chapters 1–5','PYQ analysis'],'Covered definitions well. Need to revisit penalties chapter.','focused'),
    ('a1b2c3d4-0001-0001-0001-000000000001',plan_sebi,current_date-13,3.0,ARRAY['SEBI Act Chapters 6–11','SCRA overview'],'Chapters 8 and 9 are tricky — powers of SEBI.','tired'),
    ('a1b2c3d4-0001-0001-0001-000000000001',plan_sebi,current_date-12,4.0,ARRAY['Depositories Act','Insider Trading Regs'],'Insider Trading regulations are very important for SEBI exam.','focused'),
    ('a1b2c3d4-0001-0001-0001-000000000001',plan_sebi,current_date-10,4.0,ARRAY['IPO regulations','ASBA mechanism','Book building'],'IPO pricing and allocation process is clear now.','focused'),
    ('a1b2c3d4-0001-0001-0001-000000000001',plan_sebi,current_date-9,3.5,ARRAY['LODR Regulations','Continuous disclosure obligations'],'Made a separate sheet for key timelines.','focused'),
    ('a1b2c3d4-0001-0001-0001-000000000001',plan_sebi,current_date-8,4.5,ARRAY['Derivatives basics','Futures pricing','Options Greeks intro'],'Options Greeks are complex. Spent extra time.','tired'),
    ('a1b2c3d4-0001-0001-0001-000000000001',plan_sebi,current_date-5,4.0,ARRAY['Financial statements reading','P&L analysis','Balance sheet components'],'Cash flow statement needs more practice.','focused'),
    ('a1b2c3d4-0001-0001-0001-000000000001',plan_sebi,current_date-4,3.5,ARRAY['Ratio analysis','Liquidity ratios','Profitability ratios'],'Made a formula sheet with all important ratios.','focused'),
    ('a1b2c3d4-0001-0001-0001-000000000001',plan_sebi,current_date-3,4.5,ARRAY['TVM calculations','NPV','IRR','Annuity'],'Practiced 25 problems.','motivated'),
    ('a1b2c3d4-0001-0001-0001-000000000001',plan_sebi,current_date-2,3.0,ARRAY['Valuation methods','DCF model','PE multiple'],'PE ratio interpretation needs more context.','focused'),
    ('a1b2c3d4-0001-0001-0001-000000000001',plan_sebi,current_date-1,4.0,ARRAY['Finance MCQs — 35 Qs','Weak area review'],'Scored 26/35. Weak in valuation section.','motivated'),
    ('a1b2c3d4-0002-0002-0002-000000000002',plan_rbi, current_date-7,6.0,ARRAY['RBI Annual Report 2024 — key highlights','MPC decisions'],'Very productive session. MPC decisions are clear.','motivated'),
    ('a1b2c3d4-0002-0002-0002-000000000002',plan_rbi, current_date-5,5.5,ARRAY['DEPR paper pattern analysis','Economic concepts revision'],'Phase II DEPR paper is dense.','focused'),
    ('a1b2c3d4-0002-0002-0002-000000000002',plan_rbi, current_date-3,6.0,ARRAY['Full mock test Phase I','GK section practice'],'Phase I mock: 134/200. Finance needs work.','motivated'),
    ('a1b2c3d4-0004-0004-0004-000000000004',plan_upsc,current_date-10,8.0,ARRAY['Polity — Fundamental Rights','Constitutional amendments'],'FR articles clear. Need to cover more case laws.','focused'),
    ('a1b2c3d4-0004-0004-0004-000000000004',plan_upsc,current_date-3,7.5,ARRAY['Ancient History — Maurya Empire','Ashoka edicts','Arthashastra'],'Arthashastra is interesting. Linked to governance for Mains.','motivated')
  ON CONFLICT DO NOTHING;

END; -- close inner BEGIN for study plans
END; -- close outer DO block
$$;

-- =============================================================================
-- SECTION 5: BILLING
-- =============================================================================
INSERT INTO user_subscriptions
  (id, user_id, plan_id, status, razorpay_subscription_id, razorpay_customer_id,
   current_period_start, current_period_end, cancel_at_period_end)
VALUES
  ('f0000001-0000-0000-0000-000000000001','a1b2c3d4-0001-0001-0001-000000000001','pro',  'active','sub_ARJUNprodummy001', 'cust_ARJUNdummy001','2025-01-01','2025-02-01',false),
  ('f0000001-0000-0000-0000-000000000002','a1b2c3d4-0002-0002-0002-000000000002','elite','active','sub_PRIYAelitedummy02','cust_PRIYAdummy002','2025-01-01','2025-02-01',false),
  ('f0000001-0000-0000-0000-000000000003','a1b2c3d4-0004-0004-0004-000000000004','pro',  'active','sub_RAHULprodummy003', 'cust_RAHULdummy003','2025-01-05','2025-02-05',false),
  ('f0000001-0000-0000-0000-000000000004','a1b2c3d4-0006-0006-0006-000000000006','elite','active','sub_VIKRAMelitedummy4','cust_VIKRAMdummy004','2024-12-01','2025-01-01',false),
  ('f0000001-0000-0000-0000-000000000005','a1b2c3d4-0008-0008-0008-000000000008','pro',  'active','sub_DEEPAprodummy005', 'cust_DEEPAdummy005','2025-01-10','2025-02-10',false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO payment_history (user_id, subscription_id, razorpay_payment_id, amount_inr, status) VALUES
  ('a1b2c3d4-0001-0001-0001-000000000001','f0000001-0000-0000-0000-000000000001','pay_ARJUNdummy0001',199,'captured'),
  ('a1b2c3d4-0002-0002-0002-000000000002','f0000001-0000-0000-0000-000000000002','pay_PRIYAdummy0002',499,'captured'),
  ('a1b2c3d4-0004-0004-0004-000000000004','f0000001-0000-0000-0000-000000000003','pay_RAHULdummy0003',199,'captured'),
  ('a1b2c3d4-0006-0006-0006-000000000006','f0000001-0000-0000-0000-000000000004','pay_VIKRAdummy0004',499,'captured'),
  ('a1b2c3d4-0008-0008-0008-000000000008','f0000001-0000-0000-0000-000000000005','pay_DEEPAdummy0005',199,'captured')
ON CONFLICT DO NOTHING;

-- =============================================================================
-- SECTION 6: MARKETPLACE
-- =============================================================================
DO $$
DECLARE
  course_rbi  uuid := '90000001-0000-0000-0000-000000000001';
  course_sebi uuid := '90000001-0000-0000-0000-000000000002';
  course_fin  uuid := '90000001-0000-0000-0000-000000000003';
  course_sea  uuid := '90000001-0000-0000-0000-000000000004';  -- SEBI Finance stream
  course_aw   uuid := '90000001-0000-0000-0000-000000000005';  -- Answer Writing
  sec_rbi1    uuid := '90000001-0000-0000-0001-000000000001';
  sec_rbi2    uuid := '90000001-0000-0000-0001-000000000002';
  sec_sebi1   uuid := '90000001-0000-0000-0001-000000000003';
  sec_sebi2   uuid := '90000001-0000-0000-0001-000000000004';
  sec_fin1    uuid := '90000001-0000-0000-0001-000000000005';
BEGIN

INSERT INTO courses
  (id, instructor_id, title, slug, description, short_description,
   price_inr, original_price_inr, level, language, exam_tags, status,
   total_lessons, total_duration_mins, avg_rating, total_reviews, total_enrollments, commission_pct)
VALUES
  (course_rbi,'a1b2c3d4-0006-0006-0006-000000000006',
   'RBI Grade B 2025 — Complete Course (Phase I + II)',
   'rbi-grade-b-2025-complete',
   'The most comprehensive RBI Grade B preparation course. 200+ hours, 5000+ MCQs, 50 full-length mock tests. Taught by a former RBI Grade B officer.',
   'Complete RBI Grade B prep by a former RBI officer. 200+ hours, 5000+ MCQs.',
   2999,5999,'advanced','Hindi + English',ARRAY['RBI Grade B'],'published',180,12000,4.8,312,1847,20),
  (course_sebi,'a1b2c3d4-0006-0006-0006-000000000006',
   'SEBI Grade A — Securities Law & Regulations Deep Dive',
   'sebi-grade-a-securities-law',
   'Master every section of the SEBI Act, SCRA, Depositories Act, Insider Trading Regulations. 3000+ MCQs and PYQ analysis 2015–2024.',
   'Exhaustive coverage of all SEBI regulations and Acts. 3000+ MCQs, PYQ analysis.',
   1499,2999,'intermediate','English',ARRAY['SEBI Grade A'],'published',85,5100,4.7,198,923,20),
  (course_fin,'a1b2c3d4-0006-0006-0006-000000000006',
   'Finance & Economics for Regulatory Exams (SEBI/RBI/NABARD)',
   'finance-economics-regulatory-exams',
   'One course for all regulatory exam Finance & Economics sections. 2000+ practice questions covering financial statements, capital markets, monetary policy, and macroeconomics.',
   'Finance & Economics for SEBI/RBI/NABARD — 2000+ practice questions.',
   999,1999,'beginner','Hindi + English',ARRAY['SEBI Grade A','RBI Grade B','NABARD Grade A'],'published',62,3720,4.6,445,2341,20),
  (course_sea,'a1b2c3d4-0008-0008-0008-000000000008',
   'SEBI Grade A Finance Stream — CA/CFA Level Preparation',
   'sebi-grade-a-finance-stream-ca-cfa',
   'Designed specifically for SEBI Grade A Finance stream candidates. Covers advanced financial statement analysis, derivatives pricing, fixed income, portfolio management, and corporate law.',
   'SEBI Grade A Finance stream — CA/CFA curriculum approach. Advanced level.',
   1999,3999,'advanced','English',ARRAY['SEBI Grade A'],'published',95,5700,4.9,87,312,20),
  (course_aw,'a1b2c3d4-0008-0008-0008-000000000008',
   'Answer Writing Masterclass — RBI Grade B & SEBI Phase II',
   'answer-writing-rbi-sebi-phase-2',
   'Answer writing frameworks, model answers for 200+ questions, ESI, Finance & Management, and English paper strategy for Phase II.',
   'Answer writing for Phase II — frameworks, model answers, 200+ questions.',
   799,1599,'intermediate','English',ARRAY['RBI Grade B','SEBI Grade A'],'published',40,2400,4.8,156,678,20)
ON CONFLICT (id) DO NOTHING;

INSERT INTO course_sections (id, course_id, title, order_index, is_free_preview) VALUES
  (sec_rbi1, course_rbi, 'Introduction & Exam Pattern',         1, true),
  (sec_rbi2, course_rbi, 'Phase I — General Awareness',         2, false),
  (sec_sebi1,course_sebi,'Course Overview & Strategy',          1, true),
  (sec_sebi2,course_sebi,'SEBI Act 1992 — Complete',            2, false),
  (sec_fin1, course_fin, 'Free Preview — What You Will Learn',  1, true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO lessons (section_id, title, type, order_index, duration_mins, is_free_preview, content_url) VALUES
  (sec_rbi1,'Welcome + What to Expect','video',1,8,true,'https://example.com/videos/rbi-intro-welcome.mp4'),
  (sec_rbi1,'RBI Grade B 2025 — Notification Analysis','video',2,15,true,'https://example.com/videos/rbi-notification-analysis.mp4'),
  (sec_rbi2,'RBI History & Organizational Structure','video',1,45,false,'https://example.com/videos/rbi-history-structure.mp4'),
  (sec_rbi2,'Monetary Policy — Repo, CRR, SLR, OMO','video',2,60,false,'https://example.com/videos/monetary-policy-tools.mp4'),
  (sec_sebi1,'SEBI Grade A — Complete Exam Strategy 2025','video',1,20,true,'https://example.com/videos/sebi-exam-strategy.mp4'),
  (sec_sebi2,'SEBI Act 1992 — Chapters 1–4','video',1,90,false,'https://example.com/videos/sebi-act-ch1-4.mp4'),
  (sec_fin1, 'Why This Course? Finance in SEBI/RBI/NABARD','video',1,12,true,'https://example.com/videos/finance-eco-intro.mp4')
ON CONFLICT DO NOTHING;

INSERT INTO enrollments (user_id, course_id, status, amount_paid_inr, razorpay_order_id, razorpay_payment_id) VALUES
  ('a1b2c3d4-0001-0001-0001-000000000001',course_sebi,'active',1499,'order_ARJsebi001','pay_ARJsebi001'),
  ('a1b2c3d4-0001-0001-0001-000000000001',course_fin, 'active', 999,'order_ARJfin001', 'pay_ARJfin001'),
  ('a1b2c3d4-0002-0002-0002-000000000002',course_rbi, 'active',2999,'order_PRIrbi001', 'pay_PRIrbi001'),
  ('a1b2c3d4-0002-0002-0002-000000000002',course_aw,  'active', 799,'order_PRIaw001',  'pay_PRIaw001'),
  ('a1b2c3d4-0004-0004-0004-000000000004',course_fin, 'active', 999,'order_RAHfin001', 'pay_RAHfin001'),
  ('a1b2c3d4-0005-0005-0005-000000000005',course_fin, 'active',   0, null,              null)
ON CONFLICT DO NOTHING;

INSERT INTO reviews (user_id, course_id, rating, body) VALUES
  ('a1b2c3d4-0002-0002-0002-000000000002',course_rbi,5,'This course is absolutely worth every rupee. Phase I score jumped from 98 to 134 after following this course.'),
  ('a1b2c3d4-0001-0001-0001-000000000001',course_sebi,5,'The depth of coverage in Securities Law is unmatched. PYQ analysis module is brilliant.'),
  ('a1b2c3d4-0001-0001-0001-000000000001',course_fin,4,'Excellent course for Finance fundamentals. The balance sheet reading module helped me most. Slight repetition in some chapters.'),
  ('a1b2c3d4-0005-0005-0005-000000000005',course_fin,5,'I was scared of Finance section before this course. Now it is my strongest subject.'),
  ('a1b2c3d4-0001-0001-0001-000000000001',course_sea,5,'Deepa madam brings a CA+CFA perspective that is totally different. Derivatives pricing section is extremely detailed.')
ON CONFLICT DO NOTHING;

INSERT INTO instructor_payouts (instructor_id, amount_inr, status, period_start, period_end) VALUES
  ('a1b2c3d4-0006-0006-0006-000000000006',187520,'paid',   '2024-12-01','2024-12-31'),
  ('a1b2c3d4-0008-0008-0008-000000000008',43680, 'paid',   '2024-12-01','2024-12-31'),
  ('a1b2c3d4-0006-0006-0006-000000000006',204800,'pending','2025-01-01','2025-01-31'),
  ('a1b2c3d4-0008-0008-0008-000000000008',51200, 'pending','2025-01-01','2025-01-31')
ON CONFLICT DO NOTHING;

END $$;

-- =============================================================================
-- SECTION 7: FORUM CATEGORIES (idempotent on slug)
-- =============================================================================
INSERT INTO forum_categories (name, slug, description, exam_tag, icon, color, order_index, is_active) VALUES
  ('UPSC & Civil Services',  'upsc',           'IAS, IPS, IFS, CAPF and all UPSC exams',           'UPSC',     '🏛','#8B6914',1,true),
  ('Banking & Finance',      'banking',         'IBPS, SBI, RBI, NABARD, SEBI, IRDAI',              'Banking',  '🏦','#1B5E6E',2,true),
  ('SSC Exams',              'ssc',             'CGL, CHSL, CPO, GD, MTS, JE',                      'SSC',      '📋','#1B4F3E',3,true),
  ('Railways',               'railways',        'RRB NTPC, Group D, JE, ALP, Technician',           'Railways', '🚂','#4A1B6E',4,true),
  ('State PSC',              'state-psc',       'State Public Service Commissions — all states',    'State PSC','🗺','#6E1B1B',5,true),
  ('Defence & Police',       'defence',         'CDS, NDA, AFCAT, BSF, CRPF, SSB',                 'Defence',  '🛡','#1B3A6E',6,true),
  ('Study Strategy',         'study',           'Preparation tips, resources, schedules',           null,       '📚','#3A1B6E',7,true),
  ('Current Affairs',        'current-affairs', 'News analysis and GK for competitive exams',      null,       '📰','#1B6E3A',8,true),
  ('Results & Cut-offs',     'results',         'Official results, answer keys, cut-offs',         null,       '📊','#6E4A1B',9,true),
  ('Off Topic',              'off-topic',       'Career advice, motivation, life as an aspirant',  null,       '💬','#4A4A4A',10,true)
ON CONFLICT (slug) DO NOTHING;

-- =============================================================================
-- SECTION 8: SCRAPE SOURCES (from Top_100 + Master file portals)
-- =============================================================================
INSERT INTO scrape_sources (name, base_url, notification_path, org_type, state, is_active, scrape_interval_hours, selector_config) VALUES
  ('UPSC Official',              'https://upsc.gov.in',              '/examinations/active-examinations','Central Govt',null,true,24,'{"type":"html","selector":"a[href*=exam]"}'::jsonb),
  ('SSC Official',               'https://ssc.gov.in',               '/portal/latestnotify',             'Central Govt',null,true,24,'{"type":"html","selector":".latest-news a"}'::jsonb),
  ('IBPS Official',              'https://www.ibps.in',              '/wp-json/wp/v2/posts?categories=3','Banking',    null,true,24,'{"type":"json","path":"$.*.title.rendered"}'::jsonb),
  ('RBI Official',               'https://www.rbi.org.in',           '/scripts/NotificationUser.aspx',  'Banking',    null,true,24,'{"type":"html","selector":".notification-list a"}'::jsonb),
  ('SEBI Official',              'https://www.sebi.gov.in',          '/sebiweb/home/list/5/33/0/0',      'Regulatory', null,true,24,'{"type":"html","selector":".content-item a"}'::jsonb),
  ('NABARD Official',            'https://www.nabard.org',           '/content.aspx?id=591',             'Banking',    null,true,48,'{"type":"html","selector":".career-link"}'::jsonb),
  ('Employment News RSS',        'https://employmentnews.gov.in',    '/RSS/enrss.xml',                   'Central Govt',null,true,24,'{"type":"rss"}'::jsonb),
  ('Sarkari Result',             'https://sarkariresult.com',        '/notification/',                   'Aggregator', null,true,12,'{"type":"html","selector":".notification a"}'::jsonb),
  ('Free Job Alert',             'https://www.freejobalert.com',     '/latest-notifications/',           'Aggregator', null,true,12,'{"type":"html","selector":".job-post a"}'::jsonb),
  ('Maharashtra PSC',            'https://mpsconline.gov.in',        '/recruitment',                     'State Govt', 'Maharashtra',true,48,'{"type":"html"}'::jsonb),
  ('Kerala PSC',                 'https://www.keralapsc.gov.in',     '/notifications',                   'State Govt', 'Kerala',     true,48,'{"type":"html"}'::jsonb),
  ('Rajasthan PSC',              'https://rpsc.rajasthan.gov.in',    '/notifications',                   'State Govt', 'Rajasthan',  true,48,'{"type":"html"}'::jsonb),
  ('UPPSC',                      'https://uppsc.up.nic.in',          '/notif.aspx',                      'State Govt', 'Uttar Pradesh',true,48,'{"type":"html"}'::jsonb),
  ('IRDAI Official',             'https://www.irdai.gov.in',         '/careers.html',                    'Regulatory', null,true,72,'{"type":"html"}'::jsonb),
  ('LIC Official',               'https://licindia.in',              '/careers',                         'PSU',        null,true,48,'{"type":"html"}'::jsonb)
ON CONFLICT (base_url) DO NOTHING;

-- =============================================================================
-- SECTION 9: VERIFICATION
-- =============================================================================
SELECT
  'profiles'            AS tbl, COUNT(*)::int AS rows FROM profiles            UNION ALL
SELECT 'organizations',                               COUNT(*)::int FROM organizations            UNION ALL
SELECT 'recruitments',                                COUNT(*)::int FROM recruitments             UNION ALL
SELECT 'posts',                                       COUNT(*)::int FROM posts                    UNION ALL
SELECT 'vacancies',                                   COUNT(*)::int FROM vacancies                UNION ALL
SELECT 'age_criteria',                                COUNT(*)::int FROM age_criteria             UNION ALL
SELECT 'education_criteria',                          COUNT(*)::int FROM education_criteria       UNION ALL
SELECT 'exam_stages',                                 COUNT(*)::int FROM exam_stages              UNION ALL
SELECT 'attempt_limits',                              COUNT(*)::int FROM attempt_limits           UNION ALL
SELECT 'salary_details',                              COUNT(*)::int FROM salary_details           UNION ALL
SELECT 'eligibility_results',                         COUNT(*)::int FROM eligibility_results      UNION ALL
SELECT 'user_targets',                                COUNT(*)::int FROM user_targets             UNION ALL
SELECT 'user_exam_attempts',                          COUNT(*)::int FROM user_exam_attempts       UNION ALL
SELECT 'study_plans',                                 COUNT(*)::int FROM study_plans              UNION ALL
SELECT 'study_weeks',                                 COUNT(*)::int FROM study_weeks              UNION ALL
SELECT 'study_logs',                                  COUNT(*)::int FROM study_logs               UNION ALL
SELECT 'subscription_plans',                          COUNT(*)::int FROM subscription_plans       UNION ALL
SELECT 'user_subscriptions',                          COUNT(*)::int FROM user_subscriptions       UNION ALL
SELECT 'payment_history',                             COUNT(*)::int FROM payment_history          UNION ALL
SELECT 'courses',                                     COUNT(*)::int FROM courses                  UNION ALL
SELECT 'enrollments',                                 COUNT(*)::int FROM enrollments              UNION ALL
SELECT 'reviews',                                     COUNT(*)::int FROM reviews                  UNION ALL
SELECT 'forum_categories',                            COUNT(*)::int FROM forum_categories         UNION ALL
SELECT 'scrape_sources',                              COUNT(*)::int FROM scrape_sources
ORDER BY tbl;
