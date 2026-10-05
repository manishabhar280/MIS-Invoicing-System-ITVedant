-- Safely upgrade the legacy chains/groups relationship to the Task 3 schema.
-- Back up the database before running this script. It is intended for MySQL.
--
-- Existing chain names are copied from chain_name when company_name is blank.
-- Existing groups.chain_id values are copied only when exactly one Group maps
-- to a Chain. Existing GSTNs are uppercased but never trimmed or invented.
-- Missing GSTNs and ambiguous/missing Group mappings stop the migration before
-- constraints are tightened or legacy columns are removed. Manually map those
-- rows to verified business data, then rerun this script.
-- For manual review, inspect:
--   SELECT chain_id, company_name, gstn_no, group_id FROM chains;
--   SELECT group_id, group_name, chain_id FROM `groups`;
-- Set missing chains.gstn_no to the verified GSTIN and chains.group_id to the
-- verified groups.group_id. Do not infer either value from unrelated data.
--
-- When legacy timestamps/status are absent or NULL, migration time/active are
-- used as explicit defaults; these are not historical values.
--
-- Hibernate is configured with ddl-auto=update; run this migration before
-- starting the application against an existing database. Hibernate update is
-- not a substitute for this data-preserving rename/backfill.

USE codeb_ims;

DROP PROCEDURE IF EXISTS migrate_task3_chain_schema;
DELIMITER $$
CREATE PROCEDURE migrate_task3_chain_schema()
BEGIN
    DECLARE v_count INT DEFAULT 0;

    IF NOT EXISTS (
        SELECT 1
        FROM INFORMATION_SCHEMA.TABLES
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'chains'
    ) OR NOT EXISTS (
        SELECT 1
        FROM INFORMATION_SCHEMA.TABLES
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'groups'
    ) THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Expected chains and groups tables; no migration changes were applied';
    END IF;

    SET @ddl = IF(
        (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'chains'
           AND COLUMN_NAME = 'company_name') = 0,
        'ALTER TABLE chains ADD COLUMN company_name VARCHAR(255) NULL',
        'DO 0'
    );
    PREPARE migration_stmt FROM @ddl;
    EXECUTE migration_stmt;
    DEALLOCATE PREPARE migration_stmt;

    SET @ddl = IF(
        (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'chains'
           AND COLUMN_NAME = 'gstn_no') = 0,
        'ALTER TABLE chains ADD COLUMN gstn_no VARCHAR(15) NULL',
        'DO 0'
    );
    PREPARE migration_stmt FROM @ddl;
    EXECUTE migration_stmt;
    DEALLOCATE PREPARE migration_stmt;

    SET @ddl = IF(
        (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'chains'
           AND COLUMN_NAME = 'is_active') = 0,
        'ALTER TABLE chains ADD COLUMN is_active BOOLEAN NULL',
        'DO 0'
    );
    PREPARE migration_stmt FROM @ddl;
    EXECUTE migration_stmt;
    DEALLOCATE PREPARE migration_stmt;

    SET @ddl = IF(
        (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'chains'
           AND COLUMN_NAME = 'created_at') = 0,
        'ALTER TABLE chains ADD COLUMN created_at DATETIME NULL',
        'DO 0'
    );
    PREPARE migration_stmt FROM @ddl;
    EXECUTE migration_stmt;
    DEALLOCATE PREPARE migration_stmt;

    SET @ddl = IF(
        (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'chains'
           AND COLUMN_NAME = 'updated_at') = 0,
        'ALTER TABLE chains ADD COLUMN updated_at DATETIME NULL',
        'DO 0'
    );
    PREPARE migration_stmt FROM @ddl;
    EXECUTE migration_stmt;
    DEALLOCATE PREPARE migration_stmt;

    SET @ddl = IF(
        (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'chains'
           AND COLUMN_NAME = 'group_id') = 0,
        'ALTER TABLE chains ADD COLUMN group_id INT NULL',
        'DO 0'
    );
    PREPARE migration_stmt FROM @ddl;
    EXECUTE migration_stmt;
    DEALLOCATE PREPARE migration_stmt;

    IF EXISTS (
        SELECT 1
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'chains'
          AND COLUMN_NAME = 'chain_name'
    ) THEN
        SET @too_long_company_names = 0;
        SET @check_legacy_names =
            'SELECT COUNT(*) INTO @too_long_company_names
             FROM chains WHERE CHAR_LENGTH(chain_name) > 255';
        PREPARE migration_stmt FROM @check_legacy_names;
        EXECUTE migration_stmt;
        DEALLOCATE PREPARE migration_stmt;

        IF @too_long_company_names > 0 THEN
            SIGNAL SQLSTATE '45000'
                SET MESSAGE_TEXT = 'Some legacy chain_name values exceed 255 characters; review them before retrying';
        END IF;

        SET @copy_company_names =
            'UPDATE chains
             SET company_name = chain_name
             WHERE (company_name IS NULL OR CHAR_LENGTH(TRIM(company_name)) = 0)
               AND chain_name IS NOT NULL';
        PREPARE migration_stmt FROM @copy_company_names;
        EXECUTE migration_stmt;
        DEALLOCATE PREPARE migration_stmt;
    END IF;

    UPDATE chains
    SET is_active = TRUE
    WHERE is_active IS NULL;

    UPDATE chains
    SET created_at = CURRENT_TIMESTAMP
    WHERE created_at IS NULL;

    UPDATE chains
    SET updated_at = created_at
    WHERE updated_at IS NULL;

    UPDATE chains
    SET gstn_no = UPPER(gstn_no)
    WHERE gstn_no IS NOT NULL;

    IF EXISTS (
        SELECT 1
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'groups'
          AND COLUMN_NAME = 'chain_id'
    ) THEN
        SET @map_legacy_groups =
            'UPDATE chains c
             JOIN (
                 SELECT chain_id, MIN(group_id) AS group_id
                 FROM `groups`
                 GROUP BY chain_id
                 HAVING COUNT(*) = 1
             ) g ON g.chain_id = c.chain_id
             SET c.group_id = g.group_id
             WHERE c.group_id IS NULL';
        PREPARE migration_stmt FROM @map_legacy_groups;
        EXECUTE migration_stmt;
        DEALLOCATE PREPARE migration_stmt;
    END IF;

    SELECT COUNT(*) INTO v_count
    FROM chains
    WHERE company_name IS NULL
       OR TRIM(company_name) = ''
       OR CHAR_LENGTH(company_name) > 255;
    IF v_count > 0 THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Chain company_name needs verified manual values; no legacy columns were removed';
    END IF;

    SELECT COUNT(*) INTO v_count
    FROM chains
    WHERE gstn_no IS NULL
       OR CHAR_LENGTH(gstn_no) <> 15
       OR gstn_no <> TRIM(gstn_no)
       OR gstn_no <> UPPER(gstn_no)
       OR gstn_no NOT REGEXP '^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9]Z[A-Z0-9]$';
    IF v_count > 0 THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Missing or invalid GSTN values require verified manual mapping; no legacy columns were removed';
    END IF;

    SELECT COUNT(*) INTO v_count
    FROM (
        SELECT gstn_no
        FROM chains
        GROUP BY gstn_no
        HAVING COUNT(*) > 1
    ) duplicates;
    IF v_count > 0 THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Duplicate GSTN values require manual resolution; no legacy columns were removed';
    END IF;

    SELECT COUNT(*) INTO v_count
    FROM chains c
    LEFT JOIN `groups` g ON g.group_id = c.group_id
    WHERE c.group_id IS NULL OR g.group_id IS NULL;
    IF v_count > 0 THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Missing, ambiguous, or invalid Group mappings require verified manual mapping; no legacy columns were removed';
    END IF;

    SELECT COUNT(*) INTO v_count
    FROM chains
    WHERE group_id < -2147483648 OR group_id > 2147483647;
    IF v_count > 0 THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Group IDs exceed the required INT range; no column types were narrowed';
    END IF;

    ALTER TABLE chains
        MODIFY COLUMN company_name VARCHAR(255) NOT NULL,
        MODIFY COLUMN gstn_no VARCHAR(15) NOT NULL,
        MODIFY COLUMN is_active BOOLEAN NOT NULL,
        MODIFY COLUMN created_at DATETIME NOT NULL,
        MODIFY COLUMN updated_at DATETIME NOT NULL,
        MODIFY COLUMN group_id INT NOT NULL;

    SELECT COUNT(*) INTO v_count
    FROM (
        SELECT INDEX_NAME
        FROM INFORMATION_SCHEMA.STATISTICS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'chains'
          AND NON_UNIQUE = 0
          AND SUB_PART IS NULL
        GROUP BY INDEX_NAME
        HAVING COUNT(*) = 1 AND MAX(COLUMN_NAME = 'gstn_no') = 1
    ) gstn_unique_indexes;
    IF v_count = 0 THEN
        ALTER TABLE chains
            ADD CONSTRAINT uk_chains_gstn_no UNIQUE (gstn_no);
    END IF;

    SELECT COUNT(*) INTO v_count
    FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'chains'
      AND COLUMN_NAME = 'group_id'
      AND REFERENCED_TABLE_NAME = 'groups'
      AND REFERENCED_COLUMN_NAME = 'group_id';
    IF v_count = 0 THEN
        ALTER TABLE chains
            ADD CONSTRAINT fk_chains_group
            FOREIGN KEY (group_id) REFERENCES `groups` (group_id);
    END IF;

    IF EXISTS (
        SELECT 1
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'groups'
          AND COLUMN_NAME = 'chain_id'
    ) THEN
        SELECT GROUP_CONCAT(
                   CONCAT('DROP FOREIGN KEY `', REPLACE(CONSTRAINT_NAME, '`', '``'), '`')
                   SEPARATOR ', '
               )
        INTO @legacy_group_fk_drops
        FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'groups'
          AND COLUMN_NAME = 'chain_id'
          AND REFERENCED_TABLE_NAME IS NOT NULL;

        SET @drop_legacy_group_chain =
            CONCAT('ALTER TABLE `groups` ',
                   IF(@legacy_group_fk_drops IS NULL, '',
                      CONCAT(@legacy_group_fk_drops, ', ')),
                   'DROP COLUMN chain_id');
        PREPARE migration_stmt FROM @drop_legacy_group_chain;
        EXECUTE migration_stmt;
        DEALLOCATE PREPARE migration_stmt;
    END IF;

    IF EXISTS (
        SELECT 1
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'chains'
          AND COLUMN_NAME = 'chain_name'
    ) THEN
        ALTER TABLE chains DROP COLUMN chain_name;
    END IF;
END$$
DELIMITER ;

CALL migrate_task3_chain_schema();
DROP PROCEDURE migrate_task3_chain_schema;
