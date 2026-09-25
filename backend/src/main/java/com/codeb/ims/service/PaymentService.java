package com.codeb.ims.service;

import com.codeb.ims.dto.PaymentDTO;
import com.codeb.ims.entity.Invoice;
import com.codeb.ims.entity.Payment;
import com.codeb.ims.repository.InvoiceRepository;
import com.codeb.ims.repository.PaymentRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.List;

@Service
public class PaymentService {

    @Autowired
    private PaymentRepository paymentRepository;

    @Autowired
    private InvoiceRepository invoiceRepository;

    public Payment recordPayment(PaymentDTO dto) {
        Invoice invoice = invoiceRepository.findById(dto.getInvoiceId())
                .orElseThrow(() -> new RuntimeException("Invoice not found"));

        Payment payment = new Payment();
        payment.setInvoice(invoice);
        payment.setAmountPaid(dto.getAmountPaid());
        payment.setPaymentDate(dto.getPaymentDate() != null ? dto.getPaymentDate() : LocalDate.now());
        payment.setPaymentMode(dto.getPaymentMode());

        Payment savedPayment = paymentRepository.save(payment);

        // Update Invoice status to PAID if total amount satisfied
        invoice.setStatus("PAID");
        invoiceRepository.save(invoice);

        return savedPayment;
    }

    public List<Payment> getAllPayments() {
        return paymentRepository.findAll();
    }
}
