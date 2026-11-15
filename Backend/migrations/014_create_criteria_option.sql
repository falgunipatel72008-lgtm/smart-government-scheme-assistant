CREATE TABLE criteria_option (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  dimension_id TINYINT UNSIGNED NOT NULL,
  code VARCHAR(60) NOT NULL,
  label VARCHAR(100) NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_criteria_option_dimension_code (dimension_id, code),
  KEY idx_criteria_option_dimension_active_sort (dimension_id, is_active, sort_order),
  CONSTRAINT fk_criteria_option_dimension
    FOREIGN KEY (dimension_id) REFERENCES criteria_dimension(id)
) ENGINE=InnoDB;
