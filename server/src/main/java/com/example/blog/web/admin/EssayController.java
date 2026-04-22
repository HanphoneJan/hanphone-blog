package com.example.blog.web.admin;

import com.example.blog.po.*;
import com.example.blog.service.EssayService;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/admin")
public class EssayController {
    private final EssayService essayService;

    public EssayController(EssayService essayService) {
        this.essayService = essayService;
    }

    @DeleteMapping("/essay/{id}")
    public Result<Void> delete(@PathVariable Long id) {
        essayService.deleteEssay(id);
        return new Result<>(true, StatusCode.OK, "删除随笔成功", null);
    }

    // 新增或者修改
    @PostMapping("/essay")
    public Result<Essay> post(@RequestBody Map<String, Object> para) {
        // 从请求参数中获取essay对象的JSON
        Object essayObj = para.get("essay");
        if (!(essayObj instanceof Map)) {
            return new Result<>(false, StatusCode.ERROR, "请求参数格式错误");
        }

        @SuppressWarnings("unchecked")
        Map<String, Object> essayMap = (Map<String, Object>) essayObj;

        // 转换为Essay对象
        Essay essay = new Essay();
        essay.setTitle((String) essayMap.get("title"));
        essay.setContent((String) essayMap.get("content"));

        // 获取并设置User关联 - 关键修改部分
        if (essayMap.containsKey("user_id")) {
            try {
                // 创建User对象并只设置ID
                User user = new User();
                user.setId(Long.parseLong(essayMap.get("user_id").toString()));

                // 将User对象关联到Essay
                essay.setUser(user);
            } catch (NumberFormatException e) {
                return new Result<>(false, StatusCode.ERROR, "用户ID格式错误");
            }
        } else {
            return new Result<>(false, StatusCode.ERROR, "缺少用户ID");
        }

        // 处理ID（如果存在）
        if (essayMap.get("id") != null) {
            try {
                essay.setId(Long.parseLong(essayMap.get("id").toString()));
            } catch (NumberFormatException e) {
                return new Result<>(false, StatusCode.ERROR, "ID格式错误");
            }
        }

        // 处理文件URL列表
        List<EssayFileUrl> fileUrls = new ArrayList<>();
        if (essayMap.containsKey("essayFileUrls")) {
            Object fileUrlsObj = essayMap.get("essayFileUrls");
            if (fileUrlsObj instanceof List) {
                @SuppressWarnings("unchecked")
                List<Map<String, Object>> essayFileUrls = (List<Map<String, Object>>) fileUrlsObj;

                for (Map<String, Object> fileUrlMap : essayFileUrls) {
                    String url = (String) fileUrlMap.get("url");
                    String urlType = (String) fileUrlMap.get("urlType");

                    if (url != null && urlType != null) {
                        EssayFileUrl fileUrl = new EssayFileUrl();
                        fileUrl.setUrl(url);
                        fileUrl.setUrlType(urlType);
                        fileUrl.setEssay(essay);
                        fileUrls.add(fileUrl);
                    }
                }
            }
        }

        // 设置文件URL列表到essay对象
        essay.setEssayFileUrls(fileUrls);
        essay.setLikes(0);

        // 保存或更新文章
        Essay e;
        if (essay.getId() == null) {
            e = essayService.saveEssay(essay);
        } else {
            e = essayService.updateEssay(essay.getId(), essay);
        }

        if (e == null) {
            return new Result<>(false, StatusCode.ERROR, "操作失败");
        }
        return new Result<>(true, StatusCode.OK, "操作成功", e);
    }

    @GetMapping("/essays")
    public Result<?> essays(
            @RequestParam(required = false) Long userId,
            @RequestParam(required = false) Integer page,
            @RequestParam(required = false) Integer pageSize) {
        if (page != null && pageSize != null) {
            Sort sort = Sort.by(Sort.Direction.DESC, "createTime");
            Pageable pageable = PageRequest.of(page - 1, pageSize, sort);
            return new Result<>(true, StatusCode.OK, "获取随笔列表成功", essayService.listEssay(userId, pageable));
        }
        return new Result<>(true, StatusCode.OK, "获取随笔列表成功", essayService.listEssay(userId));
    }

    @PostMapping("/essays/recommend")
    public Result<Void> recommend(@RequestBody Map<String, Object> para) {
        Object essayIdObj = para.get("essayId");
        if (essayIdObj == null) {
            return new Result<>(false, StatusCode.ERROR, "essayId不能为空");
        }
        if (!(essayIdObj instanceof Number)) {
            return new Result<>(false, StatusCode.ERROR, "essayId必须是数字类型");
        }
        // 正确的转换方式：先获取Number，再调用longValue()方法
        Long essayId = ((Number) essayIdObj).longValue();
        Boolean recommend = (Boolean) para.get("recommend");
        try {
            if (essayService.changeRecommend(essayId, recommend)) {
                return new Result<>(true, StatusCode.OK, "操作成功");
            }
            return new Result<>(false, StatusCode.ERROR, "操作失败");
        } catch (Exception e) {
            return new Result<>(false, StatusCode.ERROR, "操作失败");
        }
    }

    @PostMapping("/essays/published")
    public Result<Void> published(@RequestBody Map<String, Object> para) {
        Object essayIdObj = para.get("essayId");
        if (essayIdObj == null) {
            return new Result<>(false, StatusCode.ERROR, "essayId不能为空");
        }
        if (!(essayIdObj instanceof Number)) {
            return new Result<>(false, StatusCode.ERROR, "essayId必须是数字类型");
        }
        Long essayId = ((Number) essayIdObj).longValue();
        Boolean published = (Boolean) para.get("published");
        try {
            if (essayService.changePublished(essayId, published)) {
                return new Result<>(true, StatusCode.OK, "操作成功");
            }
            return new Result<>(false, StatusCode.ERROR, "操作失败");
        } catch (Exception e) {
            return new Result<>(false, StatusCode.ERROR, "操作失败");
        }
    }
}