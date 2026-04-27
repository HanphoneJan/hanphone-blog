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
        return new Result<>(true, StatusCode.OK, "删除友链成功");
    }

    @GetMapping("/friendLinks")
    public Result<List<FriendLink>> friendLinks() {
        // 后台返回所有友链（包括未审核的）
        return new Result<>(true, StatusCode.OK, "获取友链列表成功", friendLinkService.listAllFriendLinks());
    }
    
    // 根据发布状态筛选
    @GetMapping("/friendLinks/byPublished")
    public Result<List<FriendLink>> friendLinksByPublished(@RequestParam Boolean published) {
        return new Result<>(true, StatusCode.OK, "获取友链列表成功", friendLinkService.listByPublished(published));
    }

    @PostMapping("/friendLink")
    public Result<Void> post(@RequestBody Map<String, FriendLink> para){
        FriendLink friendLink = para.get("friendLink");
        FriendLink p;
        if (friendLink.getId() == null){
            p = friendLinkService.saveFriendLink(friendLink);
        } else {
            p = friendLinkService.updateFriendLink(friendLink.getId(), friendLink);
        }
        if (p == null) {
            return new Result<>(false, StatusCode.ERROR, "操作失败");
        }
        return new Result<>(true, StatusCode.OK, "操作成功");
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
        Long friendLinkId = ((Number) friendLinkIdObj).longValue();
        Boolean recommend = (Boolean) para.get("recommend");
        try {
            if(friendLinkService.changeRecommend(friendLinkId, recommend)){
                return new Result<>(true, StatusCode.OK, "操作成功");
            }
            return new Result<>(false, StatusCode.ERROR, "操作失败");
        } catch (Exception e) {
            return new Result<>(false, StatusCode.ERROR, "操作失败");
        }
    }
    
    // 修改发布状态（审核）
    @PostMapping("/friendLinks/published")
    public Result<Void> published(@RequestBody Map<String, Object> para) {
        Object friendLinkIdObj = para.get("friendLinkId");
        if (friendLinkIdObj == null) {
            return new Result<>(false, StatusCode.ERROR, "friendLinkId不能为空");
        }
        if (!(friendLinkIdObj instanceof Number)) {
            return new Result<>(false, StatusCode.ERROR, "friendLinkId必须是数字类型");
        }
        Long friendLinkId = ((Number) friendLinkIdObj).longValue();
        Boolean published = (Boolean) para.get("published");
        try {
            if(friendLinkService.changePublished(friendLinkId, published)){
                return new Result<>(true, StatusCode.OK, "操作成功");
            }
            return new Result<>(false, StatusCode.ERROR, "操作失败");
        } catch (Exception e) {
            return new Result<>(false, StatusCode.ERROR, "操作失败");
        }
    }
    
    // 解析applyText
    @PostMapping("/friendLinks/parse")
    public Result<Map<String, String>> parseApplyText(@RequestBody Map<String, String> para) {
        String applyText = para.get("applyText");
        if (applyText == null || applyText.isEmpty()) {
            return new Result<>(false, StatusCode.ERROR, "applyText不能为空");
        }
        try {
            Map<String, String> result = friendLinkService.parseApplyText(applyText);
            return new Result<>(true, StatusCode.OK, "解析成功", result);
        } catch (Exception e) {
            return new Result<>(false, StatusCode.ERROR, "解析失败: " + e.getMessage());
        }
    }
}
