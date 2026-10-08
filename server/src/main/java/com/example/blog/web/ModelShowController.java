package com.example.blog.web;

import com.example.blog.po.Result;
import com.example.blog.po.StatusCode;
import com.example.blog.service.ModelQueryService;
import com.example.blog.vo.BenchmarkMetaVO;
import com.example.blog.vo.LeaderboardTrendVO;
import com.example.blog.vo.ModelBenchmarkRowVO;
import com.example.blog.vo.ModelCompareVO;
import com.example.blog.vo.ModelLeaderboardVO;
import com.example.blog.vo.ModelTrendVO;
import com.example.blog.vo.VendorVO;
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
            @RequestParam(defaultValue = "text") String modality,
            @RequestParam(defaultValue = "true") boolean normalized) {
        return new Result<>(true, StatusCode.OK, "获取模型榜单成功",
                modelQueryService.getLeaderboard(modality, normalized));
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

    @GetMapping("/hot/vendors")
    public Result<List<VendorVO>> vendors(@RequestParam(defaultValue = "true") boolean normalized) {
        return new Result<>(true, StatusCode.OK, "获取模型厂商成功",
                modelQueryService.getVendors(normalized));
    }

    @GetMapping("/hot/models")
    public Result<List<ModelBenchmarkRowVO>> models(
            @RequestParam(required = false) String q,
            @RequestParam(required = false) String vendor,
            @RequestParam(defaultValue = "newest") String sort,
            @RequestParam(defaultValue = "30") int limit,
            @RequestParam(defaultValue = "true") boolean normalized) {
        return new Result<>(true, StatusCode.OK, "获取模型列表成功",
                modelQueryService.listModels(q, vendor, sort, limit, normalized));
    }

    @GetMapping("/hot/models/compare")
    public Result<ModelCompareVO> compare(@RequestParam List<String> keys,
                                          @RequestParam(defaultValue = "true") boolean normalized) {
        return new Result<>(true, StatusCode.OK, "获取模型对比成功",
                modelQueryService.compare(keys, normalized));
    }

    @GetMapping("/hot/models/{key}")
    public Result<ModelBenchmarkRowVO> model(@PathVariable String key,
                                             @RequestParam(defaultValue = "true") boolean normalized) {
        ModelBenchmarkRowVO row = modelQueryService.getModel(key, normalized);
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
