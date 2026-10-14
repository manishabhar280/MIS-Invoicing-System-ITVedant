package com.codeb.ims.dto;

import com.fasterxml.jackson.annotation.JsonAlias;

public class ZoneRequestDTO {
    private String zoneName;
    private Long brandId;
    private Boolean isActive;
    private boolean zoneNameProvided;
    private boolean brandIdProvided;
    private boolean isActiveProvided;

    public String getZoneName() {
        return zoneName;
    }

    @JsonAlias("zone_name")
    public void setZoneName(String zoneName) {
        this.zoneName = zoneName;
        this.zoneNameProvided = true;
    }

    public Long getBrandId() {
        return brandId;
    }

    @JsonAlias("brand_id")
    public void setBrandId(Long brandId) {
        this.brandId = brandId;
        this.brandIdProvided = true;
    }

    public Boolean getIsActive() {
        return isActive;
    }

    @JsonAlias("is_active")
    public void setIsActive(Boolean isActive) {
        this.isActive = isActive;
        this.isActiveProvided = true;
    }

    public boolean isZoneNameProvided() {
        return zoneNameProvided;
    }

    public boolean isBrandIdProvided() {
        return brandIdProvided;
    }

    public boolean isIsActiveProvided() {
        return isActiveProvided;
    }
}
