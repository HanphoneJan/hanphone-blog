package com.example.blog.web.admin;

import com.example.blog.po.*;
import com.example.blog.service.*;
import com.example.blog.po.*;
import com.example.blog.service.*;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/admin")
public class AdminIndexController {
    private final BlogService blogService;

    private final TypeService typeService;

    private final TagService tagService;

    private final UserService userService;

    private final CommentService commentService;
    private final BlogMonthlyVisitsService blogMonthlyVisitsService;

    public AdminIndexController(BlogService blogService, TypeService typeService, TagService tagService,
            UserService userService, CommentService commentService, BlogMonthlyVisitsService blogMonthlyVisitsService) {
        this.blogService = blogService;
        this.typeService = typeService;
        this.tagService = tagService;
        this.userService = userService;
        this.commentService = commentService;
        this.blogMonthlyVisitsService = blogMonthlyVisitsService;
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
    public Result<List<Comment>> getCommentList() {
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
}
