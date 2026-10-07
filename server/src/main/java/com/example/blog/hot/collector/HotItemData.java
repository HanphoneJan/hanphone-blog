package com.example.blog.hot.collector;

import java.util.Date;

/**
 * 采集器归一后的单条热点数据。
 *
 * @param category    分类，可为空（为空时使用采集器的默认分类）
 * @param itemKey     源内稳定 key
 * @param title       标题
 * @param url         原文链接
 * @param author      作者 / 组织
 * @param tags        逗号分隔标签
 * @param score       热度 / 星数 / 分数
 * @param rank        排名（从 1 开始）
 * @param extra       原始补充信息（JSON 字符串）
 * @param publishedAt 原始发布时间
 */
public record HotItemData(
        String category,
        String itemKey,
        String title,
        String url,
        String author,
        String tags,
        Double score,
        Integer rank,
        String extra,
        Date publishedAt
) {
}
