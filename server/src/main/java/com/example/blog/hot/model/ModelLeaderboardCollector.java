package com.example.blog.hot.model;

import java.util.List;

/**
 * 模型榜单采集器。实现只负责「抓取 + 归一」，落库与健康记录由
 * {@link ModelLeaderboardService} 统一处理。
 */
public interface ModelLeaderboardCollector {

    /** 信源唯一 key */
    String key();

    String displayName();

    String sourceUrl();

    /** 未配置凭证等情况下返回 false，采集框架会跳过且不计为失败 */
    default boolean enabled() {
        return true;
    }

    List<ModelEntryData> fetch() throws Exception;
}
