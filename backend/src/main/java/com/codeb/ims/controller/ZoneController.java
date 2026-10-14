package com.codeb.ims.controller;

import com.codeb.ims.dto.ZoneRequestDTO;
import com.codeb.ims.dto.ZoneResponseDTO;
import com.codeb.ims.service.ZoneService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.NoSuchElementException;

@RestController
@RequestMapping({"/api/zones", "/api/v1/zones"})
@CrossOrigin(origins = "*")
public class ZoneController {

    private final ZoneService zoneService;

    public ZoneController(ZoneService zoneService) {
        this.zoneService = zoneService;
    }

    @PostMapping
    public ResponseEntity<ZoneResponseDTO> createZone(@RequestBody ZoneRequestDTO request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(zoneService.createZone(request));
    }

    @GetMapping
    public ResponseEntity<List<ZoneResponseDTO>> getAllZones() {
        return ResponseEntity.ok(zoneService.getAllZones());
    }

    @GetMapping("/brand/{brandId}")
    public ResponseEntity<List<ZoneResponseDTO>> getZonesByBrandId(@PathVariable Long brandId) {
        return ResponseEntity.ok(zoneService.getZonesByBrandId(brandId));
    }

    @GetMapping("/chain/{chainId}")
    public ResponseEntity<List<ZoneResponseDTO>> getZonesByChainId(@PathVariable Long chainId) {
        return ResponseEntity.ok(zoneService.getZonesByChainId(chainId));
    }

    @GetMapping("/group/{groupId}")
    public ResponseEntity<List<ZoneResponseDTO>> getZonesByGroupId(@PathVariable Long groupId) {
        return ResponseEntity.ok(zoneService.getZonesByGroupId(groupId));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ZoneResponseDTO> getZoneById(@PathVariable Long id) {
        return ResponseEntity.ok(zoneService.getZoneById(id));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ZoneResponseDTO> updateZone(
            @PathVariable Long id,
            @RequestBody ZoneRequestDTO request) {
        return ResponseEntity.ok(zoneService.updateZone(id, request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ZoneResponseDTO> deactivateZone(@PathVariable Long id) {
        return ResponseEntity.ok(zoneService.deactivateZone(id));
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<String> handleInvalidRequest(IllegalArgumentException ex) {
        return ResponseEntity.badRequest().body(ex.getMessage());
    }

    @ExceptionHandler(NoSuchElementException.class)
    public ResponseEntity<String> handleNotFound(NoSuchElementException ex) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(ex.getMessage());
    }
}
