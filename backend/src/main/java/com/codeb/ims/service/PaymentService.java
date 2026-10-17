package com.codeb.ims.service;

import com.codeb.ims.dto.CreatePaymentRequestDTO;
import com.codeb.ims.dto.PaymentResponseDTO;
import com.codeb.ims.entity.Invoice;
import com.codeb.ims.entity.Payment;
import com.codeb.ims.repository.InvoiceRepository;
import com.codeb.ims.repository.PaymentRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.List;

@Service
public class PaymentService {
    private final PaymentRepository paymentRepository;
    private final InvoiceRepository invoiceRepository;
    private final InvoiceService invoiceService;

    public PaymentService(
            PaymentRepository paymentRepository,
            InvoiceRepository invoiceRepository,
            InvoiceService invoiceService
    ) {
        this.paymentRepository = paymentRepository;
        this.invoiceRepository = invoiceRepository;
        this.invoiceService = invoiceService;
    }

    @Transactional
    public PaymentResponseDTO recordPayment(CreatePaymentRequestDTO request) {
        String key = request.idempotencyKey().trim();
        if (key.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Idempotency key cannot be blank.");
        }
        Payment previous = paymentRepository.findByIdempotencyKey(key).orElse(null);
        if (previous != null) return resolveIdempotentRetry(previous, request);

        Invoice invoice = invoiceRepository.findByIdForUpdate(request.invoiceId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Invoice not found."));
        previous = paymentRepository.findByIdempotencyKey(key).orElse(null);
        if (previous != null) return resolveIdempotentRetry(previous, request);
        BigDecimal total = invoice.getTotalAmountDecimal() != null
                ? invoice.getTotalAmountDecimal()
                : invoice.getTotalAmount() == null
                    ? BigDecimal.ZERO
                    : BigDecimal.valueOf(invoice.getTotalAmount()).setScale(2, RoundingMode.HALF_UP);
        if (total.signum() <= 0) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Invoice has no valid payable total.");
        }

        BigDecimal paidBefore = sumPayments(paymentRepository.findByInvoice_IdOrderByIdDesc(invoice.getId()));
        BigDecimal balance = total.subtract(paidBefore);
        if (balance.signum() <= 0) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Invoice is already fully paid.");
        }
        BigDecimal amount = request.amount().setScale(2, RoundingMode.HALF_UP);
        if (amount.signum() <= 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Payment amount must be greater than zero.");
        }
        if (amount.compareTo(balance) > 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Payment amount cannot exceed the outstanding balance.");
        }
        if (amount.precision() > 15) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Payment amount exceeds the supported amount.");
        }

        Payment payment = new Payment();
        payment.setInvoice(invoice);
        payment.setAmountPaidDecimal(amount);
        payment.setAmountPaid(amount.doubleValue());
        payment.setPaymentDate(request.paymentDate() == null ? LocalDate.now() : request.paymentDate());
        payment.setPaymentMode(request.paymentMode().trim());
        payment.setIdempotencyKey(key);
        Payment saved = paymentRepository.saveAndFlush(payment);

        BigDecimal paidAfter = paidBefore.add(amount);
        invoice.setStatus(paidAfter.compareTo(total) >= 0 ? "PAID" : "PARTIALLY_PAID");
        invoiceRepository.save(invoice);
        return toResponse(saved, paidAfter, total);
    }

    @Transactional(readOnly = true)
    public List<PaymentResponseDTO> getAllPayments() {
        return paymentRepository.findAll().stream().map(this::toResponse).toList();
    }

    private PaymentResponseDTO toResponse(Payment payment) {
        Invoice invoice = payment.getInvoice();
        BigDecimal total = invoice.getTotalAmountDecimal() != null
                ? invoice.getTotalAmountDecimal()
                : invoice.getTotalAmount() == null
                    ? BigDecimal.ZERO
                    : BigDecimal.valueOf(invoice.getTotalAmount()).setScale(2, RoundingMode.HALF_UP);
        return toResponse(payment, invoiceService.paidAmount(invoice.getId()), total);
    }

    private PaymentResponseDTO resolveIdempotentRetry(Payment previous, CreatePaymentRequestDTO request) {
        if (previous.getInvoice() == null
                || !previous.getInvoice().getId().equals(request.invoiceId())
                || InvoiceService.paymentValue(previous).compareTo(request.amount().setScale(2, RoundingMode.HALF_UP)) != 0) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT, "This idempotency key was already used for a different payment."
            );
        }
        return toResponse(previous);
    }

    private PaymentResponseDTO toResponse(Payment payment, BigDecimal paid, BigDecimal total) {
        Invoice invoice = payment.getInvoice();
        return new PaymentResponseDTO(
                payment.getId().toString(),
                invoice.getId().toString(),
                InvoiceService.paymentValue(payment),
                payment.getPaymentMode(),
                payment.getPaymentDate(),
                total.subtract(paid).signum() <= 0 ? "PAID" : "PARTIALLY_PAID",
                paid,
                total.subtract(paid).max(BigDecimal.ZERO).setScale(2, RoundingMode.HALF_UP)
        );
    }

    private static BigDecimal sumPayments(List<Payment> payments) {
        BigDecimal paid = payments.stream()
                .map(InvoiceService::paymentValue)
                .reduce(BigDecimal.ZERO, BigDecimal::add)
                .setScale(2, RoundingMode.HALF_UP);
        if (paid.signum() < 0) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT, "Existing payment records have an invalid negative balance; reconcile them before recording payments."
            );
        }
        return paid;
    }
}
