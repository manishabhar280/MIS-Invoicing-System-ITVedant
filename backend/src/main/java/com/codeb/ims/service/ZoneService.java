package com.codeb.ims.service;

import com.codeb.ims.dto.ZoneRequestDTO;
import com.codeb.ims.dto.ZoneResponseDTO;
import com.codeb.ims.entity.Brand;
import com.codeb.ims.entity.Chain;
import com.codeb.ims.entity.Group;
import com.codeb.ims.entity.Zone;
import com.codeb.ims.repository.BrandRepository;
import com.codeb.ims.repository.ZoneRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.NoSuchElementException;

@Service
public class ZoneService {

    private final ZoneRepository zoneRepository;
    private final BrandRepository brandRepository;

    public ZoneService(ZoneRepository zoneRepository, BrandRepository brandRepository) {
        this.zoneRepository = zoneRepository;
        this.brandRepository = brandRepository;
    }

    @Transactional
    public ZoneResponseDTO createZone(ZoneRequestDTO request) {
        if (request == null) {
            throw new IllegalArgumentException("Zone request body is required");
        }

        Zone zone = new Zone();
        zone.setZoneName(validateZoneName(request.getZoneName()));
        zone.setBrand(requireBrand(request.getBrandId()));
        zone.setIsActive(true);
        return toResponse(zoneRepository.save(zone));
    }

    @Transactional(readOnly = true)
    public List<ZoneResponseDTO> getAllZones() {
        return zoneRepository.findAll().stream().map(this::toResponse).toList();
    }

    @Transactional(readOnly = true)
    public ZoneResponseDTO getZoneById(Long id) {
        return toResponse(requireZone(id));
    }

    @Transactional
    public ZoneResponseDTO updateZone(Long id, ZoneRequestDTO request) {
        validateUpdateRequest(request);

        Zone zone = requireZone(id);
        if (request.isZoneNameProvided()) {
            zone.setZoneName(validateZoneName(request.getZoneName()));
        }
        if (request.isBrandIdProvided()) {
            zone.setBrand(requireBrand(request.getBrandId()));
        }
        if (request.isIsActiveProvided()) {
            if (request.getIsActive() == null) {
                throw new IllegalArgumentException("isActive must be true or false");
            }
            zone.setIsActive(request.getIsActive());
        }
        return toResponse(zoneRepository.save(zone));
    }

    @Transactional
    public ZoneResponseDTO deactivateZone(Long id) {
        Zone zone = requireZone(id);
        zone.setIsActive(false);
        return toResponse(zoneRepository.save(zone));
    }

    @Transactional(readOnly = true)
    public List<ZoneResponseDTO> getZonesByBrandId(Long brandId) {
        validateId(brandId, "brandId");
        return zoneRepository.findByBrand_BrandId(brandId).stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<ZoneResponseDTO> getZonesByChainId(Long chainId) {
        validateId(chainId, "chainId");
        return zoneRepository.findByBrand_Chain_ChainId(chainId).stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<ZoneResponseDTO> getZonesByGroupId(Long groupId) {
        validateId(groupId, "groupId");
        return zoneRepository.findByBrand_Chain_Group_GroupId(groupId).stream()
                .map(this::toResponse)
                .toList();
    }

    private Zone requireZone(Long id) {
        validateId(id, "zoneId");
        return zoneRepository.findById(id)
                .orElseThrow(() -> new NoSuchElementException("Zone not found with ID: " + id));
    }

    private Brand requireBrand(Long brandId) {
        validateId(brandId, "brandId");
        return brandRepository.findById(brandId)
                .orElseThrow(() -> new NoSuchElementException("Brand not found with ID: " + brandId));
    }

    private void validateUpdateRequest(ZoneRequestDTO request) {
        if (request == null) {
            throw new IllegalArgumentException("Zone request body is required");
        }
        if (!request.isZoneNameProvided()
                && !request.isBrandIdProvided()
                && !request.isIsActiveProvided()) {
            throw new IllegalArgumentException("Provide zoneName, brandId, or isActive to update");
        }
        if (request.isZoneNameProvided()) {
            validateZoneName(request.getZoneName());
        }
        if (request.isBrandIdProvided()) {
            validateId(request.getBrandId(), "brandId");
        }
    }

    private String validateZoneName(String zoneName) {
        if (zoneName == null || zoneName.trim().isEmpty()) {
            throw new IllegalArgumentException("zoneName is required");
        }
        String trimmedName = zoneName.trim();
        if (trimmedName.length() > 50) {
            throw new IllegalArgumentException("zoneName must not exceed 50 characters");
        }
        return trimmedName;
    }

    private void validateId(Long id, String fieldName) {
        if (id == null || id <= 0) {
            throw new IllegalArgumentException(fieldName + " must be a positive integer");
        }
    }

    private ZoneResponseDTO toResponse(Zone zone) {
        Brand brand = zone.getBrand();
        Chain chain = brand.getChain();
        Group group = chain.getGroup();
        return new ZoneResponseDTO(
                zone.getZoneId(),
                zone.getZoneName(),
                brand.getBrandId(),
                brand.getBrandName(),
                chain.getChainId(),
                chain.getCompanyName(),
                group.getGroupId(),
                group.getGroupName(),
                zone.getIsActive(),
                zone.getCreatedAt(),
                zone.getUpdatedAt());
    }
}
