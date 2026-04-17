package com.example.blog.web;

import com.example.blog.po.FriendLink;
import com.example.blog.po.Result;
import com.example.blog.po.StatusCode;
import com.example.blog.service.FriendLinkService;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
public class FriendLinkShowController {
    private final FriendLinkService friendLinkService;

    public FriendLinkShowController(FriendLinkService friendLinkService) {
        this.friendLinkService = friendLinkService;
    }

    @GetMapping("/friendLinks")
    public Result<List<FriendLink>> friendLinks() {
        // 前台只返回已发布的友链
        return new Result<>(true, StatusCode.OK, "获取友链列表成功", friendLinkService.listFriendLink());
    }
    
    // 前台申请友链（免登录）
    @PostMapping("/friendLinks/apply")
    public Result<FriendLink> applyFriendLink(@RequestBody FriendLink friendLink) {
        try {
            // 校验必填字段
            if (friendLink.getName() == null || friendLink.getName().trim().isEmpty()) {
                // 如果没有名称但有applyText，尝试解析
                if (friendLink.getApplyText() != null && !friendLink.getApplyText().isEmpty()) {
                    Map<String, String> parsed = friendLinkService.parseApplyText(friendLink.getApplyText());
                    if (parsed.get("name") != null) {
                        friendLink.setName(parsed.get("name"));
                    } else {
                        return new Result<>(false, StatusCode.ERROR, "网站名称不能为空");
                    }
                } else {
                    return new Result<>(false, StatusCode.ERROR, "网站名称不能为空");
                }
            }
            
            if (friendLink.getUrl() == null || friendLink.getUrl().trim().isEmpty()) {
                // 如果没有URL但有applyText，尝试解析
                if (friendLink.getApplyText() != null && !friendLink.getApplyText().isEmpty()) {
                    Map<String, String> parsed = friendLinkService.parseApplyText(friendLink.getApplyText());
                    if (parsed.get("url") != null) {
                        friendLink.setUrl(parsed.get("url"));
                    } else {
                        return new Result<>(false, StatusCode.ERROR, "网站地址不能为空");
                    }
                } else {
                    return new Result<>(false, StatusCode.ERROR, "网站地址不能为空");
                }
            }
            
            FriendLink saved = friendLinkService.applyFriendLink(friendLink);
            return new Result<>(true, StatusCode.OK, "友链申请已提交，等待审核", saved);
        } catch (Exception e) {
            return new Result<>(false, StatusCode.ERROR, "申请失败: " + e.getMessage());
        }
    }
}
