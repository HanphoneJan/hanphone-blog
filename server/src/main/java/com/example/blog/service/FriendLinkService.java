package com.example.blog.service;

import com.example.blog.po.FriendLink;

import java.util.List;

public interface FriendLinkService {
    List<FriendLink> listFriendLink();

    void deleteFriendLink(Long id);

    FriendLink saveFriendLink(FriendLink FriendLink);

    FriendLink updateFriendLink(Long id,FriendLink FriendLink);
    Boolean changeRecommend(Long friendLinkId, Boolean recommend);
}
