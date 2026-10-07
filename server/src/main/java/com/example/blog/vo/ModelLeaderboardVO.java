package com.example.blog.vo;

import lombok.Data;

import java.util.ArrayList;
import java.util.List;

/**
 * 某模态的榜单视图。
 */
@Data
public class ModelLeaderboardVO {

    private String modality;
    private String label;

    /** 该模态包含的榜单口径（前端表头） */
    private List<BenchmarkMetaVO> benchmarks = new ArrayList<>();

    private List<ModelBenchmarkRowVO> rows = new ArrayList<>();
}
