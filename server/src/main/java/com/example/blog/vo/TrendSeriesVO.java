package com.example.blog.vo;

import lombok.Data;

import java.util.ArrayList;
import java.util.List;

/**
 * 一条趋势序列（label 为模型名或榜单名）。
 */
@Data
public class TrendSeriesVO {
    private String key;
    private String label;
    private String unit;
    private List<TrendPointVO> points = new ArrayList<>();
}
