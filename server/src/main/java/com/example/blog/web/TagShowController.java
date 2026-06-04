package com.example.blog.web;

import com.example.blog.po.Result;
import com.example.blog.po.StatusCode;
import com.example.blog.po.Tag; // 导入标签实体类
import com.example.blog.service.TagService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;
import java.util.List;

@RestController
public class TagShowController {
    private final TagService tagService;

    public TagShowController(TagService tagService) {
        this.tagService = tagService;
    }

    // 明确指定泛型为 List<Tag>（根据实际返回的集合类型调整）
    @GetMapping("/getTagList")
    public Result<List<Tag>> getTagList() {
        return new Result<>(true, StatusCode.OK, "获取博客标签成功", tagService.listTagTop(10));
    }

    // 明确指定泛型为 List<Tag>
    @GetMapping("/getFullTagList")
    public Result<List<Tag>> getFullTagList() {
        return new Result<>(true, StatusCode.OK, "获取所有博客标签成功", tagService.listTag());
    }

}