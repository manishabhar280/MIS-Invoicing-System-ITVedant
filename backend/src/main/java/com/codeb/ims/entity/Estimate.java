package com.codeb.ims.entity;

import jakarta.persistence.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "estimates")
public class Estimate {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "estimate_id")
    private Long estimatedId;

    @ManyToOne(optional = true)
    @JoinColumn(name = "chain_id", nullable = true)
    private Chain chain;

    @ManyToOne
    @JoinColumn(
            name = "brand_id",
            nullable = true,
            foreignKey = @ForeignKey(name = "fk_estimates_brand"))
    private Brand brand;

    @ManyToOne
    @JoinColumn(
            name = "zone_id",
            nullable = true,
            columnDefinition = "INT",
            foreignKey = @ForeignKey(name = "fk_estimates_zone"))
    private Zone zone;

    @Column(name = "group_name", length = 255)
    private String groupName;

    @Column(name = "brand_name", length = 50)
    private String brandName;

    @Column(name = "zone_name", length = 50)
    private String zoneName;

    @Column(name = "service", length = 255)
    private String service;

    @Column(name = "qty")
    private Integer qty;

    @Column(name = "cost_per_unit", precision = 15, scale = 2)
    private BigDecimal costPerUnit;

    @Column(name = "total_cost", precision = 15, scale = 2)
    private BigDecimal totalCost;

    @Column(name = "delivery_date")
    private LocalDate deliveryDate;

    @Column(name = "delivery_details", length = 1000)
    private String deliveryDetails;

    @Column(name = "created_at", nullable = true, columnDefinition = "DATETIME(6)")
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = true, columnDefinition = "DATETIME(6)")
    private LocalDateTime updatedAt;

    // These legacy fields remain mapped so old estimates stay readable.
    @Column(name = "client_id")
    private Long legacyClientId;

    @Column(name = "amount", precision = 38, scale = 2, nullable = false)
    private BigDecimal legacyAmount;

    @Column(name = "status", length = 255)
    private String legacyStatus;

    public Estimate() {
    }

    @PrePersist
    protected void onCreate() {
        LocalDateTime now = LocalDateTime.now();
        createdAt = now;
        updatedAt = now;
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }

    public Long getEstimatedId() {
        return estimatedId;
    }

    public void setEstimatedId(Long estimatedId) {
        this.estimatedId = estimatedId;
    }

    public Chain getChain() {
        return chain;
    }

    public void setChain(Chain chain) {
        this.chain = chain;
    }

    public Brand getBrand() {
        return brand;
    }

    public void setBrand(Brand brand) {
        this.brand = brand;
    }

    public Zone getZone() {
        return zone;
    }

    public void setZone(Zone zone) {
        this.zone = zone;
    }

    public String getGroupName() {
        return groupName;
    }

    public void setGroupName(String groupName) {
        this.groupName = groupName;
    }

    public String getBrandName() {
        return brandName;
    }

    public void setBrandName(String brandName) {
        this.brandName = brandName;
    }

    public String getZoneName() {
        return zoneName;
    }

    public void setZoneName(String zoneName) {
        this.zoneName = zoneName;
    }

    public String getService() {
        return service;
    }

    public void setService(String service) {
        this.service = service;
    }

    public Integer getQty() {
        return qty;
    }

    public void setQty(Integer qty) {
        this.qty = qty;
    }

    public BigDecimal getCostPerUnit() {
        return costPerUnit;
    }

    public void setCostPerUnit(BigDecimal costPerUnit) {
        this.costPerUnit = costPerUnit;
    }

    public BigDecimal getTotalCost() {
        return totalCost;
    }

    public void setTotalCost(BigDecimal totalCost) {
        this.totalCost = totalCost;
    }

    public LocalDate getDeliveryDate() {
        return deliveryDate;
    }

    public void setDeliveryDate(LocalDate deliveryDate) {
        this.deliveryDate = deliveryDate;
    }

    public String getDeliveryDetails() {
        return deliveryDetails;
    }

    public void setDeliveryDetails(String deliveryDetails) {
        this.deliveryDetails = deliveryDetails;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }

    public Long getLegacyClientId() {
        return legacyClientId;
    }

    public void setLegacyClientId(Long legacyClientId) {
        this.legacyClientId = legacyClientId;
    }

    public BigDecimal getLegacyAmount() {
        return legacyAmount;
    }

    public void setLegacyAmount(BigDecimal legacyAmount) {
        this.legacyAmount = legacyAmount;
    }

    public String getLegacyStatus() {
        return legacyStatus;
    }

    public void setLegacyStatus(String legacyStatus) {
        this.legacyStatus = legacyStatus;
    }
}
