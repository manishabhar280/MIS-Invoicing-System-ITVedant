package com.codeb.ims.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

public record PaymentResponseDTO(
        String id,
        String invoiceId,
        BigDecimal amount,
        String paymentMode,
        LocalDate paymentDate,
        String invoiceStatus,
        BigDecimal amountPaid,
        BigDecimal balanceDue
) {
}
