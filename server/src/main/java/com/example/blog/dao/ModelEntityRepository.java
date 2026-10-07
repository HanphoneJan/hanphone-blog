package com.example.blog.dao;

import com.example.blog.po.ModelEntity;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ModelEntityRepository extends JpaRepository<ModelEntity, Long> {

    Optional<ModelEntity> findByCanonicalKey(String canonicalKey);

    List<ModelEntity> findByIdIn(List<Long> ids);

    List<ModelEntity> findByDisplayNameContainingIgnoreCaseOrVendorContainingIgnoreCase(
            String displayName, String vendor, Pageable pageable);

    List<ModelEntity> findByVendorAndModality(String vendor, String modality);
}
