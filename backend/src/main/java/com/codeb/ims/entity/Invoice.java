package com.codeb.ims.entity;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDate;

@Entity
@Table(name = "invoices")
public class Invoice {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    private Long id;

    @ManyToOne(optional = true)
    @JoinColumn(name = "client_id", referencedColumnName = "id", nullable = true)
    private Client client;

    @Column(name = "taxable_amount", nullable = true)
    private Double taxableAmount;
    @Column(name = "gst_rate", nullable = true)
    private Double gstRate;
    @Column(name = "gst_amount", nullable = true)
    private Double gstAmount;
    @Column(name = "total_amount", nullable = true)
    private Double totalAmount;
    @Column(name = "status", nullable = true, length = 255)
    private String status;
    @Column(name = "invoice_date", nullable = true)
    private LocalDate invoiceDate;

    @Column(name = "invoice_number", length = 32, unique = true)
    private String invoiceNumber;

    @ManyToOne(optional = true)
    @JoinColumn(name = "estimate_id", referencedColumnName = "estimate_id", nullable = true)
    private Estimate estimate;

    @Column(name = "company_name_snapshot", length = 255)
    private String companyNameSnapshot;

    @Column(name = "company_gstn_no_snapshot", length = 15)
    private String companyGstnNoSnapshot;

    @Column(name = "customer_name_snapshot", length = 255)
    private String customerNameSnapshot;

    @Column(name = "customer_organization_snapshot", length = 255)
    private String customerOrganizationSnapshot;

    @Column(name = "client_email", length = 320)
    private String clientEmail;

    @Column(name = "service_description", length = 255)
    private String serviceDescription;

    @Column(name = "quantity")
    private Integer quantity;

    @Column(name = "unit_price_decimal", precision = 15, scale = 2)
    private BigDecimal unitPriceDecimal;

    @Column(name = "taxable_amount_decimal", precision = 15, scale = 2)
    private BigDecimal taxableAmountDecimal;

    @Column(name = "gst_rate_decimal", precision = 5, scale = 4)
    private BigDecimal gstRateDecimal;

    @Column(name = "gst_amount_decimal", precision = 15, scale = 2)
    private BigDecimal gstAmountDecimal;

    @Column(name = "total_amount_decimal", precision = 15, scale = 2)
    private BigDecimal totalAmountDecimal;

    @Column(name = "service_date")
    private LocalDate serviceDate;

    @Column(name = "delivery_details", length = 1000)
    private String deliveryDetails;

    @Column(name = "payment_instructions", length = 500)
    private String paymentInstructions;

    public Invoice() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Client getClient() { return client; }
    public void setClient(Client client) { this.client = client; }

    public Double getTaxableAmount() { return taxableAmount; }
    public void setTaxableAmount(Double taxableAmount) { this.taxableAmount = taxableAmount; }

    public Double getGstRate() { return gstRate; }
    public void setGstRate(Double gstRate) { this.gstRate = gstRate; }

    public Double getGstAmount() { return gstAmount; }
    public void setGstAmount(Double gstAmount) { this.gstAmount = gstAmount; }

    public Double getTotalAmount() { return totalAmount; }
    public void setTotalAmount(Double totalAmount) { this.totalAmount = totalAmount; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public LocalDate getInvoiceDate() { return invoiceDate; }
    public void setInvoiceDate(LocalDate invoiceDate) { this.invoiceDate = invoiceDate; }

    public String getInvoiceNumber() { return invoiceNumber; }
    public void setInvoiceNumber(String invoiceNumber) { this.invoiceNumber = invoiceNumber; }
    public Estimate getEstimate() { return estimate; }
    public void setEstimate(Estimate estimate) { this.estimate = estimate; }
    public String getCompanyNameSnapshot() { return companyNameSnapshot; }
    public void setCompanyNameSnapshot(String value) { this.companyNameSnapshot = value; }
    public String getCompanyGstnNoSnapshot() { return companyGstnNoSnapshot; }
    public void setCompanyGstnNoSnapshot(String value) { this.companyGstnNoSnapshot = value; }
    public String getCustomerNameSnapshot() { return customerNameSnapshot; }
    public void setCustomerNameSnapshot(String value) { this.customerNameSnapshot = value; }
    public String getCustomerOrganizationSnapshot() { return customerOrganizationSnapshot; }
    public void setCustomerOrganizationSnapshot(String value) { this.customerOrganizationSnapshot = value; }
    public String getClientEmail() { return clientEmail; }
    public void setClientEmail(String value) { this.clientEmail = value; }
    public String getServiceDescription() { return serviceDescription; }
    public void setServiceDescription(String value) { this.serviceDescription = value; }
    public Integer getQuantity() { return quantity; }
    public void setQuantity(Integer quantity) { this.quantity = quantity; }
    public BigDecimal getUnitPriceDecimal() { return unitPriceDecimal; }
    public void setUnitPriceDecimal(BigDecimal value) { this.unitPriceDecimal = value; }
    public BigDecimal getTaxableAmountDecimal() { return taxableAmountDecimal; }
    public void setTaxableAmountDecimal(BigDecimal value) { this.taxableAmountDecimal = value; }
    public BigDecimal getGstRateDecimal() { return gstRateDecimal; }
    public void setGstRateDecimal(BigDecimal value) { this.gstRateDecimal = value; }
    public BigDecimal getGstAmountDecimal() { return gstAmountDecimal; }
    public void setGstAmountDecimal(BigDecimal value) { this.gstAmountDecimal = value; }
    public BigDecimal getTotalAmountDecimal() { return totalAmountDecimal; }
    public void setTotalAmountDecimal(BigDecimal value) { this.totalAmountDecimal = value; }
    public LocalDate getServiceDate() { return serviceDate; }
    public void setServiceDate(LocalDate serviceDate) { this.serviceDate = serviceDate; }
    public String getDeliveryDetails() { return deliveryDetails; }
    public void setDeliveryDetails(String value) { this.deliveryDetails = value; }
    public String getPaymentInstructions() { return paymentInstructions; }
    public void setPaymentInstructions(String value) { this.paymentInstructions = value; }
}