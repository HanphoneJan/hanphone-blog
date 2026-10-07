package com.example.blog.vo;

import lombok.Data;

import java.util.ArrayList;
import java.util.List;

/**
 * 精选代表模型分组。
 */
@Data
public class FeaturedGroupVO {

    private String key;
    private String label;
    private String modality;
    private List<FeaturedModelVO> models = new ArrayList<>();
}
