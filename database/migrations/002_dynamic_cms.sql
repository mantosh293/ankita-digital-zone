ALTER TABLE cms_items MODIFY type ENUM('homepage','banner','service','pricing','job','admit_card','result','student_link','review','about','contact','hero','testimonial') NOT NULL;
CREATE TABLE IF NOT EXISTS contact_messages (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(120) NOT NULL,
  mobile VARCHAR(30),
  email VARCHAR(190),
  message TEXT NOT NULL,
  status ENUM('new','read','replied','closed') NOT NULL DEFAULT 'new',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS downloadable_records (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  type ENUM('admit_card','result','receipt') NOT NULL,
  application_number VARCHAR(80) NOT NULL,
  title VARCHAR(190) NOT NULL,
  body TEXT,
  file_path VARCHAR(255),
  status ENUM('active','inactive') NOT NULL DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_download_lookup (type, application_number)
);
