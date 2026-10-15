-- Task 6 Estimate Management migration for the verified MySQL 8.0.41 schema.
-- Back up ims_db before applying. This migration is manual and is never run
-- automatically by the application.
--
-- The existing estimate_id, chain_id, client_id, amount, created_at, and
-- status columns are not renamed, narrowed, or made more restrictive.
-- New Estimate fields remain nullable so existing rows need no fabricated
-- backfill values. Invoices are not changed and have no Estimate relationship.
--
-- All table/column/relationship preconditions run before the first ALTER TABLE.
-- The one InnoDB ALTER adds all new fields and foreign keys together. MySQL DDL
-- implicitly commits and is not part of a user transaction; on MySQL 8.0.41,
-- supported InnoDB ALTER TABLE operations are atomic individually, but this
-- script does not promise transaction-wide rollback. If any Task 6 field is
-- already present, the script stops before table DDL for manual reconciliation.

USE ims_db;

-- The migration-specific name prevents accidental removal of an unrelated
-- procedure. If it already exists, CREATE PROCEDURE fails before any table DDL.
DELIMITER $$
CREATE PROCEDURE m004_estimate_management_preflight()
main: BEGIN
    DECLARE v_count INT DEFAULT 0;

    SELECT COUNT(*) INTO v_count
    FROM INFORMATION_SCHEMA.TABLES
    WHERE TABLE_SCHEMA = DATABASE()
      AND ENGINE = 'InnoDB'
      AND TABLE_NAME IN ('estimates', 'chains', 'clients', 'brands', 'zones', 'groups');
    IF v_count <> 6 THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Expected estimates, chains, clients, brands, zones, and groups as InnoDB tables; no table changes were made';
    END IF;

    SELECT COUNT(*) INTO v_count
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND (
          (TABLE_NAME = 'estimates' AND COLUMN_NAME = 'estimate_id'
              AND DATA_TYPE = 'bigint' AND COLUMN_TYPE = 'bigint'
              AND IS_NULLABLE = 'NO' AND COLUMN_KEY = 'PRI'
              AND EXTRA LIKE '%auto_increment%')
          OR (TABLE_NAME = 'estimates' AND COLUMN_NAME = 'amount'
              AND DATA_TYPE = 'decimal' AND NUMERIC_PRECISION = 38
              AND NUMERIC_SCALE = 2 AND IS_NULLABLE = 'NO')
          OR (TABLE_NAME = 'estimates' AND COLUMN_NAME = 'created_at'
              AND DATA_TYPE = 'datetime' AND DATETIME_PRECISION = 6
              AND IS_NULLABLE = 'YES')
          OR (TABLE_NAME = 'estimates' AND COLUMN_NAME = 'status'
              AND DATA_TYPE = 'varchar' AND CHARACTER_MAXIMUM_LENGTH = 255
              AND IS_NULLABLE = 'YES')
          OR (TABLE_NAME = 'estimates' AND COLUMN_NAME = 'chain_id'
              AND DATA_TYPE = 'bigint' AND COLUMN_TYPE = 'bigint'
              AND IS_NULLABLE = 'YES')
          OR (TABLE_NAME = 'estimates' AND COLUMN_NAME = 'client_id'
              AND DATA_TYPE = 'bigint' AND COLUMN_TYPE = 'bigint'
              AND IS_NULLABLE = 'YES')
          OR (TABLE_NAME = 'chains' AND COLUMN_NAME = 'chain_id'
              AND DATA_TYPE = 'bigint' AND COLUMN_TYPE = 'bigint'
              AND IS_NULLABLE = 'NO' AND COLUMN_KEY = 'PRI')
          OR (TABLE_NAME = 'chains' AND COLUMN_NAME = 'group_id'
              AND DATA_TYPE = 'bigint' AND COLUMN_TYPE = 'bigint'
              AND IS_NULLABLE = 'NO')
          OR (TABLE_NAME = 'groups' AND COLUMN_NAME = 'group_id'
              AND DATA_TYPE = 'bigint' AND COLUMN_TYPE = 'bigint'
              AND IS_NULLABLE = 'NO' AND COLUMN_KEY = 'PRI')
          OR (TABLE_NAME = 'groups' AND COLUMN_NAME = 'chain_id'
              AND DATA_TYPE = 'bigint' AND COLUMN_TYPE = 'bigint'
              AND IS_NULLABLE = 'YES')
          OR (TABLE_NAME = 'groups' AND COLUMN_NAME = 'subzone_id'
              AND DATA_TYPE = 'bigint' AND COLUMN_TYPE = 'bigint'
              AND IS_NULLABLE = 'YES')
          OR (TABLE_NAME = 'clients' AND COLUMN_NAME = 'id'
              AND DATA_TYPE = 'bigint' AND COLUMN_TYPE = 'bigint'
              AND IS_NULLABLE = 'NO' AND COLUMN_KEY = 'PRI')
          OR (TABLE_NAME = 'brands' AND COLUMN_NAME = 'brand_id'
              AND DATA_TYPE = 'bigint' AND COLUMN_TYPE = 'bigint'
              AND IS_NULLABLE = 'NO' AND COLUMN_KEY = 'PRI')
          OR (TABLE_NAME = 'brands' AND COLUMN_NAME = 'chain_id'
              AND DATA_TYPE = 'bigint' AND COLUMN_TYPE = 'bigint'
              AND IS_NULLABLE = 'YES')
          OR (TABLE_NAME = 'zones' AND COLUMN_NAME = 'zone_id'
              AND DATA_TYPE = 'int' AND IS_NULLABLE = 'NO'
              AND COLUMN_KEY = 'PRI')
          OR (TABLE_NAME = 'zones' AND COLUMN_NAME = 'brand_id'
              AND DATA_TYPE = 'bigint' AND COLUMN_TYPE = 'bigint'
              AND IS_NULLABLE = 'YES')
      );
    IF v_count <> 16 THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Verified Estimate, Chain, Client, Brand, Zone, or Group column definitions differ; no table changes were made';
    END IF;

    SELECT COUNT(*) INTO v_count
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'estimates'
      AND COLUMN_NAME = 'estimated_id';
    IF v_count <> 0 THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Unexpected estimates.estimated_id column found; inspect prior migration state. No table changes were made';
    END IF;

    SELECT COUNT(DISTINCT CONCAT(
               TABLE_NAME, '.', COLUMN_NAME, '->',
               REFERENCED_TABLE_NAME, '.', REFERENCED_COLUMN_NAME))
    INTO v_count
    FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
    WHERE TABLE_SCHEMA = DATABASE()
      AND REFERENCED_TABLE_NAME IS NOT NULL
      AND REFERENCED_TABLE_SCHEMA = DATABASE()
      AND (
          (TABLE_NAME = 'estimates' AND COLUMN_NAME = 'chain_id'
              AND REFERENCED_TABLE_NAME = 'chains'
              AND REFERENCED_COLUMN_NAME = 'chain_id')
          OR (TABLE_NAME = 'chains' AND COLUMN_NAME = 'group_id'
              AND REFERENCED_TABLE_NAME = 'groups'
              AND REFERENCED_COLUMN_NAME = 'group_id')
          OR (TABLE_NAME = 'estimates' AND COLUMN_NAME = 'client_id'
              AND REFERENCED_TABLE_NAME = 'clients'
              AND REFERENCED_COLUMN_NAME = 'id')
          OR (TABLE_NAME = 'brands' AND COLUMN_NAME = 'chain_id'
              AND REFERENCED_TABLE_NAME = 'chains'
              AND REFERENCED_COLUMN_NAME = 'chain_id')
          OR (TABLE_NAME = 'zones' AND COLUMN_NAME = 'brand_id'
              AND REFERENCED_TABLE_NAME = 'brands'
              AND REFERENCED_COLUMN_NAME = 'brand_id')
      );
    IF v_count <> 5 THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Expected existing Estimate/Chain/Group/Client/Brand/Zone foreign keys were not all found; no table changes were made';
    END IF;

    SELECT COUNT(*) INTO v_count
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'estimates'
      AND COLUMN_NAME IN (
          'brand_id', 'zone_id', 'group_name', 'brand_name', 'zone_name',
          'service', 'qty', 'cost_per_unit', 'total_cost', 'delivery_date',
          'delivery_details', 'updated_at'
      );
    IF v_count <> 0 THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'One or more Task 6 columns already exist; migration may be partial or already applied. No table changes were made; inspect exact definitions before repair or rerun';
    END IF;

    SELECT COUNT(*) INTO v_count
    FROM INFORMATION_SCHEMA.REFERENTIAL_CONSTRAINTS
    WHERE CONSTRAINT_SCHEMA = DATABASE()
      AND CONSTRAINT_NAME IN ('fk_estimates_brand', 'fk_estimates_zone');
    IF v_count <> 0 THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'A proposed Estimate foreign-key constraint name is already used; inspect before migration. No table changes were made';
    END IF;

    ALTER TABLE estimates
        ADD COLUMN brand_id BIGINT NULL,
        ADD COLUMN zone_id INT NULL,
        ADD COLUMN group_name VARCHAR(255) NULL,
        ADD COLUMN brand_name VARCHAR(50) NULL,
        ADD COLUMN zone_name VARCHAR(50) NULL,
        ADD COLUMN service VARCHAR(255) NULL,
        ADD COLUMN qty INT NULL,
        ADD COLUMN cost_per_unit DECIMAL(15,2) NULL,
        ADD COLUMN total_cost DECIMAL(15,2) NULL,
        ADD COLUMN delivery_date DATE NULL,
        ADD COLUMN delivery_details VARCHAR(1000) NULL,
        ADD COLUMN updated_at DATETIME(6) NULL,
        ADD CONSTRAINT fk_estimates_brand
            FOREIGN KEY (brand_id) REFERENCES brands(brand_id)
            ON UPDATE RESTRICT ON DELETE RESTRICT,
        ADD CONSTRAINT fk_estimates_zone
            FOREIGN KEY (zone_id) REFERENCES zones(zone_id)
            ON UPDATE RESTRICT ON DELETE RESTRICT;
END$$
DELIMITER ;

CALL m004_estimate_management_preflight();
DROP PROCEDURE m004_estimate_management_preflight;
