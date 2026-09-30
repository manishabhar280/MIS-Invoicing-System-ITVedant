package com.codeb.ims.service;

import com.codeb.ims.entity.Group;
import com.codeb.ims.repository.GroupRepository;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class GroupService {

    private final GroupRepository groupRepository;

    public GroupService(GroupRepository groupRepository) {
        this.groupRepository = groupRepository;
    }

    // Add new group
    public Group addGroup(Group group) {

        if (group.getGroupName() == null ||
                group.getGroupName().trim().isEmpty()) {
            throw new IllegalArgumentException("Group name is required");
        }

        String groupName = group.getGroupName().trim();

        if (groupRepository.existsByGroupNameIgnoreCase(groupName)) {
            throw new IllegalArgumentException("Group name already exists");
        }

        group.setGroupName(groupName);
        group.setIsActive(true);

        return groupRepository.save(group);
    }

    // Get all groups
    public List<Group> getAllGroups() {
        return groupRepository.findAll();
    }

    // Get group by ID
    public Group getGroupById(Long id) {

        return groupRepository.findById(id)
                .orElseThrow(() ->
                        new RuntimeException("Group not found with ID: " + id));
    }

    // Update group
    public Group updateGroup(Long id, Group updatedGroup) {

        Group existingGroup = getGroupById(id);

        if (updatedGroup.getGroupName() == null ||
                updatedGroup.getGroupName().trim().isEmpty()) {
            throw new IllegalArgumentException("Group name is required");
        }

        String newGroupName = updatedGroup.getGroupName().trim();

        if (!existingGroup.getGroupName().equalsIgnoreCase(newGroupName)
                && groupRepository.existsByGroupNameIgnoreCase(newGroupName)) {

            throw new IllegalArgumentException("Group name already exists");
        }

        existingGroup.setGroupName(newGroupName);

        if (updatedGroup.getIsActive() != null) {
            existingGroup.setIsActive(updatedGroup.getIsActive());
        }

        return groupRepository.save(existingGroup);
    }

    // Soft delete / deactivate group
    public Group deactivateGroup(Long id) {

        Group existingGroup = getGroupById(id);

        existingGroup.setIsActive(false);

        return groupRepository.save(existingGroup);
    }

    // Activate group
    public Group activateGroup(Long id) {

        Group existingGroup = getGroupById(id);

        existingGroup.setIsActive(true);

        return groupRepository.save(existingGroup);
    }

    // Get only active groups
    public List<Group> getActiveGroups() {
        return groupRepository.findByIsActive(true);
    }

    // Get only inactive groups
    public List<Group> getInactiveGroups() {
        return groupRepository.findByIsActive(false);
    }
}
