package com.example.blog.web.admin;

import com.example.blog.dao.HotCollectRunRepository;
import com.example.blog.hot.HotTriggerService;
import com.example.blog.hot.model.ModelNormalizationRebuildService;
import com.example.blog.hot.summary.HotSummaryConfigService;
import com.example.blog.hot.summary.HotSummaryService;
import com.example.blog.po.HotCollectRun;
import com.example.blog.po.Result;
import com.example.blog.po.StatusCode;
import com.example.blog.service.HotRadarService;
import com.example.blog.vo.HotSourceStatusVO;
import com.example.blog.vo.SummarySettingsVO;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.Date;
import java.util.LinkedHashMap;
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
    private final ModelNormalizationRebuildService normalizationRebuildService;

    public HotAdminController(HotTriggerService triggerService,
                              HotRadarService radarService,
                              HotCollectRunRepository runRepository,
                              HotSummaryConfigService summaryConfig,
                              HotSummaryService summaryService,
                              ModelNormalizationRebuildService normalizationRebuildService) {
        this.triggerService = triggerService;
        this.radarService = radarService;
        this.runRepository = runRepository;
        this.summaryConfig = summaryConfig;
        this.summaryService = summaryService;
        this.normalizationRebuildService = normalizationRebuildService;
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

    /** 采集记录分页 + 筛选 + 排序。 */
    @GetMapping("/runs/page")
    public Result<Map<String, Object>> runsPage(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(required = false) String triggerType,
            @RequestParam(required = false) String result,
            @RequestParam(required = false) String q,
            @RequestParam(required = false) String from,
            @RequestParam(required = false) String to,
            @RequestParam(defaultValue = "newest") String order) {

        int safeSize = Math.min(Math.max(size, 1), 100);
        int safePage = Math.max(page, 0);
        Sort sort = "oldest".equalsIgnoreCase(order)
                ? Sort.by(Sort.Direction.ASC, "startedAt").and(Sort.by(Sort.Direction.ASC, "id"))
                : Sort.by(Sort.Direction.DESC, "startedAt").and(Sort.by(Sort.Direction.DESC, "id"));

        Date fromBoundary = parseBoundary(from, false);
        Date toBoundary = parseBoundary(to, true);

        Specification<HotCollectRun> spec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            if (triggerType != null && !triggerType.isBlank() && !"ALL".equalsIgnoreCase(triggerType)) {
                predicates.add(cb.equal(root.get("triggerType"), triggerType.trim().toUpperCase()));
            }
            if ("success".equalsIgnoreCase(result)) {
                predicates.add(cb.equal(root.get("failedCount"), 0));
            } else if ("partial".equalsIgnoreCase(result)) {
                predicates.add(cb.and(
                        cb.greaterThan(root.get("failedCount"), 0),
                        cb.greaterThan(root.get("successCount"), 0)));
            } else if ("failed".equalsIgnoreCase(result)) {
                predicates.add(cb.and(
                        cb.greaterThan(root.get("failedCount"), 0),
                        cb.equal(root.get("successCount"), 0)));
            }
            if (q != null && !q.isBlank()) {
                predicates.add(cb.like(cb.lower(root.get("detail")), "%" + q.trim().toLowerCase() + "%"));
            }
            if (fromBoundary != null) {
                predicates.add(cb.greaterThanOrEqualTo(root.get("startedAt"), fromBoundary));
            }
            if (toBoundary != null) {
                predicates.add(cb.lessThan(root.get("startedAt"), toBoundary));
            }
            return predicates.isEmpty() ? cb.conjunction() : cb.and(predicates.toArray(new Predicate[0]));
        };

        Page<HotCollectRun> resultPage = runRepository.findAll(spec, PageRequest.of(safePage, safeSize, sort));
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("content", resultPage.getContent());
        data.put("page", resultPage.getNumber());
        data.put("size", resultPage.getSize());
        data.put("totalElements", resultPage.getTotalElements());
        data.put("totalPages", resultPage.getTotalPages());
        return new Result<>(true, StatusCode.OK, "获取采集记录成功", data);
    }

    /** 按当前归一规则重建 model_entity.canonical_key 并合并历史重复实体；dryRun=true 仅预演。 */
    @PostMapping("/models/rebuild-normalization")
    public Result<Map<String, Object>> rebuildNormalization(
            @RequestParam(defaultValue = "false") boolean dryRun) {
        Map<String, Object> summary = normalizationRebuildService.rebuild(dryRun);
        return new Result<>(true, StatusCode.OK, dryRun ? "预演完成" : "模型归一重建完成", summary);
    }

    /** 解析筛选时间：支持 epoch 毫秒或 yyyy-MM-dd（endExclusive 时取次日 0 点，作右开区间）。 */
    private Date parseBoundary(String value, boolean endExclusive) {
        if (value == null || value.isBlank()) {
            return null;
        }
        String v = value.trim();
        try {
            if (v.matches("\\d+")) {
                return new Date(Long.parseLong(v));
            }
            LocalDate date = LocalDate.parse(v.length() >= 10 ? v.substring(0, 10) : v);
            LocalDate target = endExclusive ? date.plusDays(1) : date;
            return Date.from(target.atStartOfDay(ZoneId.systemDefault()).toInstant());
        } catch (Exception e) {
            return null;
        }
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
