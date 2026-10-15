package com.codeb.ims.controller;

import com.codeb.ims.dto.EstimateRequestDTO;
import com.codeb.ims.dto.EstimateResponseDTO;
import com.codeb.ims.service.EstimateService;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.NoSuchElementException;

@RestController
@RequestMapping("/api/v1/estimates")
@CrossOrigin(origins = "*")
public class EstimateController {
    private final EstimateService estimateService;

    public EstimateController(EstimateService estimateService) {
        this.estimateService = estimateService;
    }

    @GetMapping
    public ResponseEntity<List<EstimateResponseDTO>> getAllEstimates() {
        return ResponseEntity.ok(estimateService.getAllEstimates());
    }

    @GetMapping("/{id}")
    public ResponseEntity<EstimateResponseDTO> getEstimateById(@PathVariable Long id) {
        return ResponseEntity.ok(estimateService.getEstimateById(id));
    }

    @PostMapping
    public ResponseEntity<EstimateResponseDTO> createEstimate(
            @RequestBody EstimateRequestDTO request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(estimateService.createEstimate(request));
    }

    @PutMapping("/{id}")
    public ResponseEntity<EstimateResponseDTO> updateEstimate(
            @PathVariable Long id,
            @RequestBody EstimateRequestDTO request) {
        return ResponseEntity.ok(estimateService.updateEstimate(id, request));
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<String> handleInvalidRequest(IllegalArgumentException ex) {
        return ResponseEntity.badRequest().body(ex.getMessage());
    }

    @ExceptionHandler(NoSuchElementException.class)
    public ResponseEntity<String> handleNotFound(NoSuchElementException ex) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(ex.getMessage());
    }

    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<String> handleIntegrityViolation(DataIntegrityViolationException ex) {
        return ResponseEntity.status(HttpStatus.CONFLICT)
                .body("The Estimate conflicts with an existing database relationship");
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<String> handleUnreadableRequest(HttpMessageNotReadableException ex) {
        return ResponseEntity.badRequest()
                .body("Invalid Estimate request body; dates must use YYYY-MM-DD format");
    }
}
