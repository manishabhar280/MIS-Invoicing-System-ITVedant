package com.codeb.ims.service;

import com.codeb.ims.dto.EstimateRequestDTO;
import com.codeb.ims.dto.EstimateResponseDTO;
import com.codeb.ims.entity.Brand;
import com.codeb.ims.entity.Chain;
import com.codeb.ims.entity.Estimate;
import com.codeb.ims.entity.Group;
import com.codeb.ims.entity.Zone;
import com.codeb.ims.repository.BrandRepository;
import com.codeb.ims.repository.ChainRepository;
import com.codeb.ims.repository.EstimateRepository;
import com.codeb.ims.repository.ZoneRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.List;
import java.util.NoSuchElementException;

@Service
public class EstimateService {
    private static final int MAX_MONEY_PRECISION = 15;
    private static final int MONEY_SCALE = 2;
    private static final BigDecimal MAX_MONEY =
            BigDecimal.TEN.pow(MAX_MONEY_PRECISION - MONEY_SCALE);

    private final EstimateRepository estimateRepository;
    private final ChainRepository chainRepository;
    private final BrandRepository brandRepository;
    private final ZoneRepository zoneRepository;

    public EstimateService(
            EstimateRepository estimateRepository,
            ChainRepository chainRepository,
            BrandRepository brandRepository,
            ZoneRepository zoneRepository) {
        this.estimateRepository = estimateRepository;
        this.chainRepository = chainRepository;
        this.brandRepository = brandRepository;
        this.zoneRepository = zoneRepository;
    }

    @Transactional(readOnly = true)
    public List<EstimateResponseDTO> getAllEstimates() {
        return estimateRepository.findAllByOrderByEstimatedIdDesc().stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public EstimateResponseDTO getEstimateById(Long id) {
        return toResponse(requireEstimate(id));
    }

    @Transactional
    public EstimateResponseDTO createEstimate(EstimateRequestDTO request) {
        ValidatedEstimate validated = validate(request);
        Estimate estimate = new Estimate();
        apply(estimate, validated);
        return toResponse(estimateRepository.save(estimate));
    }

    @Transactional
    public EstimateResponseDTO updateEstimate(Long id, EstimateRequestDTO request) {
        Estimate estimate = requireEstimate(id);
        ValidatedEstimate validated = validate(request);
        apply(estimate, validated);
        return toResponse(estimateRepository.save(estimate));
    }

    private Estimate requireEstimate(Long id) {
        if (id == null || id <= 0) {
            throw new IllegalArgumentException("estimate_id must be a positive integer");
        }
        return estimateRepository.findById(id)
                .orElseThrow(() ->
                        new NoSuchElementException("Estimate not found with ID: " + id));
    }

    private ValidatedEstimate validate(EstimateRequestDTO request) {
        if (request == null) {
            throw new IllegalArgumentException("Estimate request body is required");
        }
        if (request.getChainId() == null || request.getChainId() <= 0) {
            throw new IllegalArgumentException("chainId must be a positive integer");
        }
        if (request.getBrandId() == null || request.getBrandId() <= 0) {
            throw new IllegalArgumentException("brandId must be a positive integer");
        }
        if (request.getZoneId() == null || request.getZoneId() <= 0) {
            throw new IllegalArgumentException("zoneId must be a positive integer");
        }

        String serviceName = validateText(request.getService(), "service", 255);
        String deliveryDetails = validateText(request.getDeliveryDetails(), "deliveryDetails", 1000);
        Integer qty = request.getQty();
        if (qty == null || qty <= 0) {
            throw new IllegalArgumentException("qty must be a positive integer");
        }
        if (request.getCostPerUnit() == null || request.getCostPerUnit().signum() < 0) {
            throw new IllegalArgumentException("costPerUnit must be zero or greater");
        }

        BigDecimal costPerUnit = normalizeMoney(request.getCostPerUnit(), "costPerUnit");
        BigDecimal totalCost = normalizeMoney(
                costPerUnit.multiply(BigDecimal.valueOf(qty)), "totalCost");
        LocalDate deliveryDate = request.getDeliveryDate();
        if (deliveryDate == null || deliveryDate.isBefore(LocalDate.now())) {
            throw new IllegalArgumentException("deliveryDate must be today or a future date");
        }

        Chain chain = chainRepository.findById(request.getChainId())
                .orElseThrow(() -> new NoSuchElementException(
                        "Chain not found with ID: " + request.getChainId()));
        if (!Boolean.TRUE.equals(chain.getIsActive())) {
            throw new IllegalArgumentException("The selected Chain is inactive");
        }
        Group group = chain.getGroup();
        if (group == null || !Boolean.TRUE.equals(group.getIsActive())) {
            throw new IllegalArgumentException("The selected Chain has no active Group");
        }

        Brand brand = brandRepository.findById(request.getBrandId())
                .orElseThrow(() -> new NoSuchElementException(
                        "Brand not found with ID: " + request.getBrandId()));
        if (!Boolean.TRUE.equals(brand.getIsActive())) {
            throw new IllegalArgumentException("The selected Brand is inactive");
        }
        if (brand.getChain() == null
                || !chain.getChainId().equals(brand.getChain().getChainId())) {
            throw new IllegalArgumentException("The selected Brand does not belong to the selected Chain");
        }

        Zone zone = zoneRepository.findById(request.getZoneId())
                .orElseThrow(() -> new NoSuchElementException(
                        "Zone not found with ID: " + request.getZoneId()));
        if (!Boolean.TRUE.equals(zone.getIsActive())) {
            throw new IllegalArgumentException("The selected Zone is inactive");
        }
        if (zone.getBrand() == null
                || !brand.getBrandId().equals(zone.getBrand().getBrandId())) {
            throw new IllegalArgumentException("The selected Zone does not belong to the selected Brand");
        }

        return new ValidatedEstimate(
                chain, group, brand, zone, serviceName, qty, costPerUnit, totalCost,
                deliveryDate, deliveryDetails);
    }

    private BigDecimal normalizeMoney(BigDecimal value, String fieldName) {
        BigDecimal normalized;
        try {
            normalized = value.setScale(MONEY_SCALE, RoundingMode.UNNECESSARY);
        } catch (ArithmeticException ex) {
            throw new IllegalArgumentException(fieldName + " must have no more than 2 decimal places");
        }
        if (normalized.signum() < 0 || normalized.compareTo(MAX_MONEY) >= 0) {
            throw new IllegalArgumentException(
                    fieldName + " must fit DECIMAL(15,2) and be zero or greater");
        }
        return normalized;
    }

    private String validateText(String value, String fieldName, int maxLength) {
        if (value == null || value.trim().isEmpty()) {
            throw new IllegalArgumentException(fieldName + " is required");
        }
        String trimmed = value.trim();
        if (trimmed.length() > maxLength) {
            throw new IllegalArgumentException(
                    fieldName + " must not exceed " + maxLength + " characters");
        }
        return trimmed;
    }

    private void apply(Estimate estimate, ValidatedEstimate values) {
        estimate.setChain(values.chain());
        estimate.setBrand(values.brand());
        estimate.setZone(values.zone());
        estimate.setGroupName(values.group().getGroupName());
        estimate.setBrandName(values.brand().getBrandName());
        estimate.setZoneName(values.zone().getZoneName());
        estimate.setService(values.service());
        estimate.setQty(values.qty());
        estimate.setCostPerUnit(values.costPerUnit());
        estimate.setTotalCost(values.totalCost());
        if (estimate.getEstimatedId() == null) {
            // The legacy amount column is NOT NULL; populate it for inserts only.
            estimate.setLegacyAmount(values.totalCost());
        }
        estimate.setDeliveryDate(values.deliveryDate());
        estimate.setDeliveryDetails(values.deliveryDetails());
    }

    private EstimateResponseDTO toResponse(Estimate estimate) {
        Chain chain = estimate.getChain();
        Group group = chain == null ? null : chain.getGroup();
        Brand brand = estimate.getBrand();
        Zone zone = estimate.getZone();
        return new EstimateResponseDTO(
                estimate.getEstimatedId(),
                chain == null ? null : chain.getChainId(),
                chain == null ? null : chain.getCompanyName(),
                group == null ? null : group.getGroupId(),
                estimate.getGroupName() != null
                        ? estimate.getGroupName()
                        : group == null ? null : group.getGroupName(),
                brand == null ? null : brand.getBrandId(),
                estimate.getBrandName(),
                zone == null ? null : zone.getZoneId(),
                estimate.getZoneName(),
                estimate.getService(),
                estimate.getQty(),
                estimate.getCostPerUnit(),
                estimate.getTotalCost(),
                estimate.getDeliveryDate(),
                estimate.getDeliveryDetails(),
                estimate.getCreatedAt(),
                estimate.getUpdatedAt());
    }

    private record ValidatedEstimate(
            Chain chain,
            Group group,
            Brand brand,
            Zone zone,
            String service,
            Integer qty,
            BigDecimal costPerUnit,
            BigDecimal totalCost,
            LocalDate deliveryDate,
            String deliveryDetails) {
    }
}
