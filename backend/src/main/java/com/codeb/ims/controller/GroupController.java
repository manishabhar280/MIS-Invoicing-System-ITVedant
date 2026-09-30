package com.codeb.ims.controller;

import com.codeb.ims.entity.Group;
import com.codeb.ims.service.GroupService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/groups")
@CrossOrigin(origins = "*")
public class GroupController {

    private final GroupService groupService;

    public GroupController(GroupService groupService) {
        this.groupService = groupService;
    }

    // Add new group
    @PostMapping
    public ResponseEntity<Group> addGroup(@RequestBody Group group) {
        Group savedGroup = groupService.addGroup(group);
        return new ResponseEntity<>(savedGroup, HttpStatus.CREATED);
    }

    // Get all groups
    @GetMapping
    public ResponseEntity<List<Group>> getAllGroups() {
        List<Group> groups = groupService.getAllGroups();
        return ResponseEntity.ok(groups);
    }

    // Get group by ID
    @GetMapping("/{id}")
    public ResponseEntity<Group> getGroupById(@PathVariable Long id) {
        Group group = groupService.getGroupById(id);
        return ResponseEntity.ok(group);
    }

    // Update group
    @PutMapping("/{id}")
    public ResponseEntity<Group> updateGroup(
            @PathVariable Long id,
            @RequestBody Group group) {

        Group updatedGroup = groupService.updateGroup(id, group);
        return ResponseEntity.ok(updatedGroup);
    }

    // Deactivate group
    @DeleteMapping("/{id}")
    public ResponseEntity<Group> deactivateGroup(@PathVariable Long id) {
        Group deactivatedGroup = groupService.deactivateGroup(id);
        return ResponseEntity.ok(deactivatedGroup);
    }

    // Activate group
    @PutMapping("/{id}/activate")
    public ResponseEntity<Group> activateGroup(@PathVariable Long id) {
        Group activatedGroup = groupService.activateGroup(id);
        return ResponseEntity.ok(activatedGroup);
    }

    // Get only active groups
    @GetMapping("/active")
    public ResponseEntity<List<Group>> getActiveGroups() {
        List<Group> groups = groupService.getActiveGroups();
        return ResponseEntity.ok(groups);
    }

    // Get only inactive groups
    @GetMapping("/inactive")
    public ResponseEntity<List<Group>> getInactiveGroups() {
        List<Group> groups = groupService.getInactiveGroups();
        return ResponseEntity.ok(groups);
    }

    // Handle duplicate or invalid group name
    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<String> handleIllegalArgumentException(
            IllegalArgumentException ex) {

        return ResponseEntity
                .status(HttpStatus.CONFLICT)
                .body(ex.getMessage());
    }
}