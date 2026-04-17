package com.example.blog.dao;

import com.example.blog.po.UserEssayLike;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface UserEssayLikeRepository extends JpaRepository<UserEssayLike, Long> {

    // 根据用户ID和文章ID查询点赞记录
    Optional<UserEssayLike> findByUserIdAndEssayId(Long userId, Long essayId);

    // 删除用户对文章的点赞记录
    @Modifying
    @Query("DELETE FROM UserEssayLike uel WHERE uel.user.id = :userId AND uel.essay.id = :essayId")
    void deleteByUserIdAndEssayId(@Param("userId") Long userId, @Param("essayId") Long essayId);
}