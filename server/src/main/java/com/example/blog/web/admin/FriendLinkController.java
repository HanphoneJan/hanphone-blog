package com.example.blog.web.admin;

import com.example.blog.po.FriendLink;
import com.example.blog.po.Result;
import com.example.blog.po.StatusCode;
import com.example.blog.service.FriendLinkService;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/admin")
public class FriendLinkController {
    final
    FriendLinkService friendLinkService;

    public FriendLinkController(FriendLinkService friendLinkService) {
        this.friendLinkService = friendLinkService;
    }

    @DeleteMapping("/friendLink/{id}")
    public Result<Void> delete(@PathVariable Long id) {
        friendLinkService.deleteFriendLink(id);
        return new Result<>(true, StatusCode.OK, "删除项目成功");
    }

    @GetMapping("/friendLinks")
    public Result<List<FriendLink>> friendLinks() {
        return new Result<>(true, StatusCode.OK, "获取项目列表成功", friendLinkService.listFriendLink());
    }

    @PostMapping("/friendLink")
    public Result<Void> post(@RequestBody Map<String, FriendLink> para){
        FriendLink friendLink = para.get("friendLink");
        FriendLink p;
        if (friendLink.getId() == null){
            p = friendLinkService.saveFriendLink(friendLink);
        } else {
            p = friendLinkService.updateFriendLink(friendLink.getId(),friendLink);
        }
        if (p == null) {
            return new Result<>(false,StatusCode.ERROR,"操作失败");
        }
        return new Result<>(true,StatusCode.OK,"操作成功");
    }

    @PostMapping("/friendLinks/recommend")
    public Result<Void> recommend(@RequestBody Map<String, Object> para) {
        Object friendLinkIdObj = para.get("friendLinkId");
        if (friendLinkIdObj == null) {
            return new Result<>(false, StatusCode.ERROR, "friendLinkId不能为空");
        }
        if (!(friendLinkIdObj instanceof Number)) {
            return new Result<>(false, StatusCode.ERROR, "friendLinkId必须是数字类型");
        }
        // 正确的转换方式：先获取Number，再调用longValue()方法
        Long friendLinkId = ((Number) friendLinkIdObj).longValue();
        Boolean recommend = (Boolean) para.get("recommend");
        try{
            if(friendLinkService.changeRecommend(friendLinkId, recommend)){
                return new Result<>(true, StatusCode.OK, "操作成功");
            }
            return new Result<>(false, StatusCode.ERROR, "操作失败");
        } catch (Exception e) {
            return new Result<>(false, StatusCode.ERROR, "操作失败");
        }
    }

}
