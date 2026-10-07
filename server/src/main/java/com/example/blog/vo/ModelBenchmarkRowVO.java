package com.example.blog.vo;

import lombok.Data;

import java.util.Date;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * 模型榜单行：某模态下单个模型的一条记录。
 */
@Data
public class ModelBenchmarkRowVO {

    private String modelKey;
    private String displayName;
    private String vendor;
    private String modality;
    private Boolean openWeights;
    private Date releaseDate;
    private String link;

    /** 主榜排名 */
    private Integer rank;

    /** 相对上次快照的排名变化（正 = 上升） */
    private Integer rankChange;

    /** 榜单 key → 分数 */
    private Map<String, Double> scores = new LinkedHashMap<>();

    private Double inputPrice;
    private Double outputPrice;
    private Integer contextWindow;
}
