package com.codeb.ims.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

public class EstimateResponseDTO {
    private final String estimatedId;
    private final String chainId;
    private final String companyName;
    private final String groupId;
    private final String groupName;
    private final String brandId;
    private final String brandName;
    private final String zoneId;
    private final String zoneName;
    private final String service;
    private final Integer qty;
    private final String costPerUnit;
    private final String totalCost;
    private final LocalDate deliveryDate;
    private final String deliveryDetails;
    private final LocalDateTime createdAt;
    private final LocalDateTime updatedAt;

    public EstimateResponseDTO(
            Long estimatedId,
            Long chainId,
            String companyName,
            Long groupId,
            String groupName,
            Long brandId,
            String brandName,
            Integer zoneId,
            String zoneName,
            String service,
            Integer qty,
            BigDecimal costPerUnit,
            BigDecimal totalCost,
            LocalDate deliveryDate,
            String deliveryDetails,
            LocalDateTime createdAt,
            LocalDateTime updatedAt) {
        this.estimatedId = idAsString(estimatedId);
        this.chainId = idAsString(chainId);
        this.companyName = companyName;
        this.groupId = idAsString(groupId);
        this.groupName = groupName;
        this.brandId = idAsString(brandId);
        this.brandName = brandName;
        this.zoneId = idAsString(zoneId);
        this.zoneName = zoneName;
        this.service = service;
        this.qty = qty;
        this.costPerUnit = moneyAsString(costPerUnit);
        this.totalCost = moneyAsString(totalCost);
        this.deliveryDate = deliveryDate;
        this.deliveryDetails = deliveryDetails;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
    }

    private static String idAsString(Number id) {
        return id == null ? null : id.toString();
    }

    private static String moneyAsString(BigDecimal amount) {
        return amount == null ? null : amount.toPlainString();
    }

    public String getEstimatedId() { return estimatedId; }
    public String getChainId() { return chainId; }
    public String getCompanyName() { return companyName; }
    public String getGroupId() { return groupId; }
    public String getGroupName() { return groupName; }
    public String getBrandId() { return brandId; }
    public String getBrandName() { return brandName; }
    public String getZoneId() { return zoneId; }
    public String getZoneName() { return zoneName; }
    public String getService() { return service; }
    public Integer getQty() { return qty; }
    public String getCostPerUnit() { return costPerUnit; }
    public String getTotalCost() { return totalCost; }
    public LocalDate getDeliveryDate() { return deliveryDate; }
    public String getDeliveryDetails() { return deliveryDetails; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }
}
