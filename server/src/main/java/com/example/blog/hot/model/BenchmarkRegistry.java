package com.example.blog.hot.model;

import org.springframework.stereotype.Component;

import java.util.Collection;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

/**
 * 已知榜单注册表：定义榜单口径、单位与所属模态，并指定每个模态的默认排序榜单。
 */
@Component
public class BenchmarkRegistry {

    private final Map<String, BenchmarkMetaData> definitions = new LinkedHashMap<>();

    /** 模态 → 列表页默认排序所用的主榜榜单 key */
    private final Map<String, String> primaryByCategory = new LinkedHashMap<>();

    public BenchmarkRegistry() {
        register(new BenchmarkMetaData("aa_intelligence", "AA 智能指数", "text", "index", true, "artificial-analysis"));
        register(new BenchmarkMetaData("aa_coding", "AA 代码指数", "coding", "index", true, "artificial-analysis"));
        register(new BenchmarkMetaData("aa_agentic", "AA 智能体指数", "agent", "index", true, "artificial-analysis"));
        register(new BenchmarkMetaData("aa_image_t2i", "AA 文生图 Arena", "image", "elo", true, "artificial-analysis"));
        register(new BenchmarkMetaData("aa_image_edit", "AA 图像编辑 Arena", "image", "elo", true, "artificial-analysis"));
        register(new BenchmarkMetaData("aa_video_t2v", "AA 文生视频 Arena", "video", "elo", true, "artificial-analysis"));
        register(new BenchmarkMetaData("aa_video_i2v", "AA 图生视频 Arena", "video", "elo", true, "artificial-analysis"));
        register(new BenchmarkMetaData("aa_tts", "AA 语音合成 Arena", "speech", "elo", true, "artificial-analysis"));

        register(new BenchmarkMetaData("lmarena_text", "LMArena 文本", "text", "elo", true, "lmarena"));
        register(new BenchmarkMetaData("lmarena_agent", "LMArena Agent", "agent", "ips", true, "lmarena"));
        register(new BenchmarkMetaData("lmarena_image_t2i", "LMArena 文生图", "image", "elo", true, "lmarena"));
        register(new BenchmarkMetaData("lmarena_image_edit", "LMArena 图像编辑", "image", "elo", true, "lmarena"));
        register(new BenchmarkMetaData("lmarena_video_t2v", "LMArena 文生视频", "video", "elo", true, "lmarena"));
        register(new BenchmarkMetaData("lmarena_video_i2v", "LMArena 图生视频", "video", "elo", true, "lmarena"));

        register(new BenchmarkMetaData("mteb_eng_v2", "MTEB(eng, v2)", "embedding", "score", true, "mteb"));
        register(new BenchmarkMetaData("mteb_cmn_v1", "MTEB(cmn, v1)", "embedding", "score", true, "mteb"));

        register(new BenchmarkMetaData("swe_bench_verified", "SWE-bench Verified", "coding", "%", true, "swe-bench"));
        register(new BenchmarkMetaData("terminal_bench", "Terminal-Bench", "coding", "%", true, "terminal-bench"));

        register(new BenchmarkMetaData("vbench_total", "VBench 总分", "video", "%", true, "vbench"));
        register(new BenchmarkMetaData("vbench_quality", "VBench 质量分", "video", "%", true, "vbench"));

        setPrimary("text", "aa_intelligence");
        setPrimary("coding", "aa_coding");
        setPrimary("agent", "aa_agentic");
        setPrimary("embedding", "mteb_eng_v2");
        setPrimary("image", "aa_image_t2i");
        setPrimary("video", "aa_video_t2v");
        setPrimary("speech", "aa_tts");
    }

    private void register(BenchmarkMetaData meta) {
        definitions.put(meta.key(), meta);
    }

    private void setPrimary(String category, String key) {
        primaryByCategory.put(category, key);
    }

    public Optional<BenchmarkMetaData> get(String key) {
        return Optional.ofNullable(definitions.get(key));
    }

    public Collection<BenchmarkMetaData> all() {
        return definitions.values();
    }

    public List<String> keysForCategory(String category) {
        return definitions.values().stream()
                .filter(m -> m.category().equals(category))
                .map(BenchmarkMetaData::key)
                .collect(Collectors.toList());
    }

    /** 该模态的主榜 key；若主榜不在该模态则退回该模态第一个榜单 */
    public String primaryKey(String category) {
        String primary = primaryByCategory.get(category);
        if (primary != null && definitions.containsKey(primary)) {
            return primary;
        }
        List<String> keys = keysForCategory(category);
        return keys.isEmpty() ? null : keys.get(0);
    }
}
