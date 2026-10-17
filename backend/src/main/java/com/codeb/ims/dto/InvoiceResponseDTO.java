package com.codeb.ims.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

public record InvoiceResponseDTO(
        String id,
        String invoiceNumber,
        String estimateId,
        String clientId,
        String companyName,
        String companyGstnNo,
        String customerName,
        String customerOrganization,
        String clientEmail,
        String serviceDescription,
        Integer quantity,
        BigDecimal unitPrice,
        BigDecimal taxableAmount,
        BigDecimal gstRate,
        BigDecimal gstAmount,
        BigDecimal totalAmount,
        BigDecimal amountPaid,
        BigDecimal balanceDue,
        String status,
        LocalDate invoiceDate,
        LocalDate serviceDate,
        String deliveryDetails,
        String paymentInstructions
) {
}
