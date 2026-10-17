package com.codeb.ims.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Size;

public record SendInvoiceEmailRequestDTO(
        @Email @Size(max = 320) String recipientEmail
) {
}
