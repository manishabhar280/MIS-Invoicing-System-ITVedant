-- Add the Task 4 Brand fields without dropping or recreating existing data.
-- Existing timestamp values are preserved; missing values use migration time.
-- Rows without a verified Chain or with names longer than 50 characters stop
-- the migration for manual review instead of being changed or deleted.

USE ims_db;

DROP PROCEDURE IF EXISTS migrate_task4_brand_schema;
DELIMITER $$
CREATE PROCEDURE migrate_task4_brand_schema()
BEGIN
    DECLARE v_count INT DEFAULT 0;

    SELECT COUNT(*) INTO v_count
    FROM INFORMATION_SCHEMA.TABLES
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME IN ('brands', 'chains');
    IF v_count <> 2 THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Expected brands and chains tables; no Brand migration changes were applied';
    END IF;

    SELECT COUNT(*) INTO v_count
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'brands'
      AND COLUMN_NAME IN ('brand_name', 'chain_id');
    IF v_count <> 2 THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Expected brands.brand_name and brands.chain_id; no Brand migration changes were applied';
    END IF;

    SELECT COUNT(*) INTO v_count
    FROM brands
    WHERE brand_name IS NULL OR CHAR_LENGTH(brand_name) > 50;
    IF v_count > 0 THEN
        SELECT brand_id, brand_name
        FROM brands
        WHERE brand_name IS NULL OR CHAR_LENGTH(brand_name) > 50;
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Brand names must be reviewed and shortened to 50 characters or fewer before retrying';
    END IF;

    SELECT COUNT(*) INTO v_count
    FROM brands b
    LEFT JOIN chains c ON c.chain_id = b.chain_id
    WHERE b.chain_id IS NULL OR c.chain_id IS NULL;
    IF v_count > 0 THEN
        SELECT b.brand_id, b.brand_name, b.chain_id
        FROM brands b
        LEFT JOIN chains c ON c.chain_id = b.chain_id
        WHERE b.chain_id IS NULL OR c.chain_id IS NULL;
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Brands with missing or invalid Chain mappings need verified manual mapping; no Brand rows were deleted or assigned';
    END IF;

    SELECT COUNT(*) INTO v_count
    FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'brands'
      AND COLUMN_NAME = 'chain_id'
      AND REFERENCED_TABLE_NAME = 'chains'
      AND REFERENCED_COLUMN_NAME = 'chain_id';
    IF v_count = 0 THEN
        SELECT COUNT(*) INTO v_count
        FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'brands'
          AND COLUMN_NAME = 'chain_id'
          AND REFERENCED_TABLE_NAME IS NOT NULL;
        IF v_count > 0 THEN
            SIGNAL SQLSTATE '45000'
                SET MESSAGE_TEXT = 'brands.chain_id has a different foreign-key reference; review it before retrying';
        END IF;
    END IF;

    SELECT COUNT(*) INTO v_count
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'brands'
      AND COLUMN_NAME = 'is_active';
    IF v_count = 0 THEN
        ALTER TABLE brands ADD COLUMN is_active BOOLEAN NULL;
    END IF;

    SELECT COUNT(*) INTO v_count
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'brands'
      AND COLUMN_NAME = 'created_at';
    IF v_count = 0 THEN
        ALTER TABLE brands ADD COLUMN created_at DATETIME NULL;
    END IF;

    SELECT COUNT(*) INTO v_count
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'brands'
      AND COLUMN_NAME = 'updated_at';
    IF v_count = 0 THEN
        ALTER TABLE brands ADD COLUMN updated_at DATETIME NULL;
    END IF;

    UPDATE brands SET is_active = TRUE WHERE is_active IS NULL;
    UPDATE brands SET created_at = CURRENT_TIMESTAMP WHERE created_at IS NULL;
    UPDATE brands SET updated_at = created_at WHERE updated_at IS NULL;

    ALTER TABLE brands
        MODIFY COLUMN brand_name VARCHAR(50) NOT NULL,
        MODIFY COLUMN chain_id INT NOT NULL,
        MODIFY COLUMN is_active BOOLEAN NOT NULL DEFAULT TRUE,
        MODIFY COLUMN created_at DATETIME NOT NULL,
        MODIFY COLUMN updated_at DATETIME NOT NULL;

    SELECT COUNT(*) INTO v_count
    FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'brands'
      AND COLUMN_NAME = 'chain_id'
      AND REFERENCED_TABLE_NAME = 'chains'
      AND REFERENCED_COLUMN_NAME = 'chain_id';
    IF v_count = 0 THEN
        ALTER TABLE brands
            ADD CONSTRAINT fk_brands_chain
            FOREIGN KEY (chain_id) REFERENCES chains (chain_id);
    END IF;
END$$
DELIMITER ;

CALL migrate_task4_brand_schema();
DROP PROCEDURE migrate_task4_brand_schema;
