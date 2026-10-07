package com.example.blog.vo;

import lombok.Data;

import java.util.ArrayList;
import java.util.List;

/**
 * 某模态主榜的头部模型趋势（序列 = 模型）。
 */
@Data
public class LeaderboardTrendVO {
    private String modality;
    private String benchmarkKey;
    private String benchmarkName;
    private String unit;
    private List<TrendSeriesVO> series = new ArrayList<>();
}
