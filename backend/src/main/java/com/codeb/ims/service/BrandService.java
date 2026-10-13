package com.codeb.ims.service;

import com.codeb.ims.entity.Brand;
import com.codeb.ims.entity.Chain;
import com.codeb.ims.repository.BrandRepository;
import com.codeb.ims.repository.ChainRepository;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.NoSuchElementException;

@Service
public class BrandService {

    private final BrandRepository brandRepository;
    private final ChainRepository chainRepository;

    public BrandService(BrandRepository brandRepository, ChainRepository chainRepository) {
        this.brandRepository = brandRepository;
        this.chainRepository = chainRepository;
    }

    public List<Brand> getAllBrands() {
        return brandRepository.findAll();
    }

    public Brand getBrandById(Long id) {
        return brandRepository.findById(id)
                .orElseThrow(() ->
                        new NoSuchElementException("Brand not found with ID: " + id));
    }

    public Brand addBrand(String brandName, Long chainId) {
        Brand brand = new Brand();
        brand.setBrandName(validateBrandName(brandName));
        brand.setChain(requireChain(chainId));
        brand.setIsActive(true);
        return brandRepository.save(brand);
    }

    public Brand updateBrand(
            Long id,
            String brandName,
            boolean brandNameProvided,
            Long chainId,
            boolean chainIdProvided) {
        if (!brandNameProvided && !chainIdProvided) {
            throw new IllegalArgumentException("Provide brand_name or chain_id to update");
        }

        Brand existingBrand = getBrandById(id);
        if (brandNameProvided) {
            existingBrand.setBrandName(validateBrandName(brandName));
        }
        if (chainIdProvided) {
            existingBrand.setChain(requireChain(chainId));
        }

        return brandRepository.save(existingBrand);
    }

    public Brand deactivateBrand(Long id) {
        Brand existingBrand = getBrandById(id);
        existingBrand.setIsActive(false);
        return brandRepository.save(existingBrand);
    }

    private String validateBrandName(String brandName) {
        if (brandName == null || brandName.trim().isEmpty()) {
            throw new IllegalArgumentException("brand_name is required");
        }
        String trimmedBrandName = brandName.trim();
        if (trimmedBrandName.length() > 50) {
            throw new IllegalArgumentException("brand_name must not exceed 50 characters");
        }
        return trimmedBrandName;
    }

    private Chain requireChain(Long chainId) {
        if (chainId == null) {
            throw new IllegalArgumentException("chain_id is required");
        }
        return chainRepository.findById(chainId)
                .orElseThrow(() ->
                        new NoSuchElementException("Chain not found with ID: " + chainId));
    }
}
