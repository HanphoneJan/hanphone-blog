package com.example.blog.service;

import com.example.blog.po.User;

import java.util.List;
import java.util.Map;

public interface UserService {
    User checkUser(String username, String password);
    boolean isUserExists(String username, String email);
    boolean isEmailExists(String email, Long excludeUserId);
    User findUserById(Long id);
    User findUserByUsername(String username);

    User save(User user);

    User updateUser(Long id, User admin);

    List<User> listUser();

    Boolean deleteUserById(Long id);

    Boolean resetPassword(String newPassword,String email);

    Boolean resetPasswordAdmin(Long userId, String newPassword);

    User getCurrentUser(Long userId);

    User updateCurrentUser(Long userId, User user, boolean emailChanged);

    /**
     * 清除用户隐私字段，用于公共接口返回
     */
    User clearSensitiveFields(User user);

    /**
     * 获取在线用户列表（内部接口使用）
     */
    List<User> getOnlineUsers();

    /**
     * 设置用户在线状态（内部接口使用）
     */
    Boolean setUserOnlineStatus(Long userId, Boolean isOnline);

    /**
     * 绑定 OAuth 账号（可能触发合并）
     * @param currentUserId 当前登录用户 ID
     * @param provider 提供商名称（github / google）
     * @param providerId 提供商用户 ID
     * @return 合并信息（如果发生合并则返回被合并的旧账号信息，否则 null）
     */
    Map<String, Object> bindOauth(Long currentUserId, String provider, String providerId);

    /**
     * 解绑 OAuth 账号
     */
    void unbindOauth(Long userId, String provider);
}
