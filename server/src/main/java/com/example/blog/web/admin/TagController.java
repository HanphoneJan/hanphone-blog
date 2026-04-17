package com.example.blog.web.admin;

import com.example.blog.DTO.TagBlogCountDTO;
import com.example.blog.po.Result;
import com.example.blog.po.StatusCode;
import com.example.blog.po.Tag;
import com.example.blog.service.TagService;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/admin")
public class TagController {

    private final TagService tagService;

    public TagController(TagService tagService) {
        this.tagService = tagService;
    }

    //    添加或修改标签
    @PostMapping("/tags")
    public Result<Tag> post(@RequestBody Map<String, Tag> para) {
        Tag tag = para.get("tag");
        if (tag == null) {
            return new Result<>(false, StatusCode.ERROR, "标签信息不能为空", null);
        }

        // 新增标签（id为null）
        if (tag.getId() == null) {
            // 检查是否已有同名标签
            Tag existingTag = tagService.getTagByName(tag.getName());
            if (existingTag != null) {
                return new Result<>(false, StatusCode.ERROR, "标签名称已存在", null);
            }
        }
        // 修改标签（id不为null）
        else {
            // 检查除自身外是否有同名标签
            List<Tag> tagList = tagService.listByNameExceptSelf(tag.getId(), tag.getName());
            if (!tagList.isEmpty()) {
                return new Result<>(false, StatusCode.ERROR, "标签名称已存在", null);
            }
        }

        // 保存或更新标签
        Tag savedTag = tagService.saveTag(tag);
        if (savedTag == null) {
            return new Result<>(false, StatusCode.ERROR, "操作失败", null);
        }
        return new Result<>(true, StatusCode.OK, "操作成功", savedTag);
    }


    @DeleteMapping("/tags/{id}")
    public Result<Void> delete(@PathVariable Long id) {
        tagService.deleteTag(id);
        return new Result<>(true, StatusCode.OK, "删除成功");
    }

    @GetMapping("/getFullTagListAndBlogNumber")
    public Result<List<TagBlogCountDTO>> getFullTagListAndBlogNumber() {
        return new Result<>(true, StatusCode.OK, "获取所有博客标签成功", tagService.listTagAndBlogNumber());
    }
}
