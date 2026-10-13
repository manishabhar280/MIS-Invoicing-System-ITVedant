package com.codeb.ims.controller;

import com.codeb.ims.entity.Brand;
import com.codeb.ims.service.BrandService;
import com.fasterxml.jackson.annotation.JsonAlias;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.NoSuchElementException;

@RestController
@RequestMapping({"/api/brands", "/api/v1/brands"})
@CrossOrigin(origins = "*")
public class BrandController {

    private final BrandService brandService;

    public BrandController(BrandService brandService) {
        this.brandService = brandService;
    }

    @GetMapping
    public ResponseEntity<List<Brand>> getAllBrands() {
        return ResponseEntity.ok(brandService.getAllBrands());
    }

    @GetMapping("/{id}")
    public ResponseEntity<Brand> getBrandById(@PathVariable Long id) {
        return ResponseEntity.ok(brandService.getBrandById(id));
    }

    @PostMapping
    public ResponseEntity<Brand> addBrand(@RequestBody BrandRequest request) {
        Brand savedBrand = brandService.addBrand(
                request == null ? null : request.getBrandName(),
                request == null ? null : request.getChainId());
        return new ResponseEntity<>(savedBrand, HttpStatus.CREATED);
    }

    @PutMapping("/{id}")
    public ResponseEntity<Brand> updateBrand(
            @PathVariable Long id,
            @RequestBody BrandRequest request) {
        if (request == null) {
            throw new IllegalArgumentException("Brand update details are required");
        }
        return ResponseEntity.ok(brandService.updateBrand(
                id,
                request.getBrandName(),
                request.isBrandNameProvided(),
                request.getChainId(),
                request.isChainIdProvided()));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Brand> deactivateBrand(@PathVariable Long id) {
        return ResponseEntity.ok(brandService.deactivateBrand(id));
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<String> handleIllegalArgumentException(IllegalArgumentException ex) {
        return ResponseEntity.badRequest().body(ex.getMessage());
    }

    @ExceptionHandler(NoSuchElementException.class)
    public ResponseEntity<String> handleNotFoundException(NoSuchElementException ex) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(ex.getMessage());
    }

    private static class BrandRequest {
        private String brandName;
        private Long chainId;
        private boolean brandNameProvided;
        private boolean chainIdProvided;

        public String getBrandName() {
            return brandName;
        }

        @JsonAlias("brand_name")
        public void setBrandName(String brandName) {
            this.brandName = brandName;
            this.brandNameProvided = true;
        }

        public Long getChainId() {
            return chainId;
        }

        @JsonAlias("chain_id")
        public void setChainId(Long chainId) {
            this.chainId = chainId;
            this.chainIdProvided = true;
        }

        public boolean isBrandNameProvided() {
            return brandNameProvided;
        }

        public boolean isChainIdProvided() {
            return chainIdProvided;
        }
    }
}
