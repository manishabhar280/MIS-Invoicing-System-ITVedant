package com.codeb.ims.repository;

import com.codeb.ims.entity.Group;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface GroupRepository extends JpaRepository<Group, Long> {

    Optional<Group> findByGroupNameIgnoreCase(String groupName);

    boolean existsByGroupNameIgnoreCase(String groupName);

    List<Group> findByIsActive(Boolean isActive);
}