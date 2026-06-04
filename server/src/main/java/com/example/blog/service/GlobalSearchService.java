package com.example.blog.service;

import com.example.blog.vo.SearchResultItem;
import java.util.List;

public interface GlobalSearchService {
    List<SearchResultItem> search(String query, int limit);
}
