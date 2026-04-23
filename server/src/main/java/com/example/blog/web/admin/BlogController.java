package com.example.blog.web.admin;

import com.example.blog.constants.PaginationConstants;
import com.example.blog.po.Blog;
import com.example.blog.po.Result;
import com.example.blog.po.StatusCode;
import com.example.blog.po.Tag;
import com.example.blog.service.BlogService;
import com.example.blog.service.TagService;
import com.example.blog.service.TypeService;
import com.example.blog.vo.BlogQuery;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/admin")
public class BlogController {

    private final BlogService blogService;

    private final TypeService typeService;

    private final TagService tagService;

    public BlogController(BlogService blogService, TypeService typeService, TagService tagService) {
        this.blogService = blogService;
        this.typeService = typeService;
        this.tagService = tagService;
    }

    @PostMapping("/getBlogList")
    public Result<Page<Blog>> getBlogList(@RequestBody Map<String, Object> para) {
        int pageNum = (int) para.get("pagenum");
        int pageSize = (int) para.get("pagesize");
        BlogQuery blogQuery = new BlogQuery();
        if (para.get("typeId") != null) {
            blogQuery.setTypeId(Long.valueOf(para.get("typeId").toString()));
        }
        blogQuery.setTitle((String) para.get("title"));
        Sort sort = Sort.by(Sort.Direction.DESC, "createTime");
        Pageable pageable = PageRequest.of(pageNum - 1, pageSize, sort);
        return new Result<>(true, StatusCode.OK, "获取博客列表成功", blogService.listBlog(pageable, blogQuery));
    }

    @PostMapping("/blogs")
    public Result<Void> post(@RequestBody Map<String, Blog> para) {
        Blog blog = para.get("blog");

        // 处理类型
        if (blog.getType() != null && blog.getType().getId() != null) {
            blog.setType(typeService.getType(blog.getType().getId()));
        }

        // 如果是更新操作，需要先获取原始博客
        Blog existingBlog;
        if (blog.getId() != null) {
            existingBlog = blogService.getBlog(blog.getId());
            if (existingBlog == null) {
                return new Result<>(false, StatusCode.ERROR, "博客不存在");
            }

            // 保存原始标签列表，用于后续处理
            List<Tag> originalTags = new ArrayList<>(existingBlog.getTags());

            // 清除原始标签与博客的关联
            for (Tag originalTag : originalTags) {
                originalTag.getBlogs().remove(existingBlog);
                tagService.updateTag(originalTag.getId(), originalTag);
            }
        }

        // 处理标签关系
        List<Tag> tags = new ArrayList<>();
        if (blog.getTags() != null) {
            for (Tag tag : blog.getTags()) {
                // 确保标签是从数据库中获取的托管状态
                Tag managedTag = tagService.getTag(tag.getId());
                if (managedTag != null) {
                    tags.add(managedTag);
                    // 从标签角度建立关联
                    if (!managedTag.getBlogs().contains(blog)) {
                        managedTag.getBlogs().add(blog);
                        tagService.updateTag(managedTag.getId(), managedTag);
                    }
                }
            }
        }

        // 设置处理后的标签列表
        blog.setTags(tags);

        Blog b;
        if (blog.getId() == null) {
            b = blogService.saveBlog(blog);
        } else {
            b = blogService.updateBlog(blog.getId(), blog);
        }

        if (b == null) {
            return new Result<>(false, StatusCode.ERROR, "操作失败");
        }
        return new Result<>(true, StatusCode.OK, "操作成功");
    }

    @PostMapping("/blogs/recommend")
    public Result<Void> recommend(@RequestBody Map<String, Object> para) {
        Object blogIdObj = para.get("blogId");
        if (blogIdObj == null) {
            return new Result<>(false, StatusCode.ERROR, "blogId不能为空");
        }
        if (!(blogIdObj instanceof Number)) {
            return new Result<>(false, StatusCode.ERROR, "blogId必须是数字类型");
        }

        // 正确的转换方式：先获取Number，再调用longValue()方法
        Long blogId = ((Number) blogIdObj).longValue();
        Boolean recommend = (Boolean) para.get("recommend");
        try {
            if (blogService.changeRecommend(blogId, recommend)) {
                return new Result<>(true, StatusCode.OK, "操作成功");
            }
            return new Result<>(false, StatusCode.ERROR, "操作失败");
        } catch (Exception e) {
            return new Result<>(false, StatusCode.ERROR, "操作失败");
        }
    }

    @GetMapping("/search")
    public Result<Page<Blog>> search(
            @PageableDefault(size = PaginationConstants.DEFAULT_PAGE_SIZE, sort = {
                    "createTime" }, direction = Sort.Direction.DESC) Pageable pageable,
            @RequestParam String query) {
        return new Result<>(true, StatusCode.OK, "获取搜索博客成功", blogService.listBlog("%" + query + "%", pageable));
    }

    @DeleteMapping("/blogs/{id}")
    public Result<Void> delete(@PathVariable Long id) {
        blogService.deleteBlog(id);
        return new Result<>(true, StatusCode.OK, "删除博客成功");
    }

    @GetMapping("/dealDeletedTag/{id}")
    public Result<Void> dealDeletedTag(@PathVariable Long id) {
        Tag tag = tagService.getTag(id);
        if (tag.getBlogs().isEmpty()) {
            tagService.deleteTag(id);
        }
        return new Result<>(true, StatusCode.OK, "处理标签成功", null);
    }

}
