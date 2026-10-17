package com.codeb.ims.service;

import com.codeb.ims.dto.CreatePaymentRequestDTO;
import com.codeb.ims.dto.PaymentResponseDTO;
import com.codeb.ims.entity.Invoice;
import com.codeb.ims.entity.Payment;
import com.codeb.ims.repository.InvoiceRepository;
import com.codeb.ims.repository.PaymentRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class PaymentServiceTest {
    private InvoiceRepository invoiceRepository;
    private PaymentRepository paymentRepository;
    private PaymentService service;
    private Invoice invoice;

    @BeforeEach
    void setUp() {
        invoiceRepository = mock(InvoiceRepository.class);
        paymentRepository = mock(PaymentRepository.class);
        InvoiceService invoiceService = mock(InvoiceService.class);
        service = new PaymentService(paymentRepository, invoiceRepository, invoiceService);
        invoice = new Invoice();
        invoice.setId(20L);
        invoice.setTotalAmountDecimal(new BigDecimal("100.00"));
        when(invoiceRepository.findByIdForUpdate(20L)).thenReturn(Optional.of(invoice));
        when(paymentRepository.findByIdempotencyKey(any())).thenReturn(Optional.empty());
        when(paymentRepository.findByInvoice_IdOrderByIdDesc(20L)).thenReturn(List.of());
        when(paymentRepository.saveAndFlush(any(Payment.class))).thenAnswer(invocation -> {
            Payment payment = invocation.getArgument(0);
            payment.setId(31L);
            return payment;
        });
    }

    @Test
    void recordsPartialPaymentAndKeepsOutstandingBalance() {
        PaymentResponseDTO response = service.recordPayment(new CreatePaymentRequestDTO(
                20L, new BigDecimal("40.25"), "UPI", "payment-key-1", LocalDate.now()
        ));

        assertEquals("31", response.id());
        assertEquals("20", response.invoiceId());
        assertEquals(new BigDecimal("40.25"), response.amount());
        assertEquals(new BigDecimal("40.25"), response.amountPaid());
        assertEquals(new BigDecimal("59.75"), response.balanceDue());
        assertEquals("PARTIALLY_PAID", response.invoiceStatus());
        assertEquals("PARTIALLY_PAID", invoice.getStatus());
    }

    @Test
    void rejectsPaymentAboveBalance() {
        assertThrows(ResponseStatusException.class, () -> service.recordPayment(
                new CreatePaymentRequestDTO(20L, new BigDecimal("100.01"), "UPI", "payment-key-2", null)
        ));
        verify(paymentRepository, never()).saveAndFlush(any());
    }

    @Test
    void rejectsNegativeAndZeroPaymentAmounts() {
        assertThrows(ResponseStatusException.class, () -> service.recordPayment(
                new CreatePaymentRequestDTO(20L, BigDecimal.ZERO, "UPI", "payment-key-3", null)
        ));
        verify(paymentRepository, never()).saveAndFlush(any());
    }
}
