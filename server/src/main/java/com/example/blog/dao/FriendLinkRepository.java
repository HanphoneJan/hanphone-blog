package com.example.blog.dao;

import com.example.blog.po.FriendLink;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface FriendLinkRepository extends JpaRepository<FriendLink,Long> {
    @Modifying
    @Query("UPDATE FriendLink e SET e.recommend = :recommend WHERE e.id = :id")
    int updateRecommend(@Param("id") Long id, @Param("recommend") boolean recommend);
    
    // 只查询已发布的友链（前台展示用）
    @Query("SELECT f FROM FriendLink f WHERE f.published = true OR f.published IS NULL")
    List<FriendLink> findAllPublished();
    
    // 根据发布状态查询（后台管理用）
    List<FriendLink> findByPublished(Boolean published);
}
