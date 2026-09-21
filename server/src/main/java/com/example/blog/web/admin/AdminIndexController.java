package com.example.blog.web.admin;

import com.example.blog.po.*;
import com.example.blog.dao.BlogVisitorRepository;
import com.example.blog.service.*;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/admin")
public class AdminIndexController {
    private final BlogService blogService;

    private final TypeService typeService;

    private final TagService tagService;

    private final UserService userService;

    private final CommentService commentService;
    private final BlogMonthlyVisitsService blogMonthlyVisitsService;
    private final BlogVisitorRepository blogVisitorRepository;
    private final com.example.blog.service.VisitorTrackService visitorTrackService;

    public AdminIndexController(BlogService blogService, TypeService typeService, TagService tagService,
            UserService userService, CommentService commentService, BlogMonthlyVisitsService blogMonthlyVisitsService,
            BlogVisitorRepository blogVisitorRepository, com.example.blog.service.VisitorTrackService visitorTrackService) {
        this.blogService = blogService;
        this.typeService = typeService;
        this.tagService = tagService;
        this.userService = userService;
        this.commentService = commentService;
        this.blogMonthlyVisitsService = blogMonthlyVisitsService;
        this.blogVisitorRepository = blogVisitorRepository;
        this.visitorTrackService = visitorTrackService;
    }

    // 获取博客数量
    @GetMapping("/getBlogCount")
    public Result<Long> getBlogList() {
        return new Result<>(true, StatusCode.OK, "获取博客总数成功", blogService.countBlog());
    }

    // 获取总阅读量
    @GetMapping("/getViewCount")
    public Result<Long> getViewCount() {
        return new Result<>(true, StatusCode.OK, "获取阅读总数成功", blogService.countViews());
    }

    // 获取总点赞数
    @GetMapping("/getAppreciateCount")
    public Result<Long> getAppreciateCounts() {
        return new Result<>(true, StatusCode.OK, "获取赞赏总数成功", blogService.countAppreciate());
    }

    // 获取总点赞数
    @GetMapping("/getBlogLikes")
    public Result<Long> getBlogLikesCount() {
        return new Result<>(true, StatusCode.OK, "获取点赞总数成功", blogService.countLikes());
    }

    // 获取总评论数
    @GetMapping("/getCommentCount")
    public Result<Long> getCommentCount() {
        return new Result<>(true, StatusCode.OK, "获取评论总数成功", blogService.countComment());
    }

    // 根据月份统计阅读量
    @GetMapping("/getViewCountByMonth")
    public Result<List<String>> getBlogViewsByMonth() {
        return new Result<>(true, StatusCode.OK, "获取按月份统计阅读总数成功", blogService.ViewCountByMonth());
    }

    // 根据月份统计博客发表数
    @GetMapping("/getBlogCountByMonth")
    public Result<List<String>> getBlogCountByMonth() {
        return new Result<>(true, StatusCode.OK, "获取按月份统计发表总数成功", blogService.BlogCountByMonth());
    }

    // 根据月份统计评论数
    @GetMapping("/getCommentCountByMonth")
    public Result<List<String>> getCommentCountByMonth() {
        return new Result<>(true, StatusCode.OK, "获取按月份统计评论总数成功", commentService.CommentCountByMonth());
    }

    @GetMapping("/getAppreciateCountByMonth")
    public Result<List<String>> getAppreciateCountByMonth() {
        return new Result<>(true, StatusCode.OK, "获取按月份统计赞赏总数成功", blogService.appreciateCountByMonth());
    }

    @GetMapping("/getLikesByMonth")
    public Result<List<String>> getLikesCountByMonth() {
        return new Result<>(true, StatusCode.OK, "获取按月份统计点赞总数成功", blogService.likesCountByMonth());
    }

    @GetMapping("/getFullTagList")
    public Result<List<Tag>> getFullTagList() {
        return new Result<>(true, StatusCode.OK, "获取所有博客标签成功", tagService.listTag());
    }

    @GetMapping("/getFullTypeList")
    public Result<List<Type>> getFullTypeList() {
        return new Result<>(true, StatusCode.OK, "获取博客全部分类成功", typeService.listType());
    }

    @GetMapping("/getCommentList")
    public Result<?> getCommentList(
            @RequestParam(required = false) Integer page,
            @RequestParam(required = false) Integer pageSize) {
        if (page != null && pageSize != null) {
            Pageable pageable = PageRequest.of(page - 1, pageSize, Sort.by(Sort.Direction.DESC, "createTime"));
            return new Result<>(true, StatusCode.OK, "获取评论列表成功", commentService.listComment(pageable));
        }
        return new Result<>(true, StatusCode.OK, "获取评论列表成功", commentService.listComment());
    }

    @GetMapping("/getUserAreaList")
    public Result<List<User>> getUserAreaList() {
        List<User> users = userService.listUser();
        users.forEach(u -> u.setPassword(null)); // 不返回密码
        return new Result<>(true, StatusCode.OK, "获取用户地址列表成功", users);
    }

    @GetMapping("/getVisitCountByMonth")
    public Result<List<String>> getMonthlyStats(@RequestParam(required = false) String year) {
        List<String> formattedData = blogMonthlyVisitsService.getFormattedMonthlyStats(year);
        return new Result<>(true, StatusCode.OK, "获取按月份统计网站浏览量", formattedData);
    }

    // 区域聚合（按国家），供世界地图展示
    @GetMapping("/visitor/area-list")
    public Result<List<Map<String, Object>>> getVisitorAreaList() {
        List<Object[]> rows = blogVisitorRepository.aggregateByCountry();
        List<Map<String, Object>> list = new java.util.ArrayList<>();
        for (Object[] row : rows) {
            Map<String, Object> m = new java.util.HashMap<>();
            m.put("name", row[0]);
            m.put("visitorCount", ((Number) row[1]).longValue());
            m.put("totalVisits", ((Number) row[2]).longValue());
            list.add(m);
        }
        return new Result<>(true, StatusCode.OK, "获取访客区域分布成功", list);
    }

    // 概览：UV / PV / 未知占比
    @GetMapping("/visitor/overview")
    public Result<Map<String, Object>> getVisitorOverview() {
        long uv = blogVisitorRepository.countAll();
        long pv = blogVisitorRepository.sumVisitCount();
        long unknown = blogVisitorRepository.countUnknownRegion();
        Map<String, Object> m = new java.util.HashMap<>();
        m.put("uv", uv);
        m.put("pv", pv);
        m.put("unknownRegion", unknown);
        m.put("unknownRegionPercent", uv == 0 ? 0.0 : Math.round(unknown * 1000.0 / uv) / 10.0);
        return new Result<>(true, StatusCode.OK, "获取访客概览成功", m);
    }

    // 单 IP 明细分页
    @GetMapping("/visitor/ip-list")
    public Result<?> getVisitorIpList(
            @RequestParam(required = false) Integer page,
            @RequestParam(required = false) Integer pageSize) {
        org.springframework.data.domain.Sort sort = org.springframework.data.domain.Sort
                .by(org.springframework.data.domain.Sort.Direction.DESC, "lastVisitTime");
        if (page != null && pageSize != null) {
            org.springframework.data.domain.Pageable pageable = org.springframework.data.domain.PageRequest
                    .of(page - 1, pageSize, sort);
            return new Result<>(true, StatusCode.OK, "获取访客 IP 列表成功",
                    blogVisitorRepository.findAll(pageable));
        }
        return new Result<>(true, StatusCode.OK, "获取访客 IP 列表成功", blogVisitorRepository.findAll(sort));
    }

    // 手动清理：支持按天数清理（如 ?days=30）或全量（不带参数）
    @PostMapping("/visitor/clear")
    public Result<Void> clearVisitor(@RequestParam(required = false) Integer days) {
        if (days != null && days > 0) {
            blogVisitorRepository.deleteBefore(java.time.ZonedDateTime.now().minusDays(days));
        } else {
            blogVisitorRepository.deleteAllVisitors();
        }
        // 丢弃未落库的缓冲，避免清理后又被定时任务写回（必须丢弃而非 flush）
        visitorTrackService.discardBuffer();
        return new Result<>(true, StatusCode.OK, "访客数据已清理", null);
    }
}
