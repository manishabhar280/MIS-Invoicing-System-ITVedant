package com.codeb.ims.controller;

import com.codeb.ims.entity.Chain;
import com.codeb.ims.entity.Group;
import com.codeb.ims.service.ChainService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/chains")
@CrossOrigin(origins = "*")
public class ChainController {

    private final ChainService chainService;

    public ChainController(ChainService chainService) {
        this.chainService = chainService;
    }

    @PostMapping
    public ResponseEntity<Chain> addChain(@RequestBody ChainRequest request) {
        Chain savedChain = chainService.addChain(toChain(request));
        return new ResponseEntity<>(savedChain, HttpStatus.CREATED);
    }

    @GetMapping
    public ResponseEntity<List<Chain>> getAllChains() {
        return ResponseEntity.ok(chainService.getAllChains());
    }

    @GetMapping("/active")
    public ResponseEntity<List<Chain>> getActiveChains() {
        return ResponseEntity.ok(chainService.getActiveChains());
    }

    @GetMapping("/inactive")
    public ResponseEntity<List<Chain>> getInactiveChains() {
        return ResponseEntity.ok(chainService.getInactiveChains());
    }

    @GetMapping("/group/{groupId}")
    public ResponseEntity<List<Chain>> getChainsByGroup(@PathVariable Long groupId) {
        return ResponseEntity.ok(chainService.getChainsByGroup(groupId));
    }

    @GetMapping("/{chainId}")
    public ResponseEntity<Chain> getChainById(@PathVariable Long chainId) {
        return ResponseEntity.ok(chainService.getChainById(chainId));
    }

    @PutMapping("/{chainId}")
    public ResponseEntity<Chain> updateChain(
            @PathVariable Long chainId,
            @RequestBody ChainRequest request) {
        return ResponseEntity.ok(chainService.updateChain(chainId, toChain(request)));
    }

    @PatchMapping("/{chainId}/deactivate")
    public ResponseEntity<Chain> deactivateChain(@PathVariable Long chainId) {
        return ResponseEntity.ok(chainService.deactivateChain(chainId));
    }

    @PatchMapping("/{chainId}/activate")
    public ResponseEntity<Chain> activateChain(@PathVariable Long chainId) {
        return ResponseEntity.ok(chainService.activateChain(chainId));
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<String> handleIllegalArgumentException(IllegalArgumentException ex) {
        if ("GSTN already exists".equals(ex.getMessage())) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body(ex.getMessage());
        }
        if (ex.getMessage() != null && ex.getMessage().startsWith("Group not found with ID:")) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(ex.getMessage());
        }
        return ResponseEntity.badRequest().body(ex.getMessage());
    }

    @ExceptionHandler(RuntimeException.class)
    public ResponseEntity<String> handleRuntimeException(RuntimeException ex) {
        if (ex.getMessage() != null && ex.getMessage().startsWith("Chain not found with ID:")) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(ex.getMessage());
        }
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body("An unexpected error occurred");
    }

    private Chain toChain(ChainRequest request) {
        Chain chain = new Chain();
        if (request != null) {
            chain.setCompanyName(request.getCompanyName());
            chain.setGstnNo(request.getGstnNo());
            if (request.getGroupId() != null) {
                Group group = new Group();
                group.setGroupId(request.getGroupId());
                chain.setGroup(group);
            }
        }
        return chain;
    }

    private static class ChainRequest {
        private String companyName;
        private String gstnNo;
        private Long groupId;

        public String getCompanyName() {
            return companyName;
        }

        public void setCompanyName(String companyName) {
            this.companyName = companyName;
        }

        public String getGstnNo() {
            return gstnNo;
        }

        public void setGstnNo(String gstnNo) {
            this.gstnNo = gstnNo;
        }

        public Long getGroupId() {
            return groupId;
        }

        public void setGroupId(Long groupId) {
            this.groupId = groupId;
        }
    }
}
