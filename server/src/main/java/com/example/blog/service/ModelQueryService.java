package com.example.blog.service;

import com.example.blog.vo.BenchmarkMetaVO;
import com.example.blog.vo.FeaturedGroupVO;
import com.example.blog.vo.LeaderboardTrendVO;
import com.example.blog.vo.ModelBenchmarkRowVO;
import com.example.blog.vo.ModelCompareVO;
import com.example.blog.vo.ModelLeaderboardVO;
import com.example.blog.vo.ModelTrendVO;

import java.util.List;

/**
 * 模型榜单只读查询服务。
 */
public interface ModelQueryService {

    ModelLeaderboardVO getLeaderboard(String modality);

    List<BenchmarkMetaVO> getBenchmarks();

    List<ModelBenchmarkRowVO> searchModels(String query, int limit);

    ModelBenchmarkRowVO getModel(String canonicalKey);

    /** 精选代表模型（对比页一键添加） */
    List<FeaturedGroupVO> getFeatured();

    /** 多个模型的综合对比 */
    ModelCompareVO compare(List<String> modelKeys);

    /** 单个模型某榜单的历史趋势 */
    ModelTrendVO getModelTrend(String canonicalKey, int days);

    /** 某模态主榜头部模型的历史趋势 */
    LeaderboardTrendVO getLeaderboardTrend(String modality, int days, int top);
}
