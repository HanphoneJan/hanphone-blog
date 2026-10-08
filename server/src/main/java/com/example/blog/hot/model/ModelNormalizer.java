package com.example.blog.hot.model;

import com.example.blog.dao.ModelAliasRepository;
import com.example.blog.dao.ModelEntityRepository;
import com.example.blog.po.ModelAlias;
import com.example.blog.po.ModelEntity;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;

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
    private final VendorRegistry vendorRegistry;

    public ModelNormalizer(ModelEntityRepository entityRepository, ModelAliasRepository aliasRepository,
                           VendorRegistry vendorRegistry) {
        this.entityRepository = entityRepository;
        this.aliasRepository = aliasRepository;
        this.vendorRegistry = vendorRegistry;
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
        nameSlug = ModelNameUtil.stripVariantSuffix(nameSlug);
        // 厂商也用 VendorRegistry 归一，避免同一公司不同写法（moonshot/Kimi、zai/z-ai）分裂成不同实体
        String canonicalVendor = vendorRegistry.label(vendorRegistry.key(vendor));
        String vendorSlug = slug(canonicalVendor != null ? canonicalVendor : vendor);
        return vendorSlug.isEmpty() ? nameSlug : vendorSlug + ":" + nameSlug;
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
