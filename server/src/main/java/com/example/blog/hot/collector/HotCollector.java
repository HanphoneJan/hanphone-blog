package com.example.blog.hot.collector;

import java.util.List;

/**
 * 热点信源采集器。每个实现对应一个信源，由
 * {@link com.example.blog.hot.HotCollectService} 统一调度、落库与记录健康状态。
 *
 * <p>实现应只负责「抓取 + 归一」，不做持久化；抛出的异常由采集框架隔离处理。</p>
 */
public interface HotCollector {

    /** 信源唯一 key，对应 hot_source.source_key */
    String key();

    /** 默认分类 */
    String category();

    /** 展示名称 */
    String displayName();

    /** 信源主页 URL */
    String sourceUrl();

    /** 是否启用 */
    default boolean enabled() {
        return true;
    }

    /** 抓取并归一为待入库条目 */
    List<HotItemData> fetch() throws Exception;
}
