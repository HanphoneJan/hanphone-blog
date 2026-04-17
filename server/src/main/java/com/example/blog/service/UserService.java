package com.example.blog.service;

import com.example.blog.po.User;

import java.util.List;

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
}
