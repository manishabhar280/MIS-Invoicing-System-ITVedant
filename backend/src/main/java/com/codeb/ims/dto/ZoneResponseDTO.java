package com.codeb.ims.dto;

import java.time.LocalDateTime;

public class ZoneResponseDTO {
    private final Integer zoneId;
    private final String zoneName;
    private final Long brandId;
    private final String brandName;
    private final Long chainId;
    private final String companyName;
    private final Long groupId;
    private final String groupName;
    private final Boolean isActive;
    private final LocalDateTime createdAt;
    private final LocalDateTime updatedAt;

    public ZoneResponseDTO(
            Integer zoneId,
            String zoneName,
            Long brandId,
            String brandName,
            Long chainId,
            String companyName,
            Long groupId,
            String groupName,
            Boolean isActive,
            LocalDateTime createdAt,
            LocalDateTime updatedAt) {
        this.zoneId = zoneId;
        this.zoneName = zoneName;
        this.brandId = brandId;
        this.brandName = brandName;
        this.chainId = chainId;
        this.companyName = companyName;
        this.groupId = groupId;
        this.groupName = groupName;
        this.isActive = isActive;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
    }

    public Integer getZoneId() {
        return zoneId;
    }

    public String getZoneName() {
        return zoneName;
    }

    public Long getBrandId() {
        return brandId;
    }

    public String getBrandName() {
        return brandName;
    }

    public Long getChainId() {
        return chainId;
    }

    public String getCompanyName() {
        return companyName;
    }

    public Long getGroupId() {
        return groupId;
    }

    public String getGroupName() {
        return groupName;
    }

    public Boolean getIsActive() {
        return isActive;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }
}
