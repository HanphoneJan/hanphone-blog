package com.example.blog.service;

import com.example.blog.dao.UserRepository;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;

/**
 * 用户当前密码版本（JWT 的 `pwdv` claim）。
 *
 * - access token 里带 `pwdv`，`TokenInterceptor` 每次比对：版本不一致说明密码已改，旧 token 立即失效；
 * - 查询走 Caffeine（300s），改密码时主动 evict，所以命中缓存的代价可以忽略。
 */
@Service
public class PasswordVersionService {

    private final UserRepository userRepository;

    public PasswordVersionService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @Cacheable(value = "pwdVersion", key = "#userId")
    public int current(Long userId) {
        if (userId == null) {
            return 0;
        }
        return userRepository.findById(userId)
                .map(u -> u.getPasswordVersion() == null ? 0 : u.getPasswordVersion())
                .orElse(0);
    }

    /** 改完密码后调用（必须从别的 bean 调用，否则 @CacheEvict 不生效） */
    @CacheEvict(value = "pwdVersion", key = "#userId")
    public void evict(Long userId) {
        // 仅用于清缓存
    }
}
