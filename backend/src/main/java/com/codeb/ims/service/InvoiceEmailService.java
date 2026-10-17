package com.codeb.ims.service;

import com.codeb.ims.dto.InvoiceResponseDTO;
import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.HttpStatus;
import org.springframework.mail.MailException;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
public class InvoiceEmailService {
    private final ObjectProvider<JavaMailSender> mailSenderProvider;
    private final InvoicePdfService pdfService;

    @Value("${spring.mail.host:}")
    private String smtpHost;
    @Value("${spring.mail.username:}")
    private String smtpUsername;
    @Value("${spring.mail.password:}")
    private String smtpPassword;
    @Value("${spring.mail.properties.mail.smtp.auth:true}")
    private boolean smtpAuth;
    @Value("${app.mail.from:}")
    private String fromAddress;

    public InvoiceEmailService(ObjectProvider<JavaMailSender> mailSenderProvider, InvoicePdfService pdfService) {
        this.mailSenderProvider = mailSenderProvider;
        this.pdfService = pdfService;
    }

    public void send(InvoiceResponseDTO invoice, String recipient) {
        if (smtpHost == null || smtpHost.isBlank() || fromAddress == null || fromAddress.isBlank()
                || (smtpAuth && ((smtpUsername == null || smtpUsername.isBlank())
                || (smtpPassword == null || smtpPassword.isBlank())))) {
            throw new ResponseStatusException(
                    HttpStatus.SERVICE_UNAVAILABLE,
                    "Invoice email is not configured. Set SMTP_HOST, SMTP_FROM and the required SMTP credentials."
            );
        }
        JavaMailSender sender = mailSenderProvider.getIfAvailable();
        if (sender == null) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "SMTP mail sender is unavailable.");
        }

        try {
            MimeMessage message = sender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
            String invoiceNumber = invoice.invoiceNumber() == null ? "INV-" + invoice.id() : invoice.invoiceNumber();
            helper.setFrom(fromAddress);
            helper.setTo(recipient);
            helper.setSubject("Invoice " + invoiceNumber);
            helper.setText(
                    "Hello " + (invoice.customerName() == null ? "Customer" : invoice.customerName()) + ",\n\n"
                            + "Please find invoice " + invoiceNumber + " attached.\n"
                            + "Total: " + invoice.totalAmount() + "\n"
                            + "Outstanding balance: " + invoice.balanceDue() + "\n\n"
                            + "Regards,\n" + invoice.companyName(),
                    false
            );
            helper.addAttachment(invoiceNumber + ".pdf", new ByteArrayResource(pdfService.generate(invoice)));
            sender.send(message);
        } catch (MessagingException | MailException exception) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Invoice email could not be sent.", exception);
        }
    }
}
