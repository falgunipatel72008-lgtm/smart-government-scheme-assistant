CREATE TABLE scheme_states (
  scheme_id INT UNSIGNED NOT NULL,
  state_id INT UNSIGNED NOT NULL,
  PRIMARY KEY (scheme_id, state_id),
  KEY idx_scheme_states_state (state_id),
  CONSTRAINT fk_scheme_states_scheme
    FOREIGN KEY (scheme_id) REFERENCES schemes(id) ON DELETE CASCADE,
  CONSTRAINT fk_scheme_states_state
    FOREIGN KEY (state_id) REFERENCES master_state(id)
) ENGINE=InnoDB;
