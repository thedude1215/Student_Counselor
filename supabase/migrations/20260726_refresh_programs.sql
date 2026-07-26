-- ============================================================================
-- Refresh + expand the `programs` catalogue
-- Written 26 July 2026 for the SUMMER 2027 cycle.
--
-- WHY THIS EXISTS
-- Every deadline previously in this table had already passed (they were 2025 /
-- early-2026 dates). A student reading the page was being shown dead dates on
-- the one field they actually act on.
--
-- HOW THE DATES WERE SOURCED — please read before trusting them
-- As of July 2026 most summer-2027 applications have not opened yet; programmes
-- typically publish in Nov–Dec 2026. So each row is marked with its confidence:
--
--   * VERIFIED  — a specific 2027-cycle date published on the official site.
--   * TYPICAL   — not yet announced; the month is the programme's established
--                 pattern from the most recent cycle. Shown in the UI as
--                 "Typically …" so it never reads as a firm date.
--   * CHECK     — I could not verify this one. Deliberately says
--                 "Check official site" rather than carrying an invented date.
--
-- Re-runnable: the DELETE below clears any previous run of these exact rows.
-- ============================================================================

BEGIN;

-- ── 1. Refresh the expired deadlines on rows that already exist ─────────────
-- Matched on name rather than id, since ids differ between environments.

-- VERIFIED-pattern programmes (researched, awaiting official 2027 posting)
UPDATE programs SET deadline = 'Typically mid-December'
  WHERE name ILIKE '%Research Science Institute%';          -- 2026 cycle: 10 Dec 2025

UPDATE programs SET deadline = 'Typically 1 February'
  WHERE name ILIKE '%MITES%';                               -- established annual pattern

UPDATE programs
SET host_logo = 'MIT',
    host_logo_url = '/logos/massachusetts-institute-of-technology.svg',
    host_logo_style = '{"background":"#FFFFFF","padding":"2px"}'::jsonb
WHERE host = 'MIT'
   OR host = 'MIT / Center for Excellence in Education';

UPDATE universities
SET logo = 'MIT',
    logo_url = '/logos/massachusetts-institute-of-technology.svg',
    logo_style = '{"background":"#FFFFFF","padding":"2px"}'::jsonb,
    fallback = 'MIT'
WHERE name = 'Massachusetts Institute of Technology';

-- CHECK — not verified in this pass. Honest placeholder instead of a guess.
UPDATE programs SET deadline = 'Check official site'
  WHERE name ILIKE '%PRIMES%'
     OR name ILIKE '%PROMYS%'
     OR name ILIKE '%HSYLC%'
     OR name ILIKE '%Stanford Global Initiative%'
     OR name ILIKE '%COSMOS%'
     OR name ILIKE '%Camp Euclid%'
     OR name ILIKE '%Young Scholars Program%'
     OR name ILIKE '%Yale Young Global Scholars%'
     OR name ILIKE '%iGEM%';

-- ── 2. Add new programmes ──────────────────────────────────────────────────
-- Only programmes whose official URL was confirmed during research are
-- included; no invented links.
--
-- `eligibility` follows a convention the UI parses for its access badge:
--   "International welcome · …"  →  green badge
--   "US only · …"                →  amber badge (citizens / permanent residents)

DELETE FROM programs WHERE name IN (
  'Summer Science Program (SSP)',
  'Telluride Association Summer Seminar (TASS)',
  'Stanford Institutes of Medicine Summer Research (SIMR)',
  'Simons Summer Research Program',
  'Anson L. Clark Scholars Program',
  'Rockefeller Summer Science Research Program (SSRP)',
  'CERN Summer Student Programme',
  'DAAD RISE Germany',
  'Amgen Scholars Program',
  'DOE Science Undergraduate Laboratory Internships (SULI)',
  'NSF Research Experiences for Undergraduates (REU)'
);

INSERT INTO programs
  (name, host, host_logo, description, discipline, type, cost_type, deadline, eligibility, url)
VALUES

-- ── High school ──

-- VERIFIED: ssp.org publishes both 2027 dates.
('Summer Science Program (SSP)',
 'SSP International',
 '🔭',
 'Thirty-nine days of hands-on research in astrophysics, biochemistry, genomics or synthetic chemistry. Teams of three collect their own data and reach a real result — not a simulated one.',
 ARRAY['STEM','Science','Math']::text[],
 'Summer Program', 'paid',
 '30 January 2027 (international) · 20 February 2027 (US)',
 'International welcome · Current juniors (graduating 2028). Need-based aid available.',
 'https://ssp.org/application/'),

-- TYPICAL: 2026 cycle opened 15 Oct 2025, closed 3 Dec 2025.
('Telluride Association Summer Seminar (TASS)',
 'Telluride Association',
 '📚',
 'A free six-week seminar in critical theory and social justice. No grades, no credit — just seminar-style study and self-governance. Tuition, room, board and travel are all covered.',
 ARRAY['Humanities','Leadership','Policy']::text[],
 'Summer Program', 'free',
 'Typically early December',
 'International welcome · Sophomores and juniors, aged 15–17 during the programme.',
 'https://tellurideassociation.org/tass/'),

-- TYPICAL: 2026 cycle closed 21 Feb 2026; applications open mid-December.
('Stanford Institutes of Medicine Summer Research (SIMR)',
 'Stanford Medicine',
 '🧬',
 'Eight weeks in a Stanford medical research lab across eight institutes, from immunology to bioengineering. Students join an active research team rather than a teaching lab.',
 ARRAY['Biology','STEM','Science']::text[],
 'Research', 'paid',
 'Typically late February',
 'Juniors and seniors, 16+ by programme start. Stipend provided; check residency terms.',
 'https://med.stanford.edu/simr.html'),

-- TYPICAL: school nomination deadline was 30 Jan 2026, application ~5 Feb.
('Simons Summer Research Program',
 'Stony Brook University',
 '🔬',
 'Seven weeks with a Stony Brook faculty mentor, ending in a written abstract and a poster session. One of the longest-running high-school research placements in the US.',
 ARRAY['STEM','Science','Engineering']::text[],
 'Research', 'free',
 'Typically early February',
 'Juniors, 16+ by programme start. Requires a school nomination.',
 'https://www.stonybrook.edu/simons/'),

-- VERIFIED-ish: official page lists Feb 2027; two sources disagree on the day.
('Anson L. Clark Scholars Program',
 'Texas Tech University',
 '⚗️',
 'Seven weeks of one-to-one faculty-mentored research across STEM, social sciences and the humanities. Fully funded, with a stipend — and among the most selective in the country.',
 ARRAY['STEM','Science','Humanities']::text[],
 'Research', 'free',
 'Mid-February 2027 — confirm exact day on site',
 'US only · Citizens and permanent residents. Rising seniors, 17+ by start.',
 'https://www.depts.ttu.edu/clarkscholars/ApplicationDetails.php'),

-- TYPICAL: 2026 cycle opened 13 Oct 2025, closed 2 Jan 2026.
('Rockefeller Summer Science Research Program (SSRP)',
 'The Rockefeller University',
 '🧪',
 'Seven weeks of biomedical research in small teams at Rockefeller in New York. Takes only about 32 students a year. Free, with need-based stipends available.',
 ARRAY['Biology','Science','STEM']::text[],
 'Research', 'free',
 'Typically early January',
 'Juniors and seniors, 16+ by programme start.',
 'https://www.rockefeller.edu/outreach/ssrp/'),

-- ── University / undergraduate ──

-- TYPICAL: 2027 applications open 1 Nov 2026; deadline usually end of January.
('CERN Summer Student Programme',
 'CERN',
 '⚛️',
 'Join a research team at CERN in Geneva for the summer — lectures from working physicists alongside real work on an experiment. Open to students of every nationality.',
 ARRAY['STEM','Computer Science','Engineering','Math']::text[],
 'Research', 'free',
 -- Deadline month leads the string: the UI buckets by the first month named,
 -- and the closing date is what a student needs to plan around.
 'Typically end of January · opens 1 November 2026',
 'International welcome · Undergraduates and master''s students in physics, computing, engineering or maths.',
 'https://careers.cern/programmes/summer-studentship/'),

-- VERIFIED: DAAD publishes 30 Nov 2026 for the 2027 placement round.
('DAAD RISE Germany',
 'DAAD',
 '🇩🇪',
 'A funded summer research internship at a German university or institute, matched to your field. Ten weeks to three months, with a monthly stipend and a German student mentor.',
 ARRAY['STEM','Biology','Computer Science','Engineering']::text[],
 'Research', 'free',
 '30 November 2026',
 'Undergraduates at universities in the US, Canada, UK or Ireland who will have completed 2+ years by the placement.',
 'https://www.daad.de/rise/en/rise-germany/'),

-- VERIFIED (tentative): Harvard site lists 1 Feb 2027, marked tentative.
('Amgen Scholars Program',
 'Amgen Foundation',
 '🧫',
 'A funded summer of biotech and biomedical research at a major research university, with a stipend and housing. Runs at host institutions across the US, Europe, Japan and Australia.',
 ARRAY['Biology','Science','STEM']::text[],
 'Research', 'free',
 '1 February 2027 (tentative) · opens 1 November 2026',
 'International welcome · Undergraduates; eligibility varies by host institution.',
 'https://amgenscholars.com/us-program/'),

-- TYPICAL: summer-2027 term not yet posted; summer deadlines historically early January.
('DOE Science Undergraduate Laboratory Internships (SULI)',
 'US Department of Energy',
 '⚡',
 'A paid ten-week placement inside a US national laboratory — Argonne, Fermilab, Berkeley and others — working alongside staff scientists on real projects.',
 ARRAY['STEM','Engineering','Computer Science','Science']::text[],
 'Research', 'free',
 'Typically early January',
 'US only · Citizens and permanent residents enrolled as undergraduates.',
 'https://science.osti.gov/wdts/suli'),

-- TYPICAL: per-site deadlines, historically January–March.
('NSF Research Experiences for Undergraduates (REU)',
 'US National Science Foundation',
 '🔎',
 'Hundreds of funded summer research placements at universities across the US, each hosted by a different department. Searchable by field — pick the site, apply to it directly.',
 ARRAY['STEM','Science','Engineering','Computer Science','Math']::text[],
 'Research', 'free',
 'Varies by site · typically January–March',
 'US only · Most sites require citizens or permanent residents. Check each site.',
 'https://www.nsf.gov/crssprgm/reu/reu_search.cfm');

WITH logo_map(host, host_logo, host_logo_url, host_logo_style) AS (
  VALUES
    ('Amgen Foundation', 'Amgen', '/logos/program-amgen.png', '{"background":"#FFFFFF","padding":"4px"}'::jsonb),
    ('Ashoka', 'CxC', '/logos/program-ashoka-cxc.png', '{"background":"#FFFFFF","padding":"4px"}'::jsonb),
    ('Boston University', 'PROMYS', '/logos/program-promys.png', '{"background":"#FFFFFF","padding":"4px"}'::jsonb),
    ('Carnegie Mellon University', 'CMU', '/logos/program-cmu.png', '{"background":"#FFFFFF","padding":"3px"}'::jsonb),
    ('Case Western Reserve University', 'CWRU', '/logos/program-case-western.ico', '{"background":"#FFFFFF","padding":"5px"}'::jsonb),
    ('CERN', 'CERN', '/logos/program-cern.svg', '{"background":"#FFFFFF","padding":"3px"}'::jsonb),
    ('DAAD', 'DAAD', '/logos/program-daad.png', '{"background":"#FFFFFF","padding":"2px"}'::jsonb),
    ('iGEM Foundation', 'iGEM', '/logos/program-igem.svg', '{"background":"#FFFFFF","padding":"5px"}'::jsonb),
    ('MIT', 'MIT', '/logos/massachusetts-institute-of-technology.svg', '{"background":"#FFFFFF","padding":"2px"}'::jsonb),
    ('MIT / Center for Excellence in Education', 'MIT', '/logos/massachusetts-institute-of-technology.svg', '{"background":"#FFFFFF","padding":"2px"}'::jsonb),
    ('SSP International', 'SSP', '/logos/program-ssp-icon.jpg', '{"background":"#FFFFFF","padding":"0px"}'::jsonb),
    ('Stony Brook University', 'SBU', '/logos/program-stony-brook.png', '{"background":"#FFFFFF","padding":"3px"}'::jsonb),
    ('Stanford Medicine', 'Stanford', '/logos/stanford-hq.png', '{"background":"#FFFFFF","padding":"5px"}'::jsonb),
    ('Telluride Association', 'TA', '/logos/program-telluride.ico', '{"background":"#FFFFFF","padding":"5px"}'::jsonb),
    ('Texas Tech University', 'TTU', '/logos/program-texas-tech.svg', '{"background":"#FFFFFF","padding":"2px"}'::jsonb),
    ('The Rockefeller University', 'RU', '/logos/program-rockefeller.png', '{"background":"#FFFFFF","padding":"0px"}'::jsonb),
    ('UC System', 'UC', '/logos/program-uc-cosmos.png', '{"background":"#FFFFFF","padding":"1px"}'::jsonb),
    ('US Department of Energy', 'DOE', '/logos/program-doe.png', '{"background":"#FFFFFF","padding":"2px"}'::jsonb),
    ('US National Science Foundation', 'NSF', '/logos/program-nsf.png', '{"background":"#FFFFFF","padding":"0px"}'::jsonb)
)
UPDATE programs p
SET host_logo = logo_map.host_logo,
    host_logo_url = logo_map.host_logo_url,
    host_logo_style = logo_map.host_logo_style
FROM logo_map
WHERE p.host = logo_map.host;

UPDATE universities
SET logo = 'CWRU',
    logo_url = '/logos/program-case-western.ico',
    logo_style = '{"background":"#FFFFFF","padding":"5px"}'::jsonb,
    fallback = 'CWRU'
WHERE name = 'Case Western Reserve University';

COMMIT;

-- ── After running ───────────────────────────────────────────────────────────
-- Worth revisiting around December 2026, when most 2027 cycles publish their
-- real dates and every "Typically …" row can be replaced with a firm one.
