package com.example.blog.hot.model;

import com.example.blog.dao.ModelAliasRepository;
import com.example.blog.dao.ModelEntityRepository;
import com.example.blog.po.ModelAlias;
import com.example.blog.po.ModelEntity;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Arrays;
import java.util.Optional;
import java.util.Set;

/**
 * 模型身份归一：把各信源的原始模型名映射到统一的 {@link ModelEntity}。
 *
 * <p>策略：先按别名（原始名小写）命中；否则按 canonical_key（vendor + 规范化名）命中；
 * 都没有则新建实体，并把本次原始名登记为别名。</p>
 */
@Service
public class ModelNormalizer {

    private final ModelEntityRepository entityRepository;
    private final ModelAliasRepository aliasRepository;

    public ModelNormalizer(ModelEntityRepository entityRepository, ModelAliasRepository aliasRepository) {
        this.entityRepository = entityRepository;
        this.aliasRepository = aliasRepository;
    }

    @Transactional
    public ModelEntity resolve(ModelEntryData entry) {
        String rawName = entry.rawName() == null ? "" : entry.rawName().trim();
        if (rawName.isEmpty()) {
            rawName = entry.link() == null ? "unknown" : entry.link();
        }
        String alias = rawName.toLowerCase();

        Optional<ModelAlias> existingAlias = aliasRepository.findByAlias(alias);
        if (existingAlias.isPresent()) {
            Optional<ModelEntity> byId = entityRepository.findById(existingAlias.get().getModelId());
            if (byId.isPresent()) {
                ModelEntity entity = byId.get();
                enrich(entity, entry);
                return entityRepository.save(entity);
            }
        }

        String canonicalKey = canonicalKey(entry.vendor(), rawName);
        ModelEntity entity = entityRepository.findByCanonicalKey(canonicalKey).orElseGet(ModelEntity::new);
        if (entity.getId() == null) {
            entity.setCanonicalKey(canonicalKey);
            entity.setDisplayName(rawName);
        }
        enrich(entity, entry);
        entity = entityRepository.save(entity);

        if (aliasRepository.findByAlias(alias).isEmpty()) {
            ModelAlias row = new ModelAlias();
            row.setAlias(alias);
            row.setModelId(entity.getId());
            aliasRepository.save(row);
        }
        return entity;
    }

    private void enrich(ModelEntity entity, ModelEntryData entry) {
        if (notBlank(entry.vendor())) {
            entity.setVendor(entry.vendor().trim());
        }
        if (notBlank(entry.modality()) && !notBlank(entity.getModality())) {
            entity.setModality(entry.modality());
        }
        if (entry.openWeights() != null) {
            entity.setOpenWeights(entry.openWeights());
        }
        if (entry.releaseDate() != null) {
            entity.setReleaseDate(entry.releaseDate());
        }
        if (notBlank(entry.link())) {
            entity.setLinks(entry.link().trim());
        }
    }

    String canonicalKey(String vendor, String rawName) {
        String name = stripQualifiers(rawName);
        // 去掉名称中形如 "openai/gpt-5" 的厂商前缀，便于与 "GPT-5"(vendor=OpenAI) 合并
        if (notBlank(vendor) && name.toLowerCase().startsWith(vendor.trim().toLowerCase() + "/")) {
            name = name.substring(vendor.trim().length() + 1);
        }
        String nameSlug = slug(name);
        if (nameSlug.isEmpty()) {
            nameSlug = slug(rawName);
        }
        nameSlug = stripVariantSuffix(nameSlug);
        String vendorSlug = slug(vendor);
        return vendorSlug.isEmpty() ? nameSlug : vendorSlug + ":" + nameSlug;
    }

    /** 推理强度/风格等变体后缀：部分信源把 "…(High)" 写成 "…-high"，归一时去掉以合并同一模型 */
    private static final Set<String> VARIANT_TOKENS = Set.of(
            "high", "xhigh", "low", "medium", "minimal", "max",
            "thinking", "reasoning", "reasoner", "non", "default", "fallback", "standard");

    private String stripVariantSuffix(String slug) {
        if (slug == null || slug.isEmpty()) {
            return slug;
        }
        String[] parts = slug.split("-");
        int end = parts.length;
        while (end > 1 && VARIANT_TOKENS.contains(parts[end - 1])) {
            end--;
        }
        if (end == parts.length) {
            return slug;
        }
        return String.join("-", Arrays.copyOfRange(parts, 0, end));
    }

    /** 去掉括号限定词，便于跨信源合并（如 "gpt-oss-20B (high)" → "gpt-oss-20B"） */
    private String stripQualifiers(String name) {
        return name.replaceAll("\\([^)]*\\)", " ").trim();
    }

    private String slug(String value) {
        if (value == null) {
            return "";
        }
        String s = value.toLowerCase().replaceAll("[^a-z0-9]+", "-");
        s = s.replaceAll("^-+|-+$", "");
        return s;
    }

    private boolean notBlank(String s) {
        return s != null && !s.isBlank();
    }
}
