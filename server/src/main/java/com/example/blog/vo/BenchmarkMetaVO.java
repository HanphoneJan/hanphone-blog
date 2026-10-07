package com.example.blog.vo;

import lombok.Data;

/**
 * 榜单元数据。
 */
@Data
public class BenchmarkMetaVO {

    private String key;
    private String name;
    private String category;
    private String unit;
    private boolean higherIsBetter;
    private String sourceKey;
}
