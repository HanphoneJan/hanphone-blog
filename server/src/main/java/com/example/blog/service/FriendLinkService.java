package com.example.blog.service;

import com.example.blog.po.FriendLink;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;
import java.util.Map;

public interface FriendLinkService {
    // 前台：只获取已发布的友链
    List<FriendLink> listFriendLink();

    Page<FriendLink> listFriendLink(Pageable pageable);

    // 后台：获取所有友链（包括未审核的）
    List<FriendLink> listAllFriendLinks();

    // 根据发布状态筛选
    List<FriendLink> listByPublished(Boolean published);

    void deleteFriendLink(Long id);

    FriendLink saveFriendLink(FriendLink friendLink);

    FriendLink updateFriendLink(Long id, FriendLink friendLink);
    
    Boolean changeRecommend(Long friendLinkId, Boolean recommend);
    
    // 修改发布状态（审核）
    Boolean changePublished(Long friendLinkId, Boolean published);
    
    // 前台申请友链（无需登录）
    FriendLink applyFriendLink(FriendLink friendLink);
    
    // 解析applyText文本，返回解析后的字段Map
    Map<String, String> parseApplyText(String applyText);
}
