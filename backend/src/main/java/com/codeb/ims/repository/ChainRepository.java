package com.codeb.ims.repository;

import com.codeb.ims.entity.Chain;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ChainRepository extends JpaRepository<Chain, Long> {

    List<Chain> findByIsActive(Boolean isActive);

    boolean existsByGstnNo(String gstnNo);

    boolean existsByGstnNoAndChainIdNot(String gstnNo, Long chainId);

    List<Chain> findByGroup_GroupId(Long groupId);
}
