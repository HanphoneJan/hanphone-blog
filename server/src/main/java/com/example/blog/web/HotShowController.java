package com.example.blog.web;

import com.example.blog.po.Result;
import com.example.blog.po.StatusCode;
import com.example.blog.service.HotRadarService;
import com.example.blog.vo.HotFeedItemVO;
import com.example.blog.vo.HotOverviewVO;
import com.example.blog.vo.HotSourceStatusVO;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * 洞察（Insight）公开只读接口。
 */
@RestController
public class HotShowController {

    private final HotRadarService radarService;

    public HotShowController(HotRadarService radarService) {
        this.radarService = radarService;
    }

    @GetMapping("/hot/overview")
    public Result<HotOverviewVO> overview() {
        return new Result<>(true, StatusCode.OK, "获取洞察总览成功", radarService.getOverview());
    }

    @GetMapping("/hot/feed")
    public Result<List<HotFeedItemVO>> feed(@RequestParam(required = false) String category,
                                            @RequestParam(defaultValue = "40") int limit) {
        return new Result<>(true, StatusCode.OK, "获取洞察热点流成功", radarService.getFeed(category, limit));
    }

    @GetMapping("/hot/sources")
    public Result<List<HotSourceStatusVO>> sources() {
        return new Result<>(true, StatusCode.OK, "获取洞察信源状态成功", radarService.getSources());
    }
}
