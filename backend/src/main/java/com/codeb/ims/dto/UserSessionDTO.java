package com.codeb.ims.dto;

import java.util.List;

public record UserSessionDTO(String username, List<String> roles) {
}
