package com.codeb.ims.repository;

import com.codeb.ims.entity.Estimate;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface EstimateRepository extends JpaRepository<Estimate, Long> {
    List<Estimate> findAllByOrderByEstimatedIdDesc();
}
