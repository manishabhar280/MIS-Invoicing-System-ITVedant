package com.codeb.ims.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "subzones")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Subzone {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "subzone_id")
    private Long subzoneId;

    @Column(name = "subzone_name", nullable = false)
    private String subzoneName;
}