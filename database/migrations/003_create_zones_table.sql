-- Add Task 5 Zones while preserving all existing tables and records.
-- Aligns zones.brand_id with the signed BIGINT brands.brand_id key in ims_db.

USE ims_db;

DROP PROCEDURE IF EXISTS migrate_task5_zone_schema;
DELIMITER $$
CREATE PROCEDURE migrate_task5_zone_schema()
BEGIN
    DECLARE v_count INT DEFAULT 0;

    SELECT COUNT(*) INTO v_count
    FROM INFORMATION_SCHEMA.TABLES
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'brands'
      AND ENGINE = 'InnoDB';
    IF v_count <> 1 THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Expected InnoDB brands table in ims_db; no Zone table changes were applied';
    END IF;

    SELECT COUNT(*) INTO v_count
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'brands'
      AND COLUMN_NAME = 'brand_id'
      AND DATA_TYPE = 'bigint'
      AND COLUMN_TYPE NOT LIKE '%unsigned%'
      AND COLUMN_KEY = 'PRI'
      AND EXTRA LIKE '%auto_increment%';
    IF v_count <> 1 THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Expected brands.brand_id to be a signed BIGINT auto-generated primary key; no Zone table changes were applied';
    END IF;

    SELECT COUNT(*) INTO v_count
    FROM INFORMATION_SCHEMA.TABLES
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'zones';
    IF v_count = 1 THEN
        SELECT COUNT(*) INTO v_count
        FROM INFORMATION_SCHEMA.TABLES
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'zones'
          AND ENGINE = 'InnoDB';
        IF v_count <> 1 THEN
            SIGNAL SQLSTATE '45000'
                SET MESSAGE_TEXT = 'Existing zones table must use InnoDB; no Zone changes were applied';
        END IF;

        SELECT COUNT(*) INTO v_count
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'zones'
          AND COLUMN_NAME IN ('zone_id', 'zone_name', 'brand_id', 'is_active', 'created_at', 'updated_at');
        IF v_count <> 6 THEN
            SIGNAL SQLSTATE '45000'
                SET MESSAGE_TEXT = 'Existing zones table has an unexpected shape; inspect it before retrying';
        END IF;

        SELECT COUNT(*) INTO v_count
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'zones'
          AND COLUMN_NAME = 'brand_id'
          AND DATA_TYPE IN ('int', 'bigint')
          AND COLUMN_TYPE NOT LIKE '%unsigned%'
          AND IS_NULLABLE = 'NO';
        IF v_count <> 1 THEN
            SIGNAL SQLSTATE '45000'
                SET MESSAGE_TEXT = 'Existing zones.brand_id must be a required signed integer; inspect it before retrying';
        END IF;

        SELECT COUNT(*) INTO v_count
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'zones'
          AND (
              (COLUMN_NAME = 'zone_id' AND DATA_TYPE = 'int'
                  AND COLUMN_KEY = 'PRI' AND EXTRA LIKE '%auto_increment%')
              OR (COLUMN_NAME = 'zone_name' AND DATA_TYPE = 'varchar'
                  AND CHARACTER_MAXIMUM_LENGTH = 50 AND IS_NULLABLE = 'NO')
              OR (COLUMN_NAME = 'brand_id' AND DATA_TYPE IN ('int', 'bigint')
                  AND COLUMN_TYPE NOT LIKE '%unsigned%' AND IS_NULLABLE = 'NO')
              OR (COLUMN_NAME = 'is_active' AND DATA_TYPE = 'bit'
                  AND COLUMN_TYPE = 'bit(1)'
                  AND IS_NULLABLE = 'NO')
              OR (COLUMN_NAME = 'created_at' AND DATA_TYPE = 'datetime'
                  AND DATETIME_PRECISION = 6 AND IS_NULLABLE = 'NO')
              OR (COLUMN_NAME = 'updated_at' AND DATA_TYPE = 'datetime'
                  AND DATETIME_PRECISION = 6 AND IS_NULLABLE = 'NO')
          );
        IF v_count <> 6 THEN
            SIGNAL SQLSTATE '45000'
                SET MESSAGE_TEXT = 'Existing zones columns do not match the Task 5 definition; inspect them before retrying';
        END IF;

        SELECT COUNT(*) INTO v_count
        FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'zones'
          AND COLUMN_NAME = 'brand_id'
          AND REFERENCED_TABLE_NAME IS NOT NULL
          AND NOT (REFERENCED_TABLE_NAME = 'brands' AND REFERENCED_COLUMN_NAME = 'brand_id');
        IF v_count > 0 THEN
            SIGNAL SQLSTATE '45000'
                SET MESSAGE_TEXT = 'zones.brand_id already references a different key; inspect it before retrying';
        END IF;

        SELECT COUNT(*) INTO v_count
        FROM zones z
        LEFT JOIN brands b ON b.brand_id = z.brand_id
        WHERE b.brand_id IS NULL;
        IF v_count > 0 THEN
            SIGNAL SQLSTATE '45000'
                SET MESSAGE_TEXT = 'zones contains Brand IDs with no matching Brand; no Zone changes were applied';
        END IF;

        SELECT COUNT(*) INTO v_count
        FROM INFORMATION_SCHEMA.STATISTICS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'zones'
          AND INDEX_NAME = 'idx_zones_brand_id';
        IF v_count > 0 AND NOT EXISTS (
            SELECT 1
            FROM INFORMATION_SCHEMA.STATISTICS
            WHERE TABLE_SCHEMA = DATABASE()
              AND TABLE_NAME = 'zones'
              AND INDEX_NAME = 'idx_zones_brand_id'
              AND COLUMN_NAME = 'brand_id'
              AND SEQ_IN_INDEX = 1
        ) THEN
            SIGNAL SQLSTATE '45000'
                SET MESSAGE_TEXT = 'idx_zones_brand_id exists with a different definition; inspect it before retrying';
        END IF;
    END IF;

    CREATE TABLE IF NOT EXISTS zones (
        zone_id INT AUTO_INCREMENT PRIMARY KEY,
        zone_name VARCHAR(50) NOT NULL,
        brand_id BIGINT NOT NULL,
        is_active BIT(1) NOT NULL,
        created_at DATETIME(6) NOT NULL,
        updated_at DATETIME(6) NOT NULL,
        INDEX idx_zones_brand_id (brand_id),
        CONSTRAINT fk_zones_brand FOREIGN KEY (brand_id) REFERENCES brands(brand_id)
    ) ENGINE=InnoDB;

    SELECT COUNT(*) INTO v_count
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'zones'
      AND COLUMN_NAME = 'brand_id'
      AND DATA_TYPE = 'int';
    IF v_count = 1 THEN
        ALTER TABLE zones MODIFY COLUMN brand_id BIGINT NOT NULL;
    END IF;

    SELECT COUNT(*) INTO v_count
    FROM INFORMATION_SCHEMA.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'zones'
      AND COLUMN_NAME = 'brand_id'
      AND SEQ_IN_INDEX = 1
      AND SUB_PART IS NULL;
    IF v_count = 0 THEN
        ALTER TABLE zones ADD INDEX idx_zones_brand_id (brand_id);
    END IF;

    SELECT COUNT(*) INTO v_count
    FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'zones'
      AND COLUMN_NAME = 'brand_id'
      AND REFERENCED_TABLE_NAME = 'brands'
      AND REFERENCED_COLUMN_NAME = 'brand_id';
    IF v_count = 0 THEN
        ALTER TABLE zones
            ADD CONSTRAINT fk_zones_brand
            FOREIGN KEY (brand_id) REFERENCES brands(brand_id);
    END IF;

    SELECT COUNT(*) INTO v_count
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'zones'
      AND (
          (COLUMN_NAME = 'zone_id' AND DATA_TYPE = 'int'
              AND COLUMN_KEY = 'PRI' AND EXTRA LIKE '%auto_increment%')
          OR (COLUMN_NAME = 'zone_name' AND DATA_TYPE = 'varchar'
              AND CHARACTER_MAXIMUM_LENGTH = 50 AND IS_NULLABLE = 'NO')
          OR (COLUMN_NAME = 'brand_id' AND DATA_TYPE = 'bigint'
              AND COLUMN_TYPE NOT LIKE '%unsigned%' AND IS_NULLABLE = 'NO')
          OR (COLUMN_NAME = 'is_active' AND DATA_TYPE = 'bit'
              AND COLUMN_TYPE = 'bit(1)'
              AND IS_NULLABLE = 'NO')
          OR (COLUMN_NAME = 'created_at' AND DATA_TYPE = 'datetime'
              AND DATETIME_PRECISION = 6 AND IS_NULLABLE = 'NO')
          OR (COLUMN_NAME = 'updated_at' AND DATA_TYPE = 'datetime'
              AND DATETIME_PRECISION = 6 AND IS_NULLABLE = 'NO')
      );
    IF v_count <> 6 THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Existing zones table does not match the Task 5 definition; inspect it before retrying';
    END IF;

    SELECT COUNT(*) INTO v_count
    FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'zones'
      AND COLUMN_NAME = 'brand_id'
      AND REFERENCED_TABLE_NAME = 'brands'
      AND REFERENCED_COLUMN_NAME = 'brand_id';
    IF v_count <> 1 THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'zones.brand_id foreign key is missing or points elsewhere; inspect it before retrying';
    END IF;

    SELECT COUNT(*) INTO v_count
    FROM INFORMATION_SCHEMA.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'zones'
      AND COLUMN_NAME = 'brand_id'
      AND SEQ_IN_INDEX = 1
      AND SUB_PART IS NULL;
    IF v_count = 0 THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'No usable zones index begins with brand_id; inspect the existing zones table';
    END IF;
END$$
DELIMITER ;

CALL migrate_task5_zone_schema();
DROP PROCEDURE migrate_task5_zone_schema;
