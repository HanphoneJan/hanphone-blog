package com.example.blog.vo;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * 洞察分类及条目数。
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class HotCategoryVO {
    private String key;
    private String label;
    private long count;
}
