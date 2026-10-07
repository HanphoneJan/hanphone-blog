package com.example.blog.web.admin;

import com.example.blog.dao.HotCollectRunRepository;
import com.example.blog.hot.HotTriggerService;
import com.example.blog.hot.summary.HotSummaryConfigService;
import com.example.blog.hot.summary.HotSummaryService;
import com.example.blog.po.HotCollectRun;
import com.example.blog.po.Result;
import com.example.blog.po.StatusCode;
import com.example.blog.service.HotRadarService;
import com.example.blog.vo.HotSourceStatusVO;
import com.example.blog.vo.SummarySettingsVO;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

/**
 * 聚合数据管理接口：异步触发采集、查看信源健康与采集记录、配置 AI 摘要。
 * 受 {@code /admin/**} TokenInterceptor 保护。
 */
@RestController
@RequestMapping("/admin/hot")
public class HotAdminController {

    private final HotTriggerService triggerService;
    private final HotRadarService radarService;
    private final HotCollectRunRepository runRepository;
    private final HotSummaryConfigService summaryConfig;
    private final HotSummaryService summaryService;

    public HotAdminController(HotTriggerService triggerService,
                              HotRadarService radarService,
                              HotCollectRunRepository runRepository,
                              HotSummaryConfigService summaryConfig,
                              HotSummaryService summaryService) {
        this.triggerService = triggerService;
        this.radarService = radarService;
        this.runRepository = runRepository;
        this.summaryConfig = summaryConfig;
        this.summaryService = summaryService;
    }

    /** 异步触发「热点 + 模型榜单」采集，立即返回；耗时任务在后台执行 */
    @PostMapping("/collect")
    public Result<Map<String, Object>> collect() {
        boolean started = triggerService.trigger();
        return new Result<>(true, StatusCode.OK, started ? "采集已开始" : "采集正在进行中",
                Map.of("started", started, "running", triggerService.isRunning()));
    }

    @PostMapping("/collect-models")
    public Result<Map<String, Object>> collectModels() {
        boolean started = triggerService.trigger();
        return new Result<>(true, StatusCode.OK, started ? "采集已开始" : "采集正在进行中",
                Map.of("started", started, "running", triggerService.isRunning()));
    }

    @GetMapping("/status")
    public Result<Map<String, Object>> status() {
        return new Result<>(true, StatusCode.OK, "获取采集状态成功",
                Map.of("running", triggerService.isRunning()));
    }

    @GetMapping("/sources")
    public Result<List<HotSourceStatusVO>> sources() {
        return new Result<>(true, StatusCode.OK, "获取信源状态成功", radarService.getSources());
    }

    @GetMapping("/runs")
    public Result<List<HotCollectRun>> runs() {
        return new Result<>(true, StatusCode.OK, "获取采集记录成功",
                runRepository.findTop10ByOrderByStartedAtDesc());
    }

    // ==================== AI 摘要配置 ====================

    @GetMapping("/settings/summary")
    public Result<SummarySettingsVO> summarySettings() {
        return new Result<>(true, StatusCode.OK, "获取摘要配置成功", buildSummaryVO());
    }

    @PutMapping("/settings/summary")
    public Result<SummarySettingsVO> saveSummarySettings(@RequestBody Map<String, String> body) {
        summaryConfig.save(body.get("baseUrl"), body.get("apiKey"), body.get("model"), body.get("headers"));
        return new Result<>(true, StatusCode.OK, "保存摘要配置成功", buildSummaryVO());
    }

    @PostMapping("/settings/summary/test")
    public Result<String> testSummary() {
        if (!summaryService.isEnabled()) {
            return new Result<>(false, StatusCode.ERROR, "摘要未启用：请配置 URL / Model，以及 API Key 或自定义 Header", null);
        }
        String sample = summaryService.summarize("Test",
                "This is a test article about large language models and AI agents.");
        if (sample == null) {
            return new Result<>(false, StatusCode.ERROR, "调用失败：请检查 URL / Key / Header / Model 是否正确", null);
        }
        return new Result<>(true, StatusCode.OK, "测试成功", sample);
    }

    private SummarySettingsVO buildSummaryVO() {
        SummarySettingsVO vo = new SummarySettingsVO();
        vo.setBaseUrl(summaryConfig.baseUrl());
        vo.setModel(summaryConfig.model());
        vo.setHeaders(summaryConfig.headersText());
        vo.setEnabled(summaryConfig.isEnabled());
        vo.setHasApiKey(summaryConfig.hasApiKey());
        return vo;
    }
}
