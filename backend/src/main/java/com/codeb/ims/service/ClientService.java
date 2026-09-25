package com.codeb.ims.service;

import com.codeb.ims.dto.ClientDTO;
import com.codeb.ims.entity.Client;
import com.codeb.ims.repository.ClientRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class ClientService {

    @Autowired
    private ClientRepository clientRepository;

    public Client createClient(ClientDTO dto) {
        Client client = new Client();
        client.setClientName(dto.getClientName());
        client.setOrganizationName(dto.getOrganizationName());
        client.setGstNumber(dto.getGstNumber());
        return clientRepository.save(client);
    }

    public List<Client> getAllClients() {
        return clientRepository.findAll();
    }

    public Client getClientById(Long id) {
        return clientRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Client not found with id: " + id));
    }
}