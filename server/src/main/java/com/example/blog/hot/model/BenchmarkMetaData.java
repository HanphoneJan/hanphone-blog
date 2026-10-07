package com.example.blog.hot.model;

/**
 * 榜单元数据定义。
 *
 * @param key            榜单 key（写入 model_benchmark.benchmark_key）
 * @param name           展示名
 * @param category       所属模态：text / coding / agent / embedding / image / video / speech
 * @param unit           单位：index / elo / % / score / ips
 * @param higherIsBetter 是否越大越好
 * @param sourceKey      来源信源 key
 */
public record BenchmarkMetaData(
        String key,
        String name,
        String category,
        String unit,
        boolean higherIsBetter,
        String sourceKey
) {
}
