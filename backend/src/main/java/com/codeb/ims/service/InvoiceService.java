package com.codeb.ims.service;

import com.codeb.ims.dto.InvoiceDTO;
import com.codeb.ims.entity.Client;
import com.codeb.ims.entity.Invoice;
import com.codeb.ims.repository.ClientRepository;
import com.codeb.ims.repository.InvoiceRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.List;

@Service
public class InvoiceService {

    @Autowired
    private InvoiceRepository invoiceRepository;

    @Autowired
    private ClientRepository clientRepository;

    public Invoice generateInvoice(InvoiceDTO dto) {
        Client client = clientRepository.findById(dto.getClientId())
                .orElseThrow(() -> new RuntimeException("Client not found"));

        Double taxable = dto.getTaxableAmount();
        Double gstRate = (dto.getGstRate() != null) ? dto.getGstRate() : 0.18;
        Double gstAmount = taxable * gstRate;
        Double totalAmount = taxable + gstAmount;

        Invoice invoice = new Invoice();
        invoice.setClient(client);
        invoice.setTaxableAmount(taxable);
        invoice.setGstRate(gstRate);
        invoice.setGstAmount(gstAmount);
        invoice.setTotalAmount(totalAmount);
        invoice.setStatus("UNPAID");
        invoice.setInvoiceDate(LocalDate.now());

        return invoiceRepository.save(invoice);
    }

    public List<Invoice> getAllInvoices() {
        return invoiceRepository.findAll();
    }

    public Invoice updateInvoiceStatus(Long invoiceId, String status) {
        Invoice invoice = invoiceRepository.findById(invoiceId)
                .orElseThrow(() -> new RuntimeException("Invoice not found"));
        invoice.setStatus(status);
        return invoiceRepository.save(invoice);
    }
}