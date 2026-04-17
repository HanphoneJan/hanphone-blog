package com.example.blog.web;

import com.example.blog.po.FriendLink;
import com.example.blog.po.Result;
import com.example.blog.po.StatusCode;
import com.example.blog.service.FriendLinkService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
public class FriendLinkShowController {
    private final FriendLinkService friendLinkService;

    public FriendLinkShowController(FriendLinkService friendLinkService) {
        this.friendLinkService = friendLinkService;
    }

    @GetMapping("/friendLinks")
    public Result<List<FriendLink>> friendLinks() {  // 明确指定泛型类型为 List<FriendLink>
        return new Result<>(true, StatusCode.OK, "获取友链列表成功", friendLinkService.listFriendLink());
    }
}
