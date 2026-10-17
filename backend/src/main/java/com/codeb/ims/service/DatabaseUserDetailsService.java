package com.codeb.ims.service;

import com.codeb.ims.entity.User;
import com.codeb.ims.repository.UserRepository;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.authentication.DisabledException;
import org.springframework.stereotype.Service;

import java.util.Locale;

@Service
public class DatabaseUserDetailsService implements UserDetailsService {
    private final UserRepository userRepository;

    public DatabaseUserDetailsService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @Override
    public UserDetails loadUserByUsername(String username) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new UsernameNotFoundException("Invalid username or password"));
        String passwordHash = user.getPasswordHash();
        if (passwordHash == null || !passwordHash.matches("\\$2[aby]\\$\\d{2}\\$[./A-Za-z0-9]{53}")) {
            throw new DisabledException("Account credentials are not provisioned for backend authentication");
        }

        String role = user.getRole() == null
                ? ""
                : user.getRole().trim().toUpperCase(Locale.ROOT).replaceFirst("^ROLE_", "");
        if (!role.equals("ADMIN") && !role.equals("USER")) {
            throw new DisabledException("Account role is not enabled for invoice operations");
        }

        return org.springframework.security.core.userdetails.User
                .withUsername(user.getUsername())
                .password(passwordHash)
                .roles(role)
                .build();
    }
}
