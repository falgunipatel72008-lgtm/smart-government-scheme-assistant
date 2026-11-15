CREATE TABLE IF NOT EXISTS schemes (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(60) NULL,
  name VARCHAR(255) NOT NULL,
  ministry_id INT UNSIGNED NOT NULL,
  coverage_type ENUM('ALL_INDIA', 'SELECTED') NOT NULL,
  details JSON NOT NULL,
  benefits JSON NOT NULL,
  eligibility JSON NOT NULL,
  application_process JSON NOT NULL,
  documents JSON NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_schemes_code (code),
  KEY idx_schemes_ministry_active (ministry_id, is_active),
  CONSTRAINT fk_schemes_ministry
    FOREIGN KEY (ministry_id) REFERENCES master_ministry(id)
) ENGINE=InnoDB;
