package com.example.blog.dao;

import com.example.blog.po.ModelPricing;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ModelPricingRepository extends JpaRepository<ModelPricing, Long> {

    Optional<ModelPricing> findByModelIdAndSourceKey(Long modelId, String sourceKey);

    List<ModelPricing> findByModelId(Long modelId);

    List<ModelPricing> findByModelIdIn(List<Long> modelIds);
}
