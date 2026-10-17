package com.codeb.ims.entity;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDate;

@Entity
@Table(name = "payments")
public class Payment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    private Long id;

    @ManyToOne(optional = true)
    @JoinColumn(name = "invoice_id", referencedColumnName = "id", nullable = true)
    private Invoice invoice;

    @Column(name = "amount_paid", nullable = true)
    private Double amountPaid;
    @Column(name = "amount_paid_decimal", precision = 15, scale = 2)
    private BigDecimal amountPaidDecimal;
    @Column(name = "payment_date", nullable = true)
    private LocalDate paymentDate;
    @Column(name = "payment_mode", nullable = true, length = 255)
    private String paymentMode;
    @Column(name = "idempotency_key", length = 64, unique = true)
    private String idempotencyKey;

    public Payment() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Invoice getInvoice() { return invoice; }
    public void setInvoice(Invoice invoice) { this.invoice = invoice; }

    public Double getAmountPaid() { return amountPaid; }
    public void setAmountPaid(Double amountPaid) { this.amountPaid = amountPaid; }
    public BigDecimal getAmountPaidDecimal() { return amountPaidDecimal; }
    public void setAmountPaidDecimal(BigDecimal amountPaidDecimal) { this.amountPaidDecimal = amountPaidDecimal; }

    public LocalDate getPaymentDate() { return paymentDate; }
    public void setPaymentDate(LocalDate paymentDate) { this.paymentDate = paymentDate; }

    public String getPaymentMode() { return paymentMode; }
    public void setPaymentMode(String paymentMode) { this.paymentMode = paymentMode; }
    public String getIdempotencyKey() { return idempotencyKey; }
    public void setIdempotencyKey(String idempotencyKey) { this.idempotencyKey = idempotencyKey; }
}