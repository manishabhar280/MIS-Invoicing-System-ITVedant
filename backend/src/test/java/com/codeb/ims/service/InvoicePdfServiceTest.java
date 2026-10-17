package com.codeb.ims.service;

import com.codeb.ims.dto.InvoiceResponseDTO;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.LocalDate;

import static org.junit.jupiter.api.Assertions.*;

class InvoicePdfServiceTest {
    @Test
    void producesPdfBytesForInvoice() {
        InvoiceResponseDTO invoice = new InvoiceResponseDTO(
                "7", "INV-00000007", "71", null, "Example Company", "GSTIN-EXAMPLE",
                "Customer", "Customer Org", "customer@example.com", "Service", 2,
                new BigDecimal("12.50"), new BigDecimal("25.00"), new BigDecimal("0.1800"),
                new BigDecimal("4.50"), new BigDecimal("29.50"), new BigDecimal("10.00"),
                new BigDecimal("19.50"), "PARTIALLY_PAID", LocalDate.now(), LocalDate.now(),
                "Delivery location", "Payment terms"
        );

        byte[] pdf = new InvoicePdfService().generate(invoice);

        assertTrue(pdf.length > 100);
        assertEquals("%PDF", new String(pdf, 0, 4, java.nio.charset.StandardCharsets.US_ASCII));
    }
}
