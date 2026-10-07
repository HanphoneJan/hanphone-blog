package com.example.blog.vo;

import lombok.Data;

/**
 * 精选代表模型（用于对比页一键添加）。
 */
@Data
public class FeaturedModelVO {

    private String modelKey;
    private String displayName;
    private String vendor;
    private String modality;
}
