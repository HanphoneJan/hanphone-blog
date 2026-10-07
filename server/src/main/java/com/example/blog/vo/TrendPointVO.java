package com.example.blog.vo;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * 趋势数据点。
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class TrendPointVO {
    private String date;
    private Double score;
    private Integer rank;
}
