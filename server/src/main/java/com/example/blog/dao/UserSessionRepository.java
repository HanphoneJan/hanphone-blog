package com.example.blog.dao;

import com.example.blog.po.UserSession;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Date;
import java.util.List;
import java.util.Optional;

@Repository
public interface UserSessionRepository extends JpaRepository<UserSession, Long> {

    Optional<UserSession> findFirstByRefreshHash(String refreshHash);

    /** 命中「上一枚」说明客户端拿的是已经轮换掉的旧令牌 —— 视为泄露 */
    Optional<UserSession> findFirstByPrevHash(String prevHash);

    Optional<UserSession> findFirstBySid(String sid);

    List<UserSession> findByUserIdOrderByLastUsedAtDescCreatedAtDesc(Long userId);

    List<UserSession> findByUserIdAndRevokedAtIsNullAndExpiresAtAfter(Long userId, Date now);

    @Modifying
    @Query("update UserSession s set s.revokedAt = :at, s.revokedReason = :reason " +
            "where s.userId = :userId and s.revokedAt is null")
    int revokeAllByUserId(@Param("userId") Long userId,
                          @Param("at") Date at,
                          @Param("reason") String reason);

    @Modifying
    @Query("update UserSession s set s.revokedAt = :at, s.revokedReason = :reason " +
            "where s.userId = :userId and s.sid <> :keepSid and s.revokedAt is null")
    int revokeAllByUserIdExceptSid(@Param("userId") Long userId,
                                   @Param("keepSid") String keepSid,
                                   @Param("at") Date at,
                                   @Param("reason") String reason);

    @Modifying
    @Query("delete from UserSession s where s.expiresAt < :before")
    int deleteExpired(@Param("before") Date before);
}
