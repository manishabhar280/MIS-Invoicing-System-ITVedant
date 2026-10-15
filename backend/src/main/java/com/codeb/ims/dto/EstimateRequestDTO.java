package com.codeb.ims.dto;

import com.fasterxml.jackson.annotation.JsonAlias;

import java.math.BigDecimal;
import java.time.LocalDate;

public class EstimateRequestDTO {
    private Long chainId;
    private Long brandId;
    private Integer zoneId;
    private String service;
    private Integer qty;
    private BigDecimal costPerUnit;
    private LocalDate deliveryDate;
    private String deliveryDetails;

    public Long getChainId() {
        return chainId;
    }

    @JsonAlias("chain_id")
    public void setChainId(Long chainId) {
        this.chainId = chainId;
    }

    public Long getBrandId() {
        return brandId;
    }

    @JsonAlias("brand_id")
    public void setBrandId(Long brandId) {
        this.brandId = brandId;
    }

    public Integer getZoneId() {
        return zoneId;
    }

    @JsonAlias("zone_id")
    public void setZoneId(Integer zoneId) {
        this.zoneId = zoneId;
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
}
