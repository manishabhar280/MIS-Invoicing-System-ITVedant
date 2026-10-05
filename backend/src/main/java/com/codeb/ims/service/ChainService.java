package com.codeb.ims.service;

import com.codeb.ims.entity.Chain;
import com.codeb.ims.entity.Group;
import com.codeb.ims.repository.ChainRepository;
import com.codeb.ims.repository.GroupRepository;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Locale;
import java.util.regex.Pattern;

@Service
public class ChainService {

    private static final Pattern GSTN_PATTERN =
            Pattern.compile("\\A[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9]Z[A-Z0-9]\\z");

    private final ChainRepository chainRepository;
    private final GroupRepository groupRepository;

    public ChainService(ChainRepository chainRepository, GroupRepository groupRepository) {
        this.chainRepository = chainRepository;
        this.groupRepository = groupRepository;
    }

    public Chain addChain(Chain chain) {
        if (chain == null) {
            throw new IllegalArgumentException("Chain is required");
        }

        chain.setCompanyName(validateCompanyName(chain.getCompanyName()));
        String gstnNo = validateGstnNo(chain.getGstnNo());
        Group group = requireGroup(chain.getGroup());

        if (chainRepository.existsByGstnNo(gstnNo)) {
            throw new IllegalArgumentException("GSTN already exists");
        }

        chain.setChainId(null);
        chain.setGstnNo(gstnNo);
        chain.setGroup(group);
        chain.setIsActive(true);

        return chainRepository.save(chain);
    }

    public List<Chain> getAllChains() {
        return chainRepository.findAll();
    }

    public Chain getChainById(Long id) {
        return chainRepository.findById(id)
                .orElseThrow(() ->
                        new RuntimeException("Chain not found with ID: " + id));
    }

    public Chain updateChain(Long id, Chain updatedChain) {
        if (updatedChain == null) {
            throw new IllegalArgumentException("Chain is required");
        }

        Chain existingChain = getChainById(id);
        String companyName = validateCompanyName(updatedChain.getCompanyName());
        String gstnNo = validateGstnNo(updatedChain.getGstnNo());
        Group group = requireGroup(updatedChain.getGroup());

        if (chainRepository.existsByGstnNoAndChainIdNot(gstnNo, id)) {
            throw new IllegalArgumentException("GSTN already exists");
        }

        existingChain.setCompanyName(companyName);
        existingChain.setGstnNo(gstnNo);
        existingChain.setGroup(group);
        if (updatedChain.getIsActive() != null) {
            existingChain.setIsActive(updatedChain.getIsActive());
        }
        existingChain.setUpdatedAt(LocalDateTime.now());

        return chainRepository.save(existingChain);
    }

    public Chain deactivateChain(Long id) {
        Chain existingChain = getChainById(id);
        existingChain.setIsActive(false);
        return chainRepository.save(existingChain);
    }

    public Chain activateChain(Long id) {
        Chain existingChain = getChainById(id);
        existingChain.setIsActive(true);
        return chainRepository.save(existingChain);
    }

    public List<Chain> getActiveChains() {
        return chainRepository.findByIsActive(true);
    }

    public List<Chain> getInactiveChains() {
        return chainRepository.findByIsActive(false);
    }

    public List<Chain> getChainsByGroup(Long groupId) {
        requireGroupId(groupId);
        return chainRepository.findByGroup_GroupId(groupId);
    }

    private String validateCompanyName(String companyName) {
        if (companyName == null || companyName.trim().isEmpty()) {
            throw new IllegalArgumentException("Company name is required");
        }
        return companyName.trim();
    }

    private String validateGstnNo(String gstnNo) {
        if (gstnNo == null || gstnNo.isBlank()) {
            throw new IllegalArgumentException("GSTN is required");
        }

        String normalizedGstn = gstnNo.toUpperCase(Locale.ROOT);
        if (!GSTN_PATTERN.matcher(normalizedGstn).matches()) {
            throw new IllegalArgumentException("GSTN must be a valid 15-character GSTIN");
        }
        return normalizedGstn;
    }

    private Group requireGroup(Group group) {
        if (group == null || group.getGroupId() == null) {
            throw new IllegalArgumentException("Group is required");
        }
        return requireGroupId(group.getGroupId());
    }

    private Group requireGroupId(Long groupId) {
        if (groupId == null) {
            throw new IllegalArgumentException("Group ID is required");
        }
        return groupRepository.findById(groupId)
                .orElseThrow(() ->
                        new IllegalArgumentException("Group not found with ID: " + groupId));
    }
}
