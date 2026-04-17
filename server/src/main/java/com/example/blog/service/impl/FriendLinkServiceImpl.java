package com.example.blog.service.impl;

import com.example.blog.dao.FriendLinkRepository;
import com.example.blog.po.FriendLink;
import com.example.blog.service.FriendLinkService;
import com.example.blog.util.MyBeanUtils;
import org.springframework.beans.BeanUtils;
import org.springframework.stereotype.Service;

import javax.transaction.Transactional;
import java.util.List;
import java.util.Objects;

import static java.util.Objects.requireNonNull;

@Service
public class FriendLinkServiceImpl implements FriendLinkService {

    private final FriendLinkRepository friendLinkRepository;

    // 构造函数注入时校验依赖非空
    public FriendLinkServiceImpl(FriendLinkRepository friendLinkRepository) {
        this.friendLinkRepository = Objects.requireNonNull(friendLinkRepository, "friendLinkRepository must not be null");
    }

    @Override
    public List<FriendLink> listFriendLink() {
        try {
            return friendLinkRepository.findAll();
        } catch (Exception e) {
            throw new RuntimeException("Failed to get friend link list", e);
        }
    }

    @Override
    public void deleteFriendLink(Long id) {
        // 校验入参非空
        Objects.requireNonNull(id, "friend link id must not be null");
        try {
            friendLinkRepository.deleteById(id);
        } catch (Exception e) {
            throw new RuntimeException("Failed to delete friend link with id: " + id, e);
        }
    }

    @Override
    public FriendLink saveFriendLink(FriendLink friendLink) {
        // 校验入参非空
        Objects.requireNonNull(friendLink, "friendLink must not be null");
        try {
            return friendLinkRepository.save(friendLink);
        } catch (Exception e) {
            throw new RuntimeException("Failed to save friend link", e);
        }
    }

    @Override
    public FriendLink updateFriendLink(Long id, FriendLink friendLink) {
        // 校验入参非空
        Objects.requireNonNull(id, "friend link id must not be null");
        Objects.requireNonNull(friendLink, "friendLink must not be null");
        try {
            FriendLink p = friendLinkRepository.getOne(id);
            // 校验查询结果非空
            Objects.requireNonNull(p, "friend link with id: " + id + " not found");

            BeanUtils.copyProperties(friendLink, p, MyBeanUtils.getNullPropertyNames(friendLink));
            return friendLinkRepository.save(p);
        } catch (Exception e) {
            throw new RuntimeException("Failed to update friend link with id: " + id, e);
        }
    }

    @Override
    @Transactional
    public Boolean changeRecommend(Long Id, Boolean recommend) {
        requireNonNull(Id, "friendLink id must not be null");
        requireNonNull(recommend, "recommend flag must not be null");
        try {
            int affectedRows = friendLinkRepository.updateRecommend(Id, recommend);
            return affectedRows > 0;
        } catch (Exception e) {
            throw new RuntimeException("Error changing recommend status for friendLink : " + Id, e);
        }
    }
}