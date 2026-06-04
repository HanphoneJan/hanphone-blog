package com.example.blog.dao;

import com.example.blog.po.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface UserMergeRepository extends JpaRepository<User, Long> {

    /** 合并：将 sourceUserId 的所有 Blog 转移给 targetUserId */
    @Modifying
    @Query(value = "UPDATE t_blog SET user_id = :targetId WHERE user_id = :sourceId", nativeQuery = true)
    int mergeBlogs(@Param("sourceId") Long sourceId, @Param("targetId") Long targetId);

    /** 合并：将 sourceUserId 的所有 Essay 转移给 targetUserId */
    @Modifying
    @Query(value = "UPDATE t_essay SET user_id = :targetId WHERE user_id = :sourceId", nativeQuery = true)
    int mergeEssays(@Param("sourceId") Long sourceId, @Param("targetId") Long targetId);

    /** 合并：将 sourceUserId 的所有 Comment 转移给 targetUserId */
    @Modifying
    @Query(value = "UPDATE t_comment SET user_id = :targetId WHERE user_id = :sourceId", nativeQuery = true)
    int mergeComments(@Param("sourceId") Long sourceId, @Param("targetId") Long targetId);

    /** 合并：将 sourceUserId 的所有 EssayComment 转移给 targetUserId */
    @Modifying
    @Query(value = "UPDATE t_essay_comment SET user_id = :targetId WHERE user_id = :sourceId", nativeQuery = true)
    int mergeEssayComments(@Param("sourceId") Long sourceId, @Param("targetId") Long targetId);

    /** 合并：将 sourceUserId 的所有 UserBlogLike 转移给 targetUserId（冲突则跳过） */
    @Modifying
    @Query(value = "UPDATE t_user_blog_like SET user_id = :targetId WHERE user_id = :sourceId " +
            "ON CONFLICT (user_id, blog_id) DO NOTHING", nativeQuery = true)
    int mergeBlogLikes(@Param("sourceId") Long sourceId, @Param("targetId") Long targetId);

    /** 合并：将 sourceUserId 的所有 UserEssayLike 转移给 targetUserId（冲突则跳过） */
    @Modifying
    @Query(value = "UPDATE t_user_essay_like SET user_id = :targetId WHERE user_id = :sourceId " +
            "ON CONFLICT (user_id, essay_id) DO NOTHING", nativeQuery = true)
    int mergeEssayLikes(@Param("sourceId") Long sourceId, @Param("targetId") Long targetId);

    /** 合并：将 sourceUserId 的所有发送的私信转移给 targetUserId */
    @Modifying
    @Query(value = "UPDATE private_message SET sender_id = :targetId WHERE sender_id = :sourceId", nativeQuery = true)
    int mergePrivateMessagesSent(@Param("sourceId") Long sourceId, @Param("targetId") Long targetId);

    /** 合并：将 sourceUserId 的所有接收的私信转移给 targetUserId */
    @Modifying
    @Query(value = "UPDATE private_message SET receiver_id = :targetId WHERE receiver_id = :sourceId", nativeQuery = true)
    int mergePrivateMessagesReceived(@Param("sourceId") Long sourceId, @Param("targetId") Long targetId);
}
