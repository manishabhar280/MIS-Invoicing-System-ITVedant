package com.codeb.ims.service;

import com.codeb.ims.entity.User;
import com.codeb.ims.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.springframework.security.authentication.DisabledException;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class DatabaseUserDetailsServiceTest {
    @Test
    void loadsOnlyRecognizedRolesAndBcryptPasswords() {
        UserRepository repository = mock(UserRepository.class);
        BCryptPasswordEncoder encoder = new BCryptPasswordEncoder();
        User user = new User();
        user.setUsername("operator");
        user.setPasswordHash(encoder.encode("correct horse"));
        user.setRole("ROLE_USER");
        when(repository.findByUsername("operator")).thenReturn(Optional.of(user));

        var details = new DatabaseUserDetailsService(repository).loadUserByUsername("operator");

        assertTrue(encoder.matches("correct horse", details.getPassword()));
        assertTrue(details.getAuthorities().stream().anyMatch(role -> role.getAuthority().equals("ROLE_USER")));
    }

    @Test
    void disablesUnsupportedRolesAndPlaintextPasswords() {
        UserRepository repository = mock(UserRepository.class);
        User user = new User();
        user.setUsername("legacy");
        user.setPasswordHash("plain-text-must-not-work");
        user.setRole("Sales Person");
        when(repository.findByUsername("legacy")).thenReturn(Optional.of(user));

        assertThrows(DisabledException.class,
                () -> new DatabaseUserDetailsService(repository).loadUserByUsername("legacy"));
    }
}
