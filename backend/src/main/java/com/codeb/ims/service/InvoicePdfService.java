package com.codeb.ims.service;

import com.codeb.ims.dto.InvoiceResponseDTO;
import com.lowagie.text.Document;
import com.lowagie.text.Font;
import com.lowagie.text.FontFactory;
import com.lowagie.text.Paragraph;
import com.lowagie.text.Phrase;
import com.lowagie.text.pdf.PdfPTable;
import com.lowagie.text.pdf.PdfWriter;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.Objects;

@Service
public class InvoicePdfService {
    public byte[] generate(InvoiceResponseDTO invoice) {
        try (ByteArrayOutputStream output = new ByteArrayOutputStream()) {
            Document document = new Document();
            PdfWriter.getInstance(document, output);
            document.open();

            Font title = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 20);
            Font heading = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 11);
            document.add(new Paragraph("TAX INVOICE", title));
            document.add(new Paragraph("Invoice: " + text(invoice.invoiceNumber(), "INV-" + invoice.id())));
            document.add(new Paragraph("Invoice date: " + text(invoice.invoiceDate(), "—")));
            document.add(new Paragraph("Estimate reference: "
                    + (invoice.estimateId() == null ? "Legacy invoice" : "#" + invoice.estimateId())));
            document.add(new Paragraph(" "));

            PdfPTable details = new PdfPTable(2);
            details.setWidthPercentage(100);
            addRow(details, "Company", text(invoice.companyName(), "—"), heading);
            addRow(details, "Company GSTIN", text(invoice.companyGstnNo(), "Not provided"), heading);
            addRow(details, "Customer", text(invoice.customerName(), "—"), heading);
            addRow(details, "Organization", text(invoice.customerOrganization(), "—"), heading);
            addRow(details, "Client email", text(invoice.clientEmail(), "—"), heading);
            addRow(details, "Service", text(invoice.serviceDescription(), "—"), heading);
            addRow(details, "Service date", text(invoice.serviceDate(), "—"), heading);
            addRow(details, "Delivery details", text(invoice.deliveryDetails(), "—"), heading);
            document.add(details);
            document.add(new Paragraph(" "));

            PdfPTable amounts = new PdfPTable(2);
            amounts.setWidthPercentage(100);
            addRow(amounts, "Quantity", text(invoice.quantity(), "—"), heading);
            addRow(amounts, "Rate", rupees(invoice.unitPrice()), heading);
            addRow(amounts, "Taxable amount", rupees(invoice.taxableAmount()), heading);
            addRow(amounts, "GST rate", invoice.gstRate() == null ? "—" : invoice.gstRate().multiply(BigDecimal.valueOf(100)).stripTrailingZeros().toPlainString() + "%", heading);
            addRow(amounts, "GST amount", rupees(invoice.gstAmount()), heading);
            addRow(amounts, "Invoice total", rupees(invoice.totalAmount()), heading);
            addRow(amounts, "Amount paid", rupees(invoice.amountPaid()), heading);
            addRow(amounts, "Outstanding balance", rupees(invoice.balanceDue()), heading);
            addRow(amounts, "Payment status", text(invoice.status(), "UNPAID"), heading);
            document.add(amounts);
            if (invoice.paymentInstructions() != null && !invoice.paymentInstructions().isBlank()) {
                document.add(new Paragraph(" "));
                document.add(new Paragraph("Payment instructions: " + invoice.paymentInstructions()));
            }
            document.close();
            return output.toByteArray();
        } catch (Exception exception) {
            throw new IllegalStateException("Unable to generate invoice PDF.", exception);
        }
    }

    private static void addRow(PdfPTable table, String label, String value, Font font) {
        table.addCell(new Phrase(label, font));
        table.addCell(Objects.requireNonNullElse(value, "—"));
    }

    private static String rupees(BigDecimal value) {
        return value == null ? "—" : "₹" + value.setScale(2, RoundingMode.HALF_UP).toPlainString();
    }

    private static String text(Object value, String fallback) {
        return value == null ? fallback : value.toString();
    }
}
