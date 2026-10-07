package com.example.blog.web;

import com.example.blog.po.Result;
import com.example.blog.po.StatusCode;
import com.example.blog.service.ModelQueryService;
import com.example.blog.vo.BenchmarkMetaVO;
import com.example.blog.vo.FeaturedGroupVO;
import com.example.blog.vo.LeaderboardTrendVO;
import com.example.blog.vo.ModelBenchmarkRowVO;
import com.example.blog.vo.ModelCompareVO;
import com.example.blog.vo.ModelLeaderboardVO;
import com.example.blog.vo.ModelTrendVO;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * 模型榜单公开只读接口。
 */
@RestController
public class ModelShowController {

    private final ModelQueryService modelQueryService;

    public ModelShowController(ModelQueryService modelQueryService) {
        this.modelQueryService = modelQueryService;
    }

    @GetMapping("/hot/leaderboards")
    public Result<ModelLeaderboardVO> leaderboards(
            @RequestParam(defaultValue = "text") String modality) {
        return new Result<>(true, StatusCode.OK, "获取模型榜单成功",
                modelQueryService.getLeaderboard(modality));
    }

    @GetMapping("/hot/leaderboards/trend")
    public Result<LeaderboardTrendVO> leaderboardTrend(
            @RequestParam(defaultValue = "text") String modality,
            @RequestParam(defaultValue = "30") int days,
            @RequestParam(defaultValue = "5") int top) {
        return new Result<>(true, StatusCode.OK, "获取榜单趋势成功",
                modelQueryService.getLeaderboardTrend(modality, days, top));
    }

    @GetMapping("/hot/benchmarks")
    public Result<List<BenchmarkMetaVO>> benchmarks() {
        return new Result<>(true, StatusCode.OK, "获取榜单元数据成功",
                modelQueryService.getBenchmarks());
    }

    @GetMapping("/hot/models")
    public Result<List<ModelBenchmarkRowVO>> models(@RequestParam String q,
                                                    @RequestParam(defaultValue = "20") int limit) {
        return new Result<>(true, StatusCode.OK, "搜索模型成功",
                modelQueryService.searchModels(q, limit));
    }

    @GetMapping("/hot/models/featured")
    public Result<List<FeaturedGroupVO>> featured() {
        return new Result<>(true, StatusCode.OK, "获取精选模型成功",
                modelQueryService.getFeatured());
    }

    @GetMapping("/hot/models/compare")
    public Result<ModelCompareVO> compare(@RequestParam List<String> keys) {
        return new Result<>(true, StatusCode.OK, "获取模型对比成功",
                modelQueryService.compare(keys));
    }

    @GetMapping("/hot/models/{key}")
    public Result<ModelBenchmarkRowVO> model(@PathVariable String key) {
        ModelBenchmarkRowVO row = modelQueryService.getModel(key);
        if (row == null) {
            return new Result<>(false, StatusCode.ERROR, "模型不存在", null);
        }
        return new Result<>(true, StatusCode.OK, "获取模型成功", row);
    }

    @GetMapping("/hot/models/{key}/trend")
    public Result<ModelTrendVO> modelTrend(@PathVariable String key,
                                           @RequestParam(defaultValue = "30") int days) {
        ModelTrendVO trend = modelQueryService.getModelTrend(key, days);
        if (trend == null) {
            return new Result<>(false, StatusCode.ERROR, "模型不存在", null);
        }
        return new Result<>(true, StatusCode.OK, "获取模型趋势成功", trend);
    }
}
