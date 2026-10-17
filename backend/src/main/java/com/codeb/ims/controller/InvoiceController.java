package com.codeb.ims.controller;

import com.codeb.ims.dto.CreateInvoiceRequestDTO;
import com.codeb.ims.dto.EstimateInvoiceDetailsDTO;
import com.codeb.ims.dto.InvoiceResponseDTO;
import com.codeb.ims.dto.SendInvoiceEmailRequestDTO;
import com.codeb.ims.dto.UserSessionDTO;
import com.codeb.ims.service.InvoiceEmailService;
import com.codeb.ims.service.InvoicePdfService;
import com.codeb.ims.service.InvoiceService;
import jakarta.validation.Valid;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.nio.charset.StandardCharsets;
import java.util.List;

@RestController
@RequestMapping("/api/v1/invoices")
@CrossOrigin(origins = "*")
public class InvoiceController {
    private final InvoiceService invoiceService;
    private final InvoicePdfService pdfService;
    private final InvoiceEmailService emailService;

    public InvoiceController(
            InvoiceService invoiceService,
            InvoicePdfService pdfService,
            InvoiceEmailService emailService
    ) {
        this.invoiceService = invoiceService;
        this.pdfService = pdfService;
        this.emailService = emailService;
    }

    @GetMapping("/estimates/{estimateId}")
    public ResponseEntity<EstimateInvoiceDetailsDTO> getEstimateForInvoice(@PathVariable Long estimateId) {
        return ResponseEntity.ok(invoiceService.getEstimateForInvoice(estimateId));
    }

    @PostMapping
    public ResponseEntity<InvoiceResponseDTO> createInvoice(@Valid @RequestBody CreateInvoiceRequestDTO request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(invoiceService.createInvoice(request));
    }

    @GetMapping
    public ResponseEntity<List<InvoiceResponseDTO>> getAllInvoices() {
        return ResponseEntity.ok(invoiceService.getAllInvoices());
    }

    @GetMapping("/session")
    public ResponseEntity<UserSessionDTO> getSession(Authentication authentication) {
        List<String> roles = authentication.getAuthorities().stream()
                .map(authority -> authority.getAuthority().replaceFirst("^ROLE_", ""))
                .toList();
        return ResponseEntity.ok(new UserSessionDTO(authentication.getName(), roles));
    }

    @GetMapping("/{id}")
    public ResponseEntity<InvoiceResponseDTO> getInvoice(@PathVariable Long id) {
        return ResponseEntity.ok(invoiceService.getInvoice(id));
    }

    @GetMapping("/{id}/pdf")
    public ResponseEntity<byte[]> downloadPdf(@PathVariable Long id) {
        InvoiceResponseDTO invoice = invoiceService.getInvoice(id);
        String filename = (invoice.invoiceNumber() == null ? "invoice-" + id : invoice.invoiceNumber()) + ".pdf";
        return ResponseEntity.ok()
                .contentType(MediaType.APPLICATION_PDF)
                .header(HttpHeaders.CONTENT_DISPOSITION, ContentDisposition.attachment()
                        .filename(filename, StandardCharsets.UTF_8).build().toString())
                .body(pdfService.generate(invoice));
    }

    @PostMapping("/{id}/email")
    public ResponseEntity<Void> emailInvoice(
            @PathVariable Long id,
            @Valid @RequestBody(required = false) SendInvoiceEmailRequestDTO request
    ) {
        InvoiceResponseDTO invoice = invoiceService.getInvoice(id);
        String recipient = request == null || request.recipientEmail() == null || request.recipientEmail().isBlank()
                ? invoice.clientEmail()
                : request.recipientEmail().trim();
        if (recipient == null || recipient.isBlank()) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST, "Provide a recipient email or save one on the invoice."
            );
        }
        emailService.send(invoice, recipient);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/generate")
    public ResponseEntity<Void> legacyGenerate() {
        throw new ResponseStatusException(
                HttpStatus.GONE,
                "Client-submitted invoice totals are no longer accepted. Create an invoice from an eligible estimate."
        );
    }

    @PutMapping("/{id}/status")
    public ResponseEntity<InvoiceResponseDTO> updateStatus(
            @PathVariable Long id,
            @RequestParam(required = false) String status
    ) {
        return ResponseEntity.ok(invoiceService.updateInvoiceStatus(id, status));
    }
}
