package com.codeb.ims.controller;

import com.codeb.ims.dto.InvoiceResponseDTO;
import com.codeb.ims.service.DatabaseUserDetailsService;
import com.codeb.ims.service.InvoiceEmailService;
import com.codeb.ims.service.InvoicePdfService;
import com.codeb.ims.service.InvoiceService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;
import com.codeb.ims.config.SecurityConfig;

import java.math.BigDecimal;
import java.time.LocalDate;

import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(InvoiceController.class)
@Import(SecurityConfig.class)
class InvoiceSecurityTest {
    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private InvoiceService invoiceService;
    @MockBean
    private InvoicePdfService pdfService;
    @MockBean
    private InvoiceEmailService emailService;
    @MockBean
    private DatabaseUserDetailsService userDetailsService;

    @Test
    void unauthenticatedUserCannotReadInvoices() throws Exception {
        mockMvc.perform(get("/api/v1/invoices"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @WithMockUser(username = "staff", roles = "USER")
    void userCanReadInvoiceSession() throws Exception {
        mockMvc.perform(get("/api/v1/invoices/session"))
                .andExpect(status().isOk());
    }

    @Test
    @WithMockUser(username = "staff", roles = "USER")
    void userCannotSendInvoiceEmail() throws Exception {
        mockMvc.perform(post("/api/v1/invoices/5/email")
                        .contentType("application/json")
                        .content("{\"recipientEmail\":\"customer@example.com\"}"))
                .andExpect(status().isForbidden());
        verifyNoInteractions(emailService);
    }

    @Test
    @WithMockUser(username = "staff", roles = "USER")
    void userCannotUpdateInvoiceStatus() throws Exception {
        mockMvc.perform(put("/api/v1/invoices/5/status").param("status", "PAID"))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(username = "admin", roles = "ADMIN")
    void adminCanSendInvoiceEmail() throws Exception {
        when(invoiceService.getInvoice(5L)).thenReturn(invoice());
        mockMvc.perform(post("/api/v1/invoices/5/email")
                        .contentType("application/json")
                        .content("{\"recipientEmail\":\"customer@example.com\"}"))
                .andExpect(status().isNoContent());
        verify(emailService).send(any(InvoiceResponseDTO.class), eq("customer@example.com"));
    }

    private static InvoiceResponseDTO invoice() {
        return new InvoiceResponseDTO(
                "5", "INV-00000005", "71", null, "Example Co", "GSTIN-EXAMPLE",
                "Customer", "Customer Org", "customer@example.com", "Service", 1,
                BigDecimal.TEN, BigDecimal.TEN, new BigDecimal("0.1800"),
                new BigDecimal("1.80"), new BigDecimal("11.80"), BigDecimal.ZERO,
                new BigDecimal("11.80"), "UNPAID", LocalDate.now(), LocalDate.now(),
                null, null
        );
    }
}
