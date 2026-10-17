package com.codeb.ims.service;

import com.codeb.ims.dto.CreateInvoiceRequestDTO;
import com.codeb.ims.dto.InvoiceResponseDTO;
import com.codeb.ims.entity.Chain;
import com.codeb.ims.entity.Estimate;
import com.codeb.ims.entity.Invoice;
import com.codeb.ims.repository.ClientRepository;
import com.codeb.ims.repository.EstimateRepository;
import com.codeb.ims.repository.InvoiceRepository;
import com.codeb.ims.repository.PaymentRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class InvoiceServiceTest {
    private InvoiceRepository invoiceRepository;
    private EstimateRepository estimateRepository;
    private PaymentRepository paymentRepository;
    private InvoiceService service;

    @BeforeEach
    void setUp() {
        invoiceRepository = mock(InvoiceRepository.class);
        estimateRepository = mock(EstimateRepository.class);
        paymentRepository = mock(PaymentRepository.class);
        service = new InvoiceService(
                invoiceRepository,
                paymentRepository,
                estimateRepository,
                mock(ClientRepository.class)
        );
        when(paymentRepository.findByInvoice_IdOrderByIdDesc(any())).thenReturn(List.of());
        when(invoiceRepository.saveAndFlush(any(Invoice.class))).thenAnswer(invocation -> {
            Invoice invoice = invocation.getArgument(0);
            if (invoice.getId() == null) invoice.setId(55L);
            return invoice;
        });
    }

    @Test
    void createsInvoiceUsingExactServerCalculatedAmountsAndGeneratedNumber() {
        Estimate estimate = estimate();
        when(estimateRepository.findById(71L)).thenReturn(Optional.of(estimate));
        when(invoiceRepository.findByEstimate_EstimatedId(71L)).thenReturn(Optional.empty());

        InvoiceResponseDTO response = service.createInvoice(new CreateInvoiceRequestDTO(
                71L, null, null, null, null
        ));

        assertEquals("55", response.id());
        assertEquals("INV-00000055", response.invoiceNumber());
        assertEquals(2, response.quantity());
        assertEquals(new BigDecimal("10.00"), response.unitPrice());
        assertEquals(new BigDecimal("20.00"), response.taxableAmount());
        assertEquals(new BigDecimal("3.60"), response.gstAmount());
        assertEquals(new BigDecimal("23.60"), response.totalAmount());
        assertEquals("UNPAID", response.status());
        verify(invoiceRepository, times(2)).saveAndFlush(any(Invoice.class));
    }

    @Test
    void preventsCreatingSecondInvoiceForEstimate() {
        when(estimateRepository.findById(71L)).thenReturn(Optional.of(estimate()));
        when(invoiceRepository.findByEstimate_EstimatedId(71L)).thenReturn(Optional.of(new Invoice()));

        ResponseStatusException exception = assertThrows(
                ResponseStatusException.class,
                () -> service.createInvoice(new CreateInvoiceRequestDTO(
                        71L, null, null, null, null
                ))
        );

        assertEquals(409, exception.getStatusCode().value());
        verify(invoiceRepository, never()).saveAndFlush(any());
    }

    @Test
    void rejectsDirectInvoiceStatusChanges() {
        when(invoiceRepository.findById(55L)).thenReturn(Optional.of(new Invoice()));

        ResponseStatusException exception = assertThrows(
                ResponseStatusException.class,
                () -> service.updateInvoiceStatus(55L, "PAID")
        );

        assertEquals(409, exception.getStatusCode().value());
    }

    private static Estimate estimate() {
        Chain chain = new Chain();
        chain.setChainId(9L);
        chain.setCompanyName("Example Company");
        chain.setGstnNo("GSTIN-EXAMPLE");
        chain.setIsActive(true);

        Estimate estimate = new Estimate();
        estimate.setEstimatedId(71L);
        estimate.setChain(chain);
        estimate.setService("Service");
        estimate.setQty(2);
        estimate.setCostPerUnit(new BigDecimal("10.00"));
        estimate.setTotalCost(new BigDecimal("20.00"));
        return estimate;
    }
}
