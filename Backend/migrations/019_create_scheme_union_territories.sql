CREATE TABLE scheme_union_territories (
  scheme_id INT UNSIGNED NOT NULL,
  union_territory_id INT UNSIGNED NOT NULL,
  PRIMARY KEY (scheme_id, union_territory_id),
  KEY idx_scheme_union_territories_ut (union_territory_id),
  CONSTRAINT fk_scheme_union_territories_scheme
    FOREIGN KEY (scheme_id) REFERENCES schemes(id) ON DELETE CASCADE,
  CONSTRAINT fk_scheme_union_territories_ut
    FOREIGN KEY (union_territory_id) REFERENCES master_union_territory(id)
) ENGINE=InnoDB;
