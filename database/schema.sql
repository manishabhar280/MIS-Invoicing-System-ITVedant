CREATE DATABASE IF NOT EXISTS ims_db;
USE ims_db;

CREATE TABLE IF NOT EXISTS users (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(255),
    username VARCHAR(255),
    CONSTRAINT uk_users_username UNIQUE (username)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS subzones (
    subzone_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    subzone_name VARCHAR(255) NOT NULL
);

CREATE TABLE IF NOT EXISTS `groups` (
    group_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    group_name VARCHAR(255) NOT NULL,
    chain_id BIGINT NULL,
    subzone_id BIGINT NULL,
    created_at DATETIME(6) NOT NULL,
    is_active BIT(1) NOT NULL,
    updated_at DATETIME(6) NOT NULL,
    CONSTRAINT uk_group_name UNIQUE (group_name),
    FOREIGN KEY (subzone_id) REFERENCES subzones(subzone_id)
);

CREATE TABLE IF NOT EXISTS chains (
    chain_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    company_name VARCHAR(255) NOT NULL,
    gstn_no VARCHAR(15) NOT NULL UNIQUE,
    is_active BIT(1) NOT NULL,
    created_at DATETIME(6) NOT NULL,
    updated_at DATETIME(6) NOT NULL,
    group_id BIGINT NOT NULL,
    FOREIGN KEY (group_id) REFERENCES `groups`(group_id)
);

CREATE TABLE IF NOT EXISTS brands (
    brand_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    brand_name VARCHAR(50) NOT NULL,
    chain_id BIGINT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at DATETIME NOT NULL,
    updated_at DATETIME NOT NULL,
    CONSTRAINT fk_brands_chain FOREIGN KEY (chain_id) REFERENCES chains(chain_id)
);

CREATE TABLE IF NOT EXISTS zones (
    zone_id INT AUTO_INCREMENT PRIMARY KEY,
    zone_name VARCHAR(50) NOT NULL,
    brand_id BIGINT NULL,
    is_active BIT(1) NOT NULL,
    created_at DATETIME(6) NOT NULL,
    updated_at DATETIME(6) NOT NULL,
    INDEX idx_zones_brand_id (brand_id),
    CONSTRAINT fk_zones_brand FOREIGN KEY (brand_id) REFERENCES brands(brand_id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS clients (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    client_name VARCHAR(255),
    organization_name VARCHAR(255),
    gst_number VARCHAR(255),
    group_id BIGINT,
    brand_id BIGINT,
    FOREIGN KEY (group_id) REFERENCES `groups`(group_id),
    FOREIGN KEY (brand_id) REFERENCES brands(brand_id)
);

CREATE TABLE IF NOT EXISTS estimates (
    estimate_id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    chain_id BIGINT NULL,
    client_id BIGINT NULL,
    amount DECIMAL(38, 2) NOT NULL,
    created_at DATETIME(6) NULL,
    status VARCHAR(255) NULL,
    brand_id BIGINT NULL,
    zone_id INT NULL,
    group_name VARCHAR(255) NULL,
    brand_name VARCHAR(50) NULL,
    zone_name VARCHAR(50) NULL,
    service VARCHAR(255) NULL,
    qty INT NULL,
    cost_per_unit DECIMAL(15, 2) NULL,
    total_cost DECIMAL(15, 2) NULL,
    delivery_date DATE NULL,
    delivery_details VARCHAR(1000) NULL,
    updated_at DATETIME(6) NULL,
    CONSTRAINT fk_estimates_chain FOREIGN KEY (chain_id) REFERENCES chains(chain_id),
    CONSTRAINT fk_estimates_brand FOREIGN KEY (brand_id) REFERENCES brands(brand_id),
    CONSTRAINT fk_estimates_zone FOREIGN KEY (zone_id) REFERENCES zones(zone_id),
    CONSTRAINT fk_estimates_client_legacy FOREIGN KEY (client_id) REFERENCES clients(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS invoices (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    client_id BIGINT,
    taxable_amount DOUBLE,
    gst_rate DOUBLE,
    gst_amount DOUBLE,
    total_amount DOUBLE,
    status VARCHAR(255),
    invoice_date DATE,
    invoice_number VARCHAR(32) NULL,
    estimate_id BIGINT NULL,
    company_name_snapshot VARCHAR(255) NULL,
    company_gstn_no_snapshot VARCHAR(15) NULL,
    customer_name_snapshot VARCHAR(255) NULL,
    customer_organization_snapshot VARCHAR(255) NULL,
    client_email VARCHAR(320) NULL,
    service_description VARCHAR(255) NULL,
    quantity INT NULL,
    unit_price_decimal DECIMAL(15, 2) NULL,
    taxable_amount_decimal DECIMAL(15, 2) NULL,
    gst_rate_decimal DECIMAL(5, 4) NULL,
    gst_amount_decimal DECIMAL(15, 2) NULL,
    total_amount_decimal DECIMAL(15, 2) NULL,
    service_date DATE NULL,
    delivery_details VARCHAR(1000) NULL,
    payment_instructions VARCHAR(500) NULL,
    CONSTRAINT uk_invoice_number UNIQUE (invoice_number),
    CONSTRAINT uk_invoice_estimate UNIQUE (estimate_id),
    INDEX idx_invoices_status_date (status, invoice_date),
    CONSTRAINT fk_invoice_estimate FOREIGN KEY (estimate_id) REFERENCES estimates(estimate_id)
        ON UPDATE RESTRICT ON DELETE RESTRICT,
    FOREIGN KEY (client_id) REFERENCES clients(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS payments (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    invoice_id BIGINT,
    amount_paid DOUBLE,
    payment_date DATE,
    payment_mode VARCHAR(255),
    amount_paid_decimal DECIMAL(15, 2) NULL,
    idempotency_key VARCHAR(64) NULL,
    CONSTRAINT uk_payment_idempotency_key UNIQUE (idempotency_key),
    INDEX idx_payments_invoice_date (invoice_id, payment_date),
    FOREIGN KEY (invoice_id) REFERENCES invoices(id)
) ENGINE=InnoDB;