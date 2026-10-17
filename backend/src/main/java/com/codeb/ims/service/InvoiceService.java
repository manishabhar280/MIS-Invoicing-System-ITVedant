package com.codeb.ims.service;

import com.codeb.ims.dto.CreateInvoiceRequestDTO;
import com.codeb.ims.dto.EstimateInvoiceDetailsDTO;
import com.codeb.ims.dto.InvoiceResponseDTO;
import com.codeb.ims.entity.Chain;
import com.codeb.ims.entity.Client;
import com.codeb.ims.entity.Estimate;
import com.codeb.ims.entity.Invoice;
import com.codeb.ims.entity.Payment;
import com.codeb.ims.repository.ClientRepository;
import com.codeb.ims.repository.EstimateRepository;
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
public class InvoiceService {
    private static final BigDecimal DEFAULT_GST_RATE = new BigDecimal("0.1800");

    private final InvoiceRepository invoiceRepository;
    private final PaymentRepository paymentRepository;
    private final EstimateRepository estimateRepository;
    private final ClientRepository clientRepository;

    public InvoiceService(
            InvoiceRepository invoiceRepository,
            PaymentRepository paymentRepository,
            EstimateRepository estimateRepository,
            ClientRepository clientRepository
    ) {
        this.invoiceRepository = invoiceRepository;
        this.paymentRepository = paymentRepository;
        this.estimateRepository = estimateRepository;
        this.clientRepository = clientRepository;
    }

    @Transactional(readOnly = true)
    public EstimateInvoiceDetailsDTO getEstimateForInvoice(Long estimateId) {
        Estimate estimate = findEligibleEstimate(estimateId);
        Chain chain = estimate.getChain();
        Client client = findLegacyClient(estimate);
        return new EstimateInvoiceDetailsDTO(
                estimate.getEstimatedId().toString(),
                chain.getChainId().toString(),
                client == null ? null : client.getId().toString(),
                chain.getCompanyName(),
                chain.getGstnNo(),
                client == null ? chain.getCompanyName() : client.getClientName(),
                client == null ? chain.getCompanyName() : client.getOrganizationName(),
                estimate.getService(),
                estimate.getQty(),
                estimate.getCostPerUnit(),
                estimate.getTotalCost(),
                estimate.getDeliveryDate(),
                estimate.getDeliveryDetails(),
                invoiceRepository.findByEstimate_EstimatedId(estimateId).isPresent()
        );
    }

    @Transactional
    public InvoiceResponseDTO createInvoice(CreateInvoiceRequestDTO request) {
        Estimate estimate = findEligibleEstimate(request.estimateId());
        if (invoiceRepository.findByEstimate_EstimatedId(request.estimateId()).isPresent()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "This estimate already has an invoice.");
        }

        validateText(request.clientEmail(), 320, "Client email");
        validateText(request.deliveryDetails(), 1000, "Delivery details");
        validateText(request.paymentInstructions(), 500, "Payment instructions");
        int quantity = estimate.getQty();
        BigDecimal unitPrice = requireMoney(estimate.getCostPerUnit(), "Cost per unit");
        BigDecimal taxable = requireMoney(unitPrice.multiply(BigDecimal.valueOf(quantity)), "Taxable amount");
        BigDecimal gstAmount = requireMoney(taxable.multiply(DEFAULT_GST_RATE), "GST amount");
        BigDecimal total = requireMoney(taxable.add(gstAmount), "Invoice total");
        Chain chain = estimate.getChain();
        Client client = findLegacyClient(estimate);

        Invoice invoice = new Invoice();
        invoice.setEstimate(estimate);
        invoice.setClient(client);
        invoice.setInvoiceDate(LocalDate.now());
        invoice.setServiceDate(request.serviceDate() == null ? LocalDate.now() : request.serviceDate());
        invoice.setStatus("UNPAID");
        invoice.setCompanyNameSnapshot(chain.getCompanyName());
        invoice.setCompanyGstnNoSnapshot(chain.getGstnNo());
        invoice.setCustomerNameSnapshot(client == null ? chain.getCompanyName() : client.getClientName());
        invoice.setCustomerOrganizationSnapshot(client == null ? chain.getCompanyName() : client.getOrganizationName());
        invoice.setClientEmail(blankToNull(request.clientEmail()));
        invoice.setServiceDescription(estimate.getService());
        invoice.setQuantity(quantity);
        invoice.setUnitPriceDecimal(unitPrice);
        invoice.setTaxableAmountDecimal(taxable);
        invoice.setGstRateDecimal(DEFAULT_GST_RATE);
        invoice.setGstAmountDecimal(gstAmount);
        invoice.setTotalAmountDecimal(total);
        invoice.setDeliveryDetails(blankToNull(request.deliveryDetails()) == null
                ? estimate.getDeliveryDetails()
                : request.deliveryDetails().trim());
        invoice.setPaymentInstructions(blankToNull(request.paymentInstructions()));
        invoice.setTaxableAmount(taxable.doubleValue());
        invoice.setGstRate(DEFAULT_GST_RATE.doubleValue());
        invoice.setGstAmount(gstAmount.doubleValue());
        invoice.setTotalAmount(total.doubleValue());

        Invoice saved = invoiceRepository.saveAndFlush(invoice);
        saved.setInvoiceNumber("INV-" + String.format("%08d", saved.getId()));
        return toResponse(invoiceRepository.saveAndFlush(saved));
    }

    @Transactional(readOnly = true)
    public List<InvoiceResponseDTO> getAllInvoices() {
        return invoiceRepository.findAllByOrderByIdDesc().stream().map(this::toResponse).toList();
    }

    @Transactional(readOnly = true)
    public InvoiceResponseDTO getInvoice(Long invoiceId) {
        return toResponse(findInvoice(invoiceId));
    }

    @Transactional
    public InvoiceResponseDTO updateInvoiceStatus(Long invoiceId, String status) {
        findInvoice(invoiceId);
        throw new ResponseStatusException(
                HttpStatus.CONFLICT,
                "Invoice payment status is calculated from recorded payments and cannot be edited directly."
        );
    }

    @Transactional(readOnly = true)
    public Invoice findInvoice(Long invoiceId) {
        return invoiceRepository.findById(invoiceId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Invoice not found."));
    }

    @Transactional(readOnly = true)
    public BigDecimal paidAmount(Long invoiceId) {
        return paymentRepository.findByInvoice_IdOrderByIdDesc(invoiceId).stream()
                .map(InvoiceService::paymentValue)
                .reduce(BigDecimal.ZERO, BigDecimal::add)
                .setScale(2, RoundingMode.HALF_UP);
    }

    public InvoiceResponseDTO toResponse(Invoice invoice) {
        BigDecimal taxable = invoice.getTaxableAmountDecimal() != null
                ? invoice.getTaxableAmountDecimal()
                : decimalFromLegacy(invoice.getTaxableAmount());
        BigDecimal gstRate = invoice.getGstRateDecimal() != null
                ? invoice.getGstRateDecimal()
                : decimalFromLegacy(invoice.getGstRate());
        BigDecimal gstAmount = invoice.getGstAmountDecimal() != null
                ? invoice.getGstAmountDecimal()
                : decimalFromLegacy(invoice.getGstAmount());
        BigDecimal total = invoice.getTotalAmountDecimal() != null
                ? invoice.getTotalAmountDecimal()
                : decimalFromLegacy(invoice.getTotalAmount());
        BigDecimal paid = paidAmount(invoice.getId());
        BigDecimal balance = total.subtract(paid).max(BigDecimal.ZERO).setScale(2, RoundingMode.HALF_UP);
        String status = balance.signum() == 0 && total.signum() > 0
                ? "PAID"
                : paid.signum() > 0 ? "PARTIALLY_PAID" : "UNPAID";
        if (invoice.getTotalAmountDecimal() == null && invoice.getTotalAmount() == null) {
            status = invoice.getStatus() == null ? "UNPAID" : invoice.getStatus();
        }

        return new InvoiceResponseDTO(
                invoice.getId().toString(),
                invoice.getInvoiceNumber(),
                invoice.getEstimate() == null ? null : invoice.getEstimate().getEstimatedId().toString(),
                invoice.getClient() == null ? null : invoice.getClient().getId().toString(),
                invoice.getCompanyNameSnapshot(),
                invoice.getCompanyGstnNoSnapshot(),
                invoice.getCustomerNameSnapshot(),
                invoice.getCustomerOrganizationSnapshot(),
                invoice.getClientEmail(),
                invoice.getServiceDescription(),
                invoice.getQuantity(),
                invoice.getUnitPriceDecimal(),
                taxable,
                gstRate,
                gstAmount,
                total,
                paid,
                balance,
                status,
                invoice.getInvoiceDate(),
                invoice.getServiceDate(),
                invoice.getDeliveryDetails(),
                invoice.getPaymentInstructions()
        );
    }

    private Estimate findEligibleEstimate(Long estimateId) {
        Estimate estimate = estimateRepository.findById(estimateId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Estimate not found."));
        if (estimate.getChain() == null || !Boolean.TRUE.equals(estimate.getChain().getIsActive())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Estimate is not linked to an active company.");
        }
        if (estimate.getBrand() != null) {
            if (!Boolean.TRUE.equals(estimate.getBrand().getIsActive())) {
                throw new ResponseStatusException(HttpStatus.CONFLICT, "Estimate is linked to an inactive brand.");
            }
            if (estimate.getBrand().getChain() != null
                    && !estimate.getBrand().getChain().getChainId().equals(estimate.getChain().getChainId())) {
                throw new ResponseStatusException(HttpStatus.CONFLICT, "Estimate brand does not belong to its company.");
            }
        }
        if (estimate.getZone() != null) {
            if (!Boolean.TRUE.equals(estimate.getZone().getIsActive())) {
                throw new ResponseStatusException(HttpStatus.CONFLICT, "Estimate is linked to an inactive zone.");
            }
            if (estimate.getBrand() != null && estimate.getZone().getBrand() != null
                    && !estimate.getZone().getBrand().getBrandId().equals(estimate.getBrand().getBrandId())) {
                throw new ResponseStatusException(HttpStatus.CONFLICT, "Estimate zone does not belong to its brand.");
            }
        }
        String estimateStatus = estimate.getLegacyStatus();
        if (estimateStatus != null && List.of("CANCELLED", "CANCELED", "REJECTED", "VOID")
                .contains(estimateStatus.trim().toUpperCase())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "This estimate is not eligible for invoicing.");
        }
        if (estimate.getQty() == null || estimate.getQty() <= 0
                || estimate.getCostPerUnit() == null || estimate.getTotalCost() == null
                || estimate.getCostPerUnit().signum() < 0 || estimate.getTotalCost().signum() < 0) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Estimate is missing invoice quantity or pricing details.");
        }
        BigDecimal expectedEstimateTotal = estimate.getCostPerUnit()
                .multiply(BigDecimal.valueOf(estimate.getQty()))
                .setScale(2, RoundingMode.HALF_UP);
        if (estimate.getTotalCost().compareTo(expectedEstimateTotal) != 0) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Estimate total does not match its quantity and unit cost.");
        }
        return estimate;
    }

    private Client findLegacyClient(Estimate estimate) {
        if (estimate.getLegacyClientId() == null) {
            return null;
        }
        return clientRepository.findById(estimate.getLegacyClientId())
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.CONFLICT, "The estimate references a client that no longer exists."
                ));
    }

    private static BigDecimal requireMoney(BigDecimal value, String field) {
        if (value == null || value.signum() < 0) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, field + " must be zero or greater on the Estimate.");
        }
        BigDecimal scaled = value.setScale(2, RoundingMode.HALF_UP);
        if (scaled.precision() > 15) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, field + " exceeds the supported invoice amount.");
        }
        return scaled;
    }

    private static BigDecimal decimalFromLegacy(Double value) {
        return value == null ? BigDecimal.ZERO.setScale(2) : BigDecimal.valueOf(value).setScale(2, RoundingMode.HALF_UP);
    }

    static BigDecimal paymentValue(Payment payment) {
        if (payment.getAmountPaidDecimal() != null) {
            return payment.getAmountPaidDecimal();
        }
        return payment.getAmountPaid() == null
                ? BigDecimal.ZERO
                : BigDecimal.valueOf(payment.getAmountPaid()).setScale(2, RoundingMode.HALF_UP);
    }

    private static void validateText(String value, int maxLength, String field) {
        if (value != null && value.length() > maxLength) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, field + " is too long.");
        }
    }

    private static String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }
}
