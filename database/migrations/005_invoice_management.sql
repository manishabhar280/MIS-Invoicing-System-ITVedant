-- Add Estimate-linked invoice and exact payment fields without changing
-- existing invoice/payment IDs, legacy columns, or existing records.
-- This migration is manual. Back up the explicitly selected database and
-- stop the application first.
--
-- The 56 column checks below cover only the 56 explicitly listed columns,
-- based on checked-in database/schema.sql; they do not validate every column
-- in all nine tables. This is not a verified live-database inspection. Rehearse
-- against a restored backup/disposable database before production.
--
-- Each ALTER TABLE is independent MySQL DDL and may commit separately. If a
-- later ALTER fails, earlier tables may already be changed. Do not rerun this
-- file blindly: inspect every added column, index, and constraint in all three
-- tables, compare them with this migration, and prepare a reviewed repair or
-- continuation script for only the missing changes. Preserve all existing
-- records and IDs.
--
-- This script deliberately never drops the helper procedure automatically.
-- The reviewed revision uses a distinct helper name so a same-named routine
-- left by an earlier failed attempt does not block its creation.
-- SQL clients differ in whether they continue after a failed CALL, so the
-- helper may remain after either success or failure. After a successful CALL,
-- verify all intended changes, then remove the helper explicitly. After any
-- failure, inspect procedure status and table state; do not drop the helper or
-- rerun this migration until a reviewed recovery plan is in place. If CREATE
-- PROCEDURE reports a name collision, inspect the existing definition and
-- ownership before taking any action.
--
-- Run during a maintenance window and prevent other writers from changing
-- users.username between duplicate detection and unique-index creation.
--
-- All added invoice/payment columns are nullable, so legacy rows retain their
-- existing values and receive NULL for new fields. The new estimate_id FK is
-- nullable; the unique index permits multiple NULL legacy values while
-- preventing more than one newly linked invoice per estimate.
--
-- New DECIMAL columns preserve currency precision. Legacy DOUBLE amount
-- columns and legacy invoice/payment foreign keys remain untouched.
--
-- Keep the same explicitly selected database and client connection throughout.
-- CREATE PROCEDURE is schema-scoped and fails if no database is selected; the
-- procedure also checks DATABASE() before reaching any schema changes.

DELIMITER $$
CREATE PROCEDURE m005_invoice_management_preflight_v2()
main: BEGIN
    DECLARE v_count INT DEFAULT 0;
    DECLARE v_add_username_index TINYINT(1) DEFAULT 1;

    IF DATABASE() IS NULL THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Select the intended database before creating and calling this migration procedure';
    END IF;

    SELECT COUNT(*) INTO v_count
    FROM INFORMATION_SCHEMA.TABLES
    WHERE TABLE_SCHEMA = DATABASE()
      AND ENGINE = 'InnoDB'
      AND TABLE_NAME IN (
          'users', 'clients', 'chains', 'estimates', 'invoices', 'payments',
          'brands', 'zones', 'groups'
      );
    IF v_count <> 9 THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Expected nine existing InnoDB tables; no invoice schema changes were made';
    END IF;

    SELECT COUNT(*) INTO v_count
    FROM (
        SELECT 'users' table_name, 'id' column_name, 'bigint' data_type,
               'NO' is_nullable, NULL char_length, 19 numeric_precision,
               0 numeric_scale, NULL datetime_precision, 0 is_unsigned,
               NULL exact_column_type, 1 is_primary, 1 is_auto_increment
        UNION ALL SELECT 'users', 'username', 'varchar', 'YES', 255, NULL, NULL, NULL, 0, NULL, 0, 0
        UNION ALL SELECT 'users', 'password_hash', 'varchar', 'NO', 255, NULL, NULL, NULL, 0, NULL, 0, 0
        UNION ALL SELECT 'users', 'role', 'varchar', 'YES', 255, NULL, NULL, NULL, 0, NULL, 0, 0
        UNION ALL SELECT 'clients', 'id', 'bigint', 'NO', NULL, 19, 0, NULL, 0, NULL, 1, 1
        UNION ALL SELECT 'clients', 'client_name', 'varchar', 'YES', 255, NULL, NULL, NULL, 0, NULL, 0, 0
        UNION ALL SELECT 'clients', 'organization_name', 'varchar', 'YES', 255, NULL, NULL, NULL, 0, NULL, 0, 0
        UNION ALL SELECT 'clients', 'gst_number', 'varchar', 'YES', 255, NULL, NULL, NULL, 0, NULL, 0, 0
        UNION ALL SELECT 'chains', 'chain_id', 'bigint', 'NO', NULL, 19, 0, NULL, 0, NULL, 1, 1
        UNION ALL SELECT 'chains', 'company_name', 'varchar', 'NO', 255, NULL, NULL, NULL, 0, NULL, 0, 0
        UNION ALL SELECT 'chains', 'gstn_no', 'varchar', 'NO', 15, NULL, NULL, NULL, 0, NULL, 0, 0
        UNION ALL SELECT 'chains', 'is_active', 'bit', 'NO', NULL, 1, 0, NULL, 0, 'bit(1)', 0, 0
        UNION ALL SELECT 'chains', 'created_at', 'datetime', 'NO', NULL, NULL, NULL, 6, 0, NULL, 0, 0
        UNION ALL SELECT 'chains', 'updated_at', 'datetime', 'NO', NULL, NULL, NULL, 6, 0, NULL, 0, 0
        UNION ALL SELECT 'chains', 'group_id', 'bigint', 'NO', NULL, 19, 0, NULL, 0, NULL, 0, 0
        UNION ALL SELECT 'estimates', 'estimate_id', 'bigint', 'NO', NULL, 19, 0, NULL, 0, NULL, 1, 1
        UNION ALL SELECT 'estimates', 'chain_id', 'bigint', 'YES', NULL, 19, 0, NULL, 0, NULL, 0, 0
        UNION ALL SELECT 'estimates', 'client_id', 'bigint', 'YES', NULL, 19, 0, NULL, 0, NULL, 0, 0
        UNION ALL SELECT 'estimates', 'amount', 'decimal', 'NO', NULL, 38, 2, NULL, 0, NULL, 0, 0
        UNION ALL SELECT 'estimates', 'created_at', 'datetime', 'YES', NULL, NULL, NULL, 6, 0, NULL, 0, 0
        UNION ALL SELECT 'estimates', 'status', 'varchar', 'YES', 255, NULL, NULL, NULL, 0, NULL, 0, 0
        UNION ALL SELECT 'estimates', 'brand_id', 'bigint', 'YES', NULL, 19, 0, NULL, 0, NULL, 0, 0
        UNION ALL SELECT 'estimates', 'zone_id', 'int', 'YES', NULL, 10, 0, NULL, 0, NULL, 0, 0
        UNION ALL SELECT 'estimates', 'group_name', 'varchar', 'YES', 255, NULL, NULL, NULL, 0, NULL, 0, 0
        UNION ALL SELECT 'estimates', 'brand_name', 'varchar', 'YES', 50, NULL, NULL, NULL, 0, NULL, 0, 0
        UNION ALL SELECT 'estimates', 'zone_name', 'varchar', 'YES', 50, NULL, NULL, NULL, 0, NULL, 0, 0
        UNION ALL SELECT 'estimates', 'service', 'varchar', 'YES', 255, NULL, NULL, NULL, 0, NULL, 0, 0
        UNION ALL SELECT 'estimates', 'qty', 'int', 'YES', NULL, 10, 0, NULL, 0, NULL, 0, 0
        UNION ALL SELECT 'estimates', 'cost_per_unit', 'decimal', 'YES', NULL, 15, 2, NULL, 0, NULL, 0, 0
        UNION ALL SELECT 'estimates', 'total_cost', 'decimal', 'YES', NULL, 15, 2, NULL, 0, NULL, 0, 0
        UNION ALL SELECT 'estimates', 'delivery_date', 'date', 'YES', NULL, NULL, NULL, NULL, 0, NULL, 0, 0
        UNION ALL SELECT 'estimates', 'delivery_details', 'varchar', 'YES', 1000, NULL, NULL, NULL, 0, NULL, 0, 0
        UNION ALL SELECT 'estimates', 'updated_at', 'datetime', 'YES', NULL, NULL, NULL, 6, 0, NULL, 0, 0
        UNION ALL SELECT 'invoices', 'id', 'bigint', 'NO', NULL, 19, 0, NULL, 0, NULL, 1, 1
        UNION ALL SELECT 'invoices', 'client_id', 'bigint', 'YES', NULL, 19, 0, NULL, 0, NULL, 0, 0
        UNION ALL SELECT 'invoices', 'taxable_amount', 'double', 'YES', NULL, NULL, NULL, NULL, 0, NULL, 0, 0
        UNION ALL SELECT 'invoices', 'gst_rate', 'double', 'YES', NULL, NULL, NULL, NULL, 0, NULL, 0, 0
        UNION ALL SELECT 'invoices', 'gst_amount', 'double', 'YES', NULL, NULL, NULL, NULL, 0, NULL, 0, 0
        UNION ALL SELECT 'invoices', 'total_amount', 'double', 'YES', NULL, NULL, NULL, NULL, 0, NULL, 0, 0
        UNION ALL SELECT 'invoices', 'status', 'varchar', 'YES', 255, NULL, NULL, NULL, 0, NULL, 0, 0
        UNION ALL SELECT 'invoices', 'invoice_date', 'date', 'YES', NULL, NULL, NULL, NULL, 0, NULL, 0, 0
        UNION ALL SELECT 'payments', 'id', 'bigint', 'NO', NULL, 19, 0, NULL, 0, NULL, 1, 1
        UNION ALL SELECT 'payments', 'invoice_id', 'bigint', 'YES', NULL, 19, 0, NULL, 0, NULL, 0, 0
        UNION ALL SELECT 'payments', 'amount_paid', 'double', 'YES', NULL, NULL, NULL, NULL, 0, NULL, 0, 0
        UNION ALL SELECT 'payments', 'payment_date', 'date', 'YES', NULL, NULL, NULL, NULL, 0, NULL, 0, 0
        UNION ALL SELECT 'payments', 'payment_mode', 'varchar', 'YES', 255, NULL, NULL, NULL, 0, NULL, 0, 0
        UNION ALL SELECT 'brands', 'brand_id', 'bigint', 'NO', NULL, 19, 0, NULL, 0, NULL, 1, 1
        UNION ALL SELECT 'brands', 'brand_name', 'varchar', 'NO', 50, NULL, NULL, NULL, 0, NULL, 0, 0
        UNION ALL SELECT 'brands', 'chain_id', 'bigint', 'YES', NULL, 19, 0, NULL, 0, NULL, 0, 0
        UNION ALL SELECT 'brands', 'is_active', 'tinyint', 'NO', NULL, 3, 0, NULL, 0, 'tinyint(1)', 0, 0
        UNION ALL SELECT 'zones', 'zone_id', 'int', 'NO', NULL, 10, 0, NULL, 0, NULL, 1, 1
        UNION ALL SELECT 'zones', 'zone_name', 'varchar', 'NO', 50, NULL, NULL, NULL, 0, NULL, 0, 0
        UNION ALL SELECT 'zones', 'brand_id', 'bigint', 'YES', NULL, 19, 0, NULL, 0, NULL, 0, 0
        UNION ALL SELECT 'zones', 'is_active', 'bit', 'NO', NULL, 1, 0, NULL, 0, 'bit(1)', 0, 0
        UNION ALL SELECT 'groups', 'group_id', 'bigint', 'NO', NULL, 19, 0, NULL, 0, NULL, 1, 1
        UNION ALL SELECT 'groups', 'group_name', 'varchar', 'NO', 255, NULL, NULL, NULL, 0, NULL, 0, 0
    ) e
    LEFT JOIN INFORMATION_SCHEMA.COLUMNS c
      ON c.TABLE_SCHEMA = DATABASE()
     AND c.TABLE_NAME = e.table_name
     AND c.COLUMN_NAME = e.column_name
    WHERE c.COLUMN_NAME IS NULL
       OR c.DATA_TYPE <> e.data_type
       OR c.IS_NULLABLE <> e.is_nullable
       OR NOT (c.CHARACTER_MAXIMUM_LENGTH <=> e.char_length)
       OR (e.data_type NOT IN ('double', 'bit')
           AND NOT (c.NUMERIC_PRECISION <=> e.numeric_precision))
       OR (e.data_type NOT IN ('double', 'bit')
           AND NOT (c.NUMERIC_SCALE <=> e.numeric_scale))
       OR NOT (c.DATETIME_PRECISION <=> e.datetime_precision)
       OR (e.is_unsigned = 1 AND c.COLUMN_TYPE NOT LIKE '%unsigned%')
       OR (e.is_unsigned = 0 AND c.COLUMN_TYPE LIKE '%unsigned%')
       OR (e.exact_column_type IS NOT NULL AND c.COLUMN_TYPE <> e.exact_column_type)
       OR ((e.is_primary = 1) <> (c.COLUMN_KEY = 'PRI'))
       OR ((e.is_auto_increment = 1) <> (LOCATE('auto_increment', c.EXTRA) > 0));
    IF v_count <> 0 THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'One or more legacy columns differ from the checked-in schema contract; no invoice schema changes were made';
    END IF;

    SELECT COUNT(*) INTO v_count
    FROM (
        SELECT 'users' table_name, 'id' column_name
        UNION ALL SELECT 'clients', 'id'
        UNION ALL SELECT 'chains', 'chain_id'
        UNION ALL SELECT 'estimates', 'estimate_id'
        UNION ALL SELECT 'invoices', 'id'
        UNION ALL SELECT 'payments', 'id'
        UNION ALL SELECT 'brands', 'brand_id'
        UNION ALL SELECT 'zones', 'zone_id'
        UNION ALL SELECT 'groups', 'group_id'
    ) expected_pk
    WHERE (
        SELECT COUNT(*)
        FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE pk
        WHERE pk.TABLE_SCHEMA = DATABASE()
          AND pk.TABLE_NAME = expected_pk.table_name
          AND pk.CONSTRAINT_NAME = 'PRIMARY'
    ) <> 1 OR NOT EXISTS (
        SELECT 1
        FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE pk
        WHERE pk.TABLE_SCHEMA = DATABASE()
         AND pk.TABLE_NAME = expected_pk.table_name
         AND pk.COLUMN_NAME = expected_pk.column_name
         AND pk.CONSTRAINT_NAME = 'PRIMARY'
    );
    IF v_count <> 0 THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'A legacy table primary key differs from the checked-in schema contract';
    END IF;

    SELECT COUNT(*) INTO v_count
    FROM (
        SELECT 'invoices' source_table, 'client_id' source_column,
               'clients' referenced_table, 'id' referenced_column
        UNION ALL SELECT 'payments', 'invoice_id', 'invoices', 'id'
        UNION ALL SELECT 'estimates', 'chain_id', 'chains', 'chain_id'
        UNION ALL SELECT 'chains', 'group_id', 'groups', 'group_id'
        UNION ALL SELECT 'estimates', 'brand_id', 'brands', 'brand_id'
        UNION ALL SELECT 'estimates', 'zone_id', 'zones', 'zone_id'
    ) e
    WHERE (
        SELECT COUNT(DISTINCT k.CONSTRAINT_NAME)
        FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE k
        JOIN INFORMATION_SCHEMA.COLUMNS src
          ON src.TABLE_SCHEMA = k.TABLE_SCHEMA
         AND src.TABLE_NAME = k.TABLE_NAME
         AND src.COLUMN_NAME = k.COLUMN_NAME
        JOIN INFORMATION_SCHEMA.COLUMNS dst
          ON dst.TABLE_SCHEMA = k.REFERENCED_TABLE_SCHEMA
         AND dst.TABLE_NAME = k.REFERENCED_TABLE_NAME
         AND dst.COLUMN_NAME = k.REFERENCED_COLUMN_NAME
        WHERE k.TABLE_SCHEMA = DATABASE()
          AND k.REFERENCED_TABLE_SCHEMA = DATABASE()
          AND k.TABLE_NAME = e.source_table
          AND k.COLUMN_NAME = e.source_column
          AND k.REFERENCED_TABLE_NAME = e.referenced_table
          AND k.REFERENCED_COLUMN_NAME = e.referenced_column
          AND src.DATA_TYPE = dst.DATA_TYPE
          AND src.NUMERIC_PRECISION <=> dst.NUMERIC_PRECISION
          AND src.NUMERIC_SCALE <=> dst.NUMERIC_SCALE
          AND ((src.COLUMN_TYPE LIKE '%unsigned%') = (dst.COLUMN_TYPE LIKE '%unsigned%'))
          AND (
              SELECT COUNT(*)
              FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE all_parts
              WHERE all_parts.TABLE_SCHEMA = k.TABLE_SCHEMA
                AND all_parts.TABLE_NAME = k.TABLE_NAME
                AND all_parts.CONSTRAINT_NAME = k.CONSTRAINT_NAME
          ) = 1
    ) <> 1 OR (
        SELECT COUNT(DISTINCT source_fk.CONSTRAINT_NAME)
        FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE source_fk
        WHERE source_fk.TABLE_SCHEMA = DATABASE()
          AND source_fk.TABLE_NAME = e.source_table
          AND source_fk.COLUMN_NAME = e.source_column
          AND source_fk.REFERENCED_TABLE_NAME IS NOT NULL
    ) <> 1;
    IF v_count <> 0 THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'All six single-column foreign keys and compatible referenced-column types must match; no invoice schema changes were made';
    END IF;

    SELECT COUNT(*) INTO v_count
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND (
          (TABLE_NAME = 'invoices' AND COLUMN_NAME IN (
              'invoice_number', 'estimate_id', 'company_name_snapshot',
              'company_gstn_no_snapshot', 'customer_name_snapshot',
              'customer_organization_snapshot', 'client_email',
              'service_description', 'quantity', 'unit_price_decimal',
              'taxable_amount_decimal', 'gst_rate_decimal', 'gst_amount_decimal',
              'total_amount_decimal', 'service_date', 'delivery_details',
              'payment_instructions'))
          OR (TABLE_NAME = 'payments' AND COLUMN_NAME IN (
              'amount_paid_decimal', 'idempotency_key'))
      );
    IF v_count <> 0 THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Invoice Task 7 columns already exist; inspect prior migration state and do not rerun';
    END IF;

    SELECT COUNT(*) INTO v_count
    FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
    WHERE CONSTRAINT_SCHEMA = DATABASE()
      AND CONSTRAINT_NAME = 'fk_invoice_estimate';
    IF v_count <> 0 THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Constraint name fk_invoice_estimate is already in use; inspect it before migration';
    END IF;

    SELECT COUNT(*) INTO v_count
    FROM INFORMATION_SCHEMA.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND (
          (TABLE_NAME = 'invoices' AND INDEX_NAME IN (
              'uk_invoice_number', 'uk_invoice_estimate', 'idx_invoices_status_date'))
          OR (TABLE_NAME = 'payments' AND INDEX_NAME IN (
              'uk_payment_idempotency_key', 'idx_payments_invoice_date'))
      );
    IF v_count <> 0 THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'A Task 7 index name is already in use; inspect prior migration state and do not rerun';
    END IF;

    SELECT COUNT(*) INTO v_count
    FROM INFORMATION_SCHEMA.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'users'
      AND INDEX_NAME = 'uk_users_username'
      AND NOT (
          NON_UNIQUE = 0
          AND COLUMN_NAME = 'username'
          AND SEQ_IN_INDEX = 1
          AND SUB_PART IS NULL
          AND (
              SELECT COUNT(*)
              FROM INFORMATION_SCHEMA.STATISTICS same_index
              WHERE same_index.TABLE_SCHEMA = DATABASE()
                AND same_index.TABLE_NAME = 'users'
                AND same_index.INDEX_NAME = 'uk_users_username'
          ) = 1
      );
    IF v_count <> 0 THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Index name uk_users_username exists with an unexpected definition';
    END IF;

    SELECT COUNT(*) INTO v_count
    FROM (
        SELECT username
        FROM users
        WHERE username IS NOT NULL
        GROUP BY username
        HAVING COUNT(*) > 1
    ) duplicate_usernames;
    IF v_count <> 0 THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Duplicate usernames under the current column collation prevent a safe unique index; resolve using verified account data';
    END IF;

    SELECT COUNT(*) INTO v_count
    FROM (
        SELECT INDEX_NAME
        FROM INFORMATION_SCHEMA.STATISTICS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'users'
        GROUP BY INDEX_NAME
        HAVING MIN(NON_UNIQUE) = 0
           AND COUNT(*) = 1
           AND SUM(
               CASE
                   WHEN COLUMN_NAME = 'username'
                    AND SEQ_IN_INDEX = 1
                    AND SUB_PART IS NULL
                   THEN 1 ELSE 0
               END
           ) = 1
    ) equivalent_username_indexes;
    IF v_count > 0 THEN
        SET v_add_username_index = 0;
    END IF;

    ALTER TABLE invoices
        ADD COLUMN invoice_number VARCHAR(32) NULL,
        ADD COLUMN estimate_id BIGINT NULL,
        ADD COLUMN company_name_snapshot VARCHAR(255) NULL,
        ADD COLUMN company_gstn_no_snapshot VARCHAR(15) NULL,
        ADD COLUMN customer_name_snapshot VARCHAR(255) NULL,
        ADD COLUMN customer_organization_snapshot VARCHAR(255) NULL,
        ADD COLUMN client_email VARCHAR(320) NULL,
        ADD COLUMN service_description VARCHAR(255) NULL,
        ADD COLUMN quantity INT NULL,
        ADD COLUMN unit_price_decimal DECIMAL(15,2) NULL,
        ADD COLUMN taxable_amount_decimal DECIMAL(15,2) NULL,
        ADD COLUMN gst_rate_decimal DECIMAL(5,4) NULL,
        ADD COLUMN gst_amount_decimal DECIMAL(15,2) NULL,
        ADD COLUMN total_amount_decimal DECIMAL(15,2) NULL,
        ADD COLUMN service_date DATE NULL,
        ADD COLUMN delivery_details VARCHAR(1000) NULL,
        ADD COLUMN payment_instructions VARCHAR(500) NULL,
        ADD UNIQUE KEY uk_invoice_number (invoice_number),
        ADD UNIQUE KEY uk_invoice_estimate (estimate_id),
        ADD KEY idx_invoices_status_date (status, invoice_date),
        ADD CONSTRAINT fk_invoice_estimate
            FOREIGN KEY (estimate_id) REFERENCES estimates(estimate_id)
            ON UPDATE RESTRICT ON DELETE RESTRICT;

    ALTER TABLE payments
        ADD COLUMN amount_paid_decimal DECIMAL(15,2) NULL,
        ADD COLUMN idempotency_key VARCHAR(64) NULL,
        ADD UNIQUE KEY uk_payment_idempotency_key (idempotency_key),
        ADD KEY idx_payments_invoice_date (invoice_id, payment_date);

    IF v_add_username_index = 1 THEN
        ALTER TABLE users
            ADD UNIQUE KEY uk_users_username (username);
    END IF;
END$$
DELIMITER ;

CALL m005_invoice_management_preflight_v2();
-- Do not add automatic procedure cleanup here: some clients continue after a
-- failed CALL. After a successful CALL, verify all three tables and then
-- explicitly run DROP PROCEDURE m005_invoice_management_preflight_v2.
--
-- Recovery after any failure:
-- 1. Stop the script and prevent application/other writers from changing the
--    affected tables. Take a fresh backup before any repair.
-- 2. Inspect columns, indexes, constraints, and the helper procedure in each
--    affected table. Compare actual state with all three ALTER statements.
-- 3. Do not rerun this file if any Task 7 column exists. Create and review a
--    continuation script containing only missing operations; verify its
--    preconditions and expected resulting schema on a disposable restore.
-- 4. Remove this helper only after verifying its definition/name and after the
--    repair plan no longer needs it. Do not remove or replace an unrelated
--    routine with the same name.
