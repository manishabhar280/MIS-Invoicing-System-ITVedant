package com.codeb.ims.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

public record EstimateInvoiceDetailsDTO(
        String estimateId,
        String chainId,
        String clientId,
        String companyName,
        String companyGstnNo,
        String customerName,
        String customerOrganization,
        String serviceDescription,
        Integer quantity,
        BigDecimal unitPrice,
        BigDecimal estimatedTotal,
        LocalDate deliveryDate,
        String deliveryDetails,
        boolean alreadyInvoiced
) {
}
