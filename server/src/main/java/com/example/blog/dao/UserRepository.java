package com.example.blog.dao;

import com.example.blog.po.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Date;
import java.util.List;

@Repository
public interface UserRepository extends JpaRepository<User,Long> {

    User findByUsername(String username);
    User findByEmail(String email);
    User findByGithubId(String githubId);
    User findByGoogleId(String googleId);
    @Modifying
    @Query("UPDATE User e SET e.password = :hashedPassword WHERE e.id = :userId")
    int resetPassword(@Param("userId") Long id, @Param("hashedPassword") String hashedPassword);
    /** 密码版本 +1（改密码时调用，令旧 access token 失效） */
    @Modifying
    @Query("UPDATE User u SET u.passwordVersion = coalesce(u.passwordVersion, 0) + 1 WHERE u.id = :userId")
    int incrementPasswordVersion(@Param("userId") Long userId);

    @Query("SELECT u FROM User u WHERE u.email = :email AND u.id != :userId")
    User findByEmailAndExcludeId(@Param("email") String email, @Param("userId") Long userId);

    /**
     * 查询所有在线用户
     */
    List<User> findByIsOnlineTrue();

    /**
     * 更新用户在线状态
     */
    @Modifying
    @Query("UPDATE User u SET u.isOnline = :isOnline, u.lastLoginTime = :lastLoginTime WHERE u.id = :userId")
    int updateOnlineStatus(@Param("userId") Long userId, @Param("isOnline") Boolean isOnline, @Param("lastLoginTime") Date lastLoginTime);
}
