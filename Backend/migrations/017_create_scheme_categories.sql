CREATE TABLE scheme_categories (
  scheme_id INT UNSIGNED NOT NULL,
  category_id INT UNSIGNED NOT NULL,
  PRIMARY KEY (scheme_id, category_id),
  KEY idx_scheme_categories_category (category_id),
  CONSTRAINT fk_scheme_categories_scheme
    FOREIGN KEY (scheme_id) REFERENCES schemes(id) ON DELETE CASCADE,
  CONSTRAINT fk_scheme_categories_category
    FOREIGN KEY (category_id) REFERENCES master_categories(id)
) ENGINE=InnoDB;
