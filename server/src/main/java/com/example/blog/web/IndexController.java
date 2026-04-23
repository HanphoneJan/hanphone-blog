package com.example.blog.web;

import com.example.blog.constants.CommonConstants;
import com.example.blog.constants.PaginationConstants;
import com.example.blog.po.Blog;
import com.example.blog.po.Result;
import com.example.blog.po.StatusCode;
import com.example.blog.po.Tag;
import com.example.blog.po.Type;
import com.example.blog.service.BlogMonthlyVisitsService;
import com.example.blog.service.BlogService;
import com.example.blog.service.EssayService;
import com.example.blog.service.ProjectService;
import com.example.blog.service.TagService;
import com.example.blog.service.TypeService;
import com.example.blog.vo.BlogQuery;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
public class IndexController {

    private final BlogService blogService;
    private final TypeService typeService;
    private final TagService tagService;
    private final BlogMonthlyVisitsService blogMonthlyVisitsService;
    private final EssayService essayService;
    private final ProjectService projectService;

    public IndexController(TagService tagService, TypeService typeService, BlogService blogService,
                           BlogMonthlyVisitsService blogMonthlyVisitsService, EssayService essayService,
                           ProjectService projectService) {
        this.tagService = tagService;
        this.typeService = typeService;
        this.blogService = blogService;
        this.blogMonthlyVisitsService = blogMonthlyVisitsService;
        this.essayService = essayService;
        this.projectService = projectService;
    }

    @GetMapping("/blogs")
    public Result<Page<Blog>> getBlogList(@RequestParam String pagenum, @RequestParam String pagesize) {
        Sort sort = Sort.by(Sort.Direction.DESC, "createTime");
        Pageable pageable = PageRequest.of(Integer.parseInt(pagenum) - 1, Integer.parseInt(pagesize), sort);
        return new Result<>(true, StatusCode.OK, "获取博客列表成功", blogService.listBlog(pageable));
    }

    @GetMapping("/getRecommendBlogList")
    public Result<List<Blog>> getRecommendBlogList() {
        return new Result<>(true, StatusCode.OK, "获取推荐博客成功", blogService.listRecommendBlogTop(PaginationConstants.RECOMMEND_BLOG_SIZE));
    }

    @GetMapping("/search")
    public Result<Page<Blog>> search(@PageableDefault(size = PaginationConstants.DEFAULT_PAGE_SIZE, sort = {"createTime"}, direction = Sort.Direction.DESC) Pageable pageable,
                                     @RequestParam String query) {
        return new Result<>(true, StatusCode.OK, "获取搜索博客成功", blogService.listBlog(query, pageable));
    }

    @GetMapping("/blog/{id}")
    public Result<Blog> blog(@PathVariable Long id, @RequestParam(required = false) Long userId) {
        return new Result<>(true, StatusCode.OK, "获取博客成功", blogService.getAndConvert(userId, id));
    }

    @GetMapping("/blog/{id}/prev")
    public Result<Blog> getPreviousBlog(@PathVariable Long id) {
        Blog blog = blogService.getPreviousBlog(id);
        if (blog == null) {
            return new Result<>(true, StatusCode.OK, "没有上一篇博客", null);
        }
        return new Result<>(true, StatusCode.OK, "获取上一篇博客成功", blog);
    }

    @GetMapping("/blog/{id}/next")
    public Result<Blog> getNextBlog(@PathVariable Long id) {
        Blog blog = blogService.getNextBlog(id);
        if (blog == null) {
            return new Result<>(true, StatusCode.OK, "没有下一篇博客", null);
        }
        return new Result<>(true, StatusCode.OK, "获取下一篇博客成功", blog);
    }

    @GetMapping("/types/{id}")
    public Result<Page<Blog>> types(@PageableDefault(size = PaginationConstants.DEFAULT_PAGE_SIZE, sort = {"updateTime"}, direction = Sort.Direction.DESC) Pageable pageable,
                                    @PathVariable Long id) {
        List<Type> types = typeService.listType();
        if (id == CommonConstants.DEFAULT_PARENT_ID && !types.isEmpty()) {
            id = types.get(0).getId();
        }
        BlogQuery blogQuery = new BlogQuery();
        blogQuery.setTypeId(id);
        blogQuery.setPublished(true);
        return new Result<>(true, StatusCode.OK, "获取分类博客列表成功", blogService.listBlog(pageable, blogQuery));
    }

    @GetMapping("tags/{id}")
    public Result<Page<Blog>> tags(@PageableDefault(size = PaginationConstants.DEFAULT_PAGE_SIZE, sort = {"updateTime"}, direction = Sort.Direction.DESC) Pageable pageable,
                                   @PathVariable Long id) {
        List<Tag> tags = tagService.listTag();
        if (id == CommonConstants.DEFAULT_PARENT_ID && !tags.isEmpty()) {
            id = tags.get(0).getId();
        }
        return new Result<>(true, StatusCode.OK, "获取标签博客列表成功", blogService.listBlog(id, pageable));
    }

    @GetMapping("/visit-count")
    public Result<Long> getVisitCount() {
        // 递增访问量并获取更新后的总访问量
        Long totalVisits = blogMonthlyVisitsService.incrementAndGetTotalVisits();
        return new Result<>(true, StatusCode.OK, "获取网站浏览量成功", totalVisits);
    }

    @GetMapping("/site-stats")
    public Result<Map<String, Long>> getSiteStats() {
        Map<String, Long> stats = new HashMap<>();
        stats.put("blogCount", blogService.countBlog());
        stats.put("essayCount", essayService.count());
        stats.put("projectCount", projectService.count());
        return new Result<>(true, StatusCode.OK, "获取站点统计成功", stats);
    }
}