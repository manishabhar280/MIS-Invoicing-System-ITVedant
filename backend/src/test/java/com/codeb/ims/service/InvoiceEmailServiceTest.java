package com.codeb.ims.service;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.http.HttpStatus;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.server.ResponseStatusException;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class InvoiceEmailServiceTest {
    @Test
    void reportsMissingSmtpConfigurationWithoutAttemptingToSend() {
        @SuppressWarnings("unchecked")
        ObjectProvider<JavaMailSender> provider = mock(ObjectProvider.class);
        InvoiceEmailService service = new InvoiceEmailService(provider, new InvoicePdfService());
        ReflectionTestUtils.setField(service, "smtpHost", "");
        ReflectionTestUtils.setField(service, "fromAddress", "");
        ReflectionTestUtils.setField(service, "smtpAuth", true);

        ResponseStatusException exception = assertThrows(
                ResponseStatusException.class,
                () -> service.send(null, "recipient@example.com")
        );

        assertEquals(HttpStatus.SERVICE_UNAVAILABLE, exception.getStatusCode());
        verifyNoInteractions(provider);
    }
}
