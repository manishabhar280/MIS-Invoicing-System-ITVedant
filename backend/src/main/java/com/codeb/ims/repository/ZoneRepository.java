package com.codeb.ims.repository;

import com.codeb.ims.entity.Zone;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ZoneRepository extends JpaRepository<Zone, Integer> {

    List<Zone> findByBrand_BrandId(Long brandId);

    List<Zone> findByBrand_Chain_ChainId(Long chainId);

    List<Zone> findByBrand_Chain_Group_GroupId(Long groupId);
}
