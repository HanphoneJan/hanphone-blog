package com.example.blog.vo;

import lombok.Data;

import java.util.ArrayList;
import java.util.List;

/**
 * 模型综合对比结果：选中的模型 + 它们涉及的榜单口径并集。
 */
@Data
public class ModelCompareVO {

    private List<ModelBenchmarkRowVO> models = new ArrayList<>();

    /** 所有选中模型涉及的榜单元数据，按展示顺序排列 */
    private List<BenchmarkMetaVO> benchmarks = new ArrayList<>();
}
