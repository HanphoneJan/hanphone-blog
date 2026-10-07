package com.example.blog.vo;

import lombok.Data;

import java.util.ArrayList;
import java.util.List;

/**
 * 单个模型各榜单的趋势（序列 = 榜单）。
 */
@Data
public class ModelTrendVO {
    private String modelKey;
    private String displayName;
    private List<TrendSeriesVO> series = new ArrayList<>();
}
