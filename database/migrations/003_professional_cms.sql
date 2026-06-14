-- Professional CMS restructure for Ankita Cyber Cafe.
-- Safe migration: creates backups/copies and only adds CMS tables. User, payment, finance, report, task and login data are not touched.

CREATE TABLE IF NOT EXISTS backup_cms_items_20260613 AS SELECT * FROM cms_items;
CREATE TABLE IF NOT EXISTS backup_services_20260613 AS SELECT * FROM services;

CREATE TABLE IF NOT EXISTS hero_banners (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  title VARCHAR(190) NOT NULL,
  subtitle VARCHAR(190),
  description TEXT,
  button_text VARCHAR(80),
  button_link VARCHAR(255),
  desktop_image VARCHAR(255),
  mobile_image VARCHAR(255),
  display_order INT NOT NULL DEFAULT 0,
  status ENUM('active','inactive') NOT NULL DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS jobs (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  title VARCHAR(190) NOT NULL,
  vacancy VARCHAR(120),
  qualification VARCHAR(190),
  age_limit VARCHAR(120),
  last_date DATE NULL,
  notification_pdf VARCHAR(255),
  apply_link VARCHAR(255),
  description TEXT,
  image_path VARCHAR(255),
  status ENUM('draft','published','archived') NOT NULL DEFAULT 'published',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS admit_cards (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  exam_name VARCHAR(190) NOT NULL,
  exam_date DATE NULL,
  download_link VARCHAR(255),
  description TEXT,
  image_path VARCHAR(255),
  status ENUM('draft','published','archived') NOT NULL DEFAULT 'published',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS results (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  exam_name VARCHAR(190) NOT NULL,
  result_date DATE NULL,
  result_link VARCHAR(255),
  description TEXT,
  image_path VARCHAR(255),
  status ENUM('draft','published','archived') NOT NULL DEFAULT 'published',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS student_links (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  title VARCHAR(190) NOT NULL,
  url VARCHAR(255) NOT NULL,
  logo VARCHAR(255),
  description TEXT,
  status ENUM('draft','published','archived') NOT NULL DEFAULT 'published',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

SET @sql := (SELECT IF(COUNT(*)=0, 'ALTER TABLE cms_items ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP', 'SELECT 1') FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name='cms_items' AND column_name='updated_at');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql := (SELECT IF(COUNT(*)=0, 'ALTER TABLE services ADD COLUMN description TEXT', 'SELECT 1') FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name='services' AND column_name='description');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql := (SELECT IF(COUNT(*)=0, 'ALTER TABLE services ADD COLUMN image_path VARCHAR(255)', 'SELECT 1') FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name='services' AND column_name='image_path');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := (SELECT IF(COUNT(*)=0, 'ALTER TABLE cms_items ADD COLUMN vacancy VARCHAR(120)', 'SELECT 1') FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name='cms_items' AND column_name='vacancy');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql := (SELECT IF(COUNT(*)=0, 'ALTER TABLE cms_items ADD COLUMN qualification VARCHAR(190)', 'SELECT 1') FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name='cms_items' AND column_name='qualification');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql := (SELECT IF(COUNT(*)=0, 'ALTER TABLE cms_items ADD COLUMN age_limit VARCHAR(120)', 'SELECT 1') FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name='cms_items' AND column_name='age_limit');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql := (SELECT IF(COUNT(*)=0, 'ALTER TABLE cms_items ADD COLUMN last_date VARCHAR(40)', 'SELECT 1') FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name='cms_items' AND column_name='last_date');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql := (SELECT IF(COUNT(*)=0, 'ALTER TABLE cms_items ADD COLUMN notification_pdf VARCHAR(255)', 'SELECT 1') FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name='cms_items' AND column_name='notification_pdf');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql := (SELECT IF(COUNT(*)=0, 'ALTER TABLE cms_items ADD COLUMN apply_link VARCHAR(255)', 'SELECT 1') FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name='cms_items' AND column_name='apply_link');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
INSERT INTO hero_banners (title, subtitle, description, button_text, button_link, desktop_image, mobile_image, display_order, status)
SELECT title, 'Digital Services at One Place', body, 'Explore Services', '/services', image_path, image_path, sort_order, 'active'
FROM cms_items WHERE type IN ('banner','hero') AND status='published'
AND NOT EXISTS (SELECT 1 FROM hero_banners LIMIT 1);

INSERT INTO jobs (title, vacancy, qualification, age_limit, last_date, notification_pdf, apply_link, description, image_path, status, created_at)
SELECT title, vacancy, qualification, age_limit, NULL, notification_pdf, apply_link, body, image_path, status, created_at
FROM cms_items WHERE type='job'
AND NOT EXISTS (SELECT 1 FROM jobs LIMIT 1);

INSERT INTO admit_cards (exam_name, download_link, description, image_path, status, created_at)
SELECT title, COALESCE(notification_pdf,url), body, image_path, status, created_at
FROM cms_items WHERE type='admit_card'
AND NOT EXISTS (SELECT 1 FROM admit_cards LIMIT 1);

INSERT INTO results (exam_name, result_link, description, image_path, status, created_at)
SELECT title, COALESCE(notification_pdf,url), body, image_path, status, created_at
FROM cms_items WHERE type='result'
AND NOT EXISTS (SELECT 1 FROM results LIMIT 1);

INSERT INTO student_links (title, url, logo, description, status, created_at)
SELECT title, url, image_path, body, status, created_at
FROM cms_items WHERE type='student_link'
AND NOT EXISTS (SELECT 1 FROM student_links LIMIT 1);

