package com.example.blog.service;

import com.example.blog.vo.BenchmarkMetaVO;
import com.example.blog.vo.LeaderboardTrendVO;
import com.example.blog.vo.ModelBenchmarkRowVO;
import com.example.blog.vo.ModelCompareVO;
import com.example.blog.vo.ModelLeaderboardVO;
import com.example.blog.vo.ModelTrendVO;
import com.example.blog.vo.VendorVO;

import java.util.List;

/**
 * 模型榜单只读查询服务。
 */
public interface ModelQueryService {

    ModelLeaderboardVO getLeaderboard(String modality, boolean normalized);

    List<BenchmarkMetaVO> getBenchmarks();

    /** 归一后的厂商列表（对比页「按公司」，重点厂商置顶）；normalized=false 时按原始厂商分组 */
    List<VendorVO> getVendors(boolean normalized);

    /**
     * 模型列表：按厂商（规范名）或关键词过滤，支持排序。
     *
     * @param query     名称/厂商关键词（可空）
     * @param vendor    厂商（normalized=true 时为规范名，false 时为原始名）
     * @param sort      newest / name / price / context
     * @param limit     返回上限
     * @param normalized 展示层是否归一（厂商名 + 行内变体后缀）
     */
    List<ModelBenchmarkRowVO> listModels(String query, String vendor, String sort, int limit, boolean normalized);

    ModelBenchmarkRowVO getModel(String canonicalKey, boolean normalized);

    /** 多个模型的综合对比 */
    ModelCompareVO compare(List<String> modelKeys, boolean normalized);

    /** 单个模型某榜单的历史趋势 */
    ModelTrendVO getModelTrend(String canonicalKey, int days);

    /** 某模态主榜头部模型的历史趋势 */
    LeaderboardTrendVO getLeaderboardTrend(String modality, int days, int top);
}
