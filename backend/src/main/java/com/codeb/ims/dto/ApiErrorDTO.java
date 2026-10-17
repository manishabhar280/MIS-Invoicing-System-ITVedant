package com.codeb.ims.dto;

import java.time.Instant;

public record ApiErrorDTO(Instant timestamp, int status, String error, String message) {
}
