package com.example.blog.service;

/**
 * 当前请求的登录用户（由 {@link CurrentUserService#resolve} 解析）。
 *
 * @param id    用户 ID
 * @param admin 是否管理员（JWT 的 `userType` 为 "1"）
 */
public record CurrentUser(Long id, boolean admin) {
}
