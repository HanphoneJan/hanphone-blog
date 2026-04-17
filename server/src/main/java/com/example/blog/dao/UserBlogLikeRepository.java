package com.example.blog.dao;

import com.example.blog.po.UserBlogLike;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface UserBlogLikeRepository extends JpaRepository<UserBlogLike, Long> {

    // 根据ID查询点赞记录
    Optional<UserBlogLike> findByUserIdAndBlogId(Long userId, Long blogId);

    // 删除用户的点赞记录
    @Modifying
    @Query("DELETE FROM UserBlogLike uel WHERE uel.user.id = :userId AND uel.blog.id = :blogId")
    void deleteByUserIdAndBlogId(@Param("userId") Long userId, @Param("blogId") Long blogId);
}