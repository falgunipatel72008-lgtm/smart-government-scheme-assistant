ALTER TABLE master_categories
  ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT TRUE AFTER image_public_id;
