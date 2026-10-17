package com.example.blog.dao;

import com.example.blog.po.DeviceToken;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface DeviceTokenRepository extends JpaRepository<DeviceToken, Long> {

    Optional<DeviceToken> findByToken(String token);

    List<DeviceToken> findByUserId(Long userId);

    /** 批量删除失效 token（FCM 返回 token 失效时清理） */
    void deleteByTokenIn(List<String> tokens);
}
