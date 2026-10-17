package com.codeb.ims.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;

public record CreateInvoiceRequestDTO(
        @NotNull @Positive Long estimateId,
        @Email @Size(max = 320) String clientEmail,
        LocalDate serviceDate,
        @Size(max = 1000) String deliveryDetails,
        @Size(max = 500) String paymentInstructions
) {
}
