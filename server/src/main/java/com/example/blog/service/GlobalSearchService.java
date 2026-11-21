package com.example.blog.service;

import com.example.blog.vo.SearchResultItem;
import java.util.List;

public interface GlobalSearchService {
    /**
     * 全局搜索。
     *
     * @param query 关键词
     * @param type  内容类型：null/空表示全部；允许 BLOG/ESSAY/PROJECT/DOC（忽略大小写）
     * @param limit 合并后最多返回的条数
     * @return 按评分、更新时间倒序的结果
     * @throws IllegalArgumentException type 不在允许范围内
     */
    List<SearchResultItem> search(String query, String type, int limit);
}
