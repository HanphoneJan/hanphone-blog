package com.example.blog.service.impl;

import com.example.blog.dao.FriendLinkRepository;
import com.example.blog.po.FriendLink;
import com.example.blog.service.FriendLinkService;
import com.example.blog.util.MyBeanUtils;
import org.springframework.beans.BeanUtils;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;

import jakarta.persistence.criteria.Predicate;
import jakarta.transaction.Transactional;
import java.util.*;

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
            // 前台只返回已发布的友链
            return friendLinkRepository.findAllPublished();
        } catch (Exception e) {
            throw new RuntimeException("Failed to get friend link list", e);
        }
    }
    
    @Override
    public Page<FriendLink> listFriendLink(Pageable pageable) {
        requireNonNull(pageable, "pageable must not be null");
        try {
            // 前台只返回已发布的友链
            return friendLinkRepository.findAll(
                    (Specification<FriendLink>) (root, cq, cb) -> {
                        List<Predicate> predicates = new ArrayList<>();
                        predicates.add(cb.equal(root.get("published"), true));
                        cq.where(predicates.toArray(new Predicate[0]));
                        return null;
                    }, pageable);
        } catch (Exception e) {
            throw new RuntimeException("Failed to get friend link list with pageable", e);
        }
    }

    @Override
    public List<FriendLink> listAllFriendLinks() {
        try {
            // 后台返回所有友链
            return friendLinkRepository.findAll();
        } catch (Exception e) {
            throw new RuntimeException("Failed to get all friend links", e);
        }
    }
    
    @Override
    public List<FriendLink> listByPublished(Boolean published) {
        try {
            return friendLinkRepository.findByPublished(published);
        } catch (Exception e) {
            throw new RuntimeException("Failed to get friend links by published status", e);
        }
    }

    @Override
    public void deleteFriendLink(Long id) {
        Objects.requireNonNull(id, "friend link id must not be null");
        try {
            friendLinkRepository.deleteById(id);
        } catch (Exception e) {
            throw new RuntimeException("Failed to delete friend link with id: " + id, e);
        }
    }

    @Override
    public FriendLink saveFriendLink(FriendLink friendLink) {
        Objects.requireNonNull(friendLink, "friendLink must not be null");
        try {
            // 默认未发布
            if (friendLink.getPublished() == null) {
                friendLink.setPublished(false);
            }
            return friendLinkRepository.save(friendLink);
        } catch (Exception e) {
            throw new RuntimeException("Failed to save friend link", e);
        }
    }

    @Override
    public FriendLink updateFriendLink(Long id, FriendLink friendLink) {
        Objects.requireNonNull(id, "friend link id must not be null");
        Objects.requireNonNull(friendLink, "friendLink must not be null");
        try {
            FriendLink p = friendLinkRepository.getReferenceById(id);
            Objects.requireNonNull(p, "friend link with id: " + id + " not found");

            BeanUtils.copyProperties(friendLink, p, MyBeanUtils.getNullPropertyNames(friendLink));
            return friendLinkRepository.save(p);
        } catch (Exception e) {
            throw new RuntimeException("Failed to update friend link with id: " + id, e);
        }
    }

    @Override
    @Transactional
    public Boolean changeRecommend(Long id, Boolean recommend) {
        requireNonNull(id, "friendLink id must not be null");
        requireNonNull(recommend, "recommend flag must not be null");
        try {
            int affectedRows = friendLinkRepository.updateRecommend(id, recommend);
            return affectedRows > 0;
        } catch (Exception e) {
            throw new RuntimeException("Error changing recommend status for friendLink : " + id, e);
        }
    }
    
    @Override
    @Transactional
    public Boolean changePublished(Long id, Boolean published) {
        requireNonNull(id, "friendLink id must not be null");
        requireNonNull(published, "published flag must not be null");
        try {
            FriendLink friendLink = friendLinkRepository.getReferenceById(id);
            if (friendLink == null) {
                return false;
            }
            friendLink.setPublished(published);
            friendLinkRepository.save(friendLink);
            return true;
        } catch (Exception e) {
            throw new RuntimeException("Error changing published status for friendLink: " + id, e);
        }
    }
    
    @Override
    public FriendLink applyFriendLink(FriendLink friendLink) {
        Objects.requireNonNull(friendLink, "friendLink must not be null");
        try {
            // 前台申请默认未发布
            friendLink.setPublished(false);
            friendLink.setRecommend(false);
            friendLink.setCreateTime(new Date());
            return friendLinkRepository.save(friendLink);
        } catch (Exception e) {
            throw new RuntimeException("Failed to apply friend link", e);
        }
    }
}
