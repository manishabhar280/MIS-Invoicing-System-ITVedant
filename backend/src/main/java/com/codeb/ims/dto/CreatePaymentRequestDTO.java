package com.codeb.ims.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.time.LocalDate;

public record CreatePaymentRequestDTO(
        @NotNull @Positive Long invoiceId,
        @NotNull @DecimalMin("0.01") BigDecimal amount,
        @NotBlank @Size(max = 50) String paymentMode,
        @NotBlank @Size(max = 64) String idempotencyKey,
        LocalDate paymentDate
) {
}
