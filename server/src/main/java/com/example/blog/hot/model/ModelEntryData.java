package com.example.blog.hot.model;

import java.util.Date;
import java.util.Map;

/**
 * 模型榜单采集器归一后的单条模型数据。
 *
 * @param rawName       信源中的原始模型名
 * @param vendor        厂商（可空）
 * @param modality      模态：text / coding / agent / embedding / image / video / speech（可空则沿用已有实体）
 * @param openWeights   是否开源权重（可空）
 * @param releaseDate   发布时间（可空）
 * @param link          模型主页 / 官方链接（可空）
 * @param rank          该信源中的排名（可空）
 * @param benchmarks    榜单 key → 分数
 * @param inputPrice    每百万输入 token 价格 USD（可空）
 * @param outputPrice   每百万输出 token 价格 USD（可空）
 * @param contextWindow 上下文窗口 token（可空）
 */
public record ModelEntryData(
        String rawName,
        String vendor,
        String modality,
        Boolean openWeights,
        Date releaseDate,
        String link,
        Integer rank,
        Map<String, Double> benchmarks,
        Double inputPrice,
        Double outputPrice,
        Integer contextWindow
) {
}
