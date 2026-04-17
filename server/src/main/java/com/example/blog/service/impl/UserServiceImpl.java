package com.example.blog.service.impl;

import com.example.blog.dao.UserRepository;
import com.example.blog.po.User;
import com.example.blog.service.UserService;
import com.example.blog.util.BcryptUtils;
import com.example.blog.util.MyBeanUtils;
import org.springframework.beans.BeanUtils;
import org.springframework.stereotype.Service;

import javax.transaction.Transactional;
import java.util.Date;
import java.util.List;
import java.util.Objects;

@Service
public class UserServiceImpl implements UserService {

    private final UserRepository userRepository;

    public UserServiceImpl(UserRepository userRepository) {
        this.userRepository = Objects.requireNonNull(userRepository, "userRepository must not be null");
    }

    @Override
    public User checkUser(String username, String password) {
        Objects.requireNonNull(username, "username must not be null");
        Objects.requireNonNull(password, "password must not be null");

        try {
            // 第一步：先通过用户名查询用户
            User user = userRepository.findByUsername(username);

            // 第二步：若用户名未查到，通过邮箱查询用户
            if (user == null) {
                user = userRepository.findByEmail(username); // 将入参username作为邮箱值查询
            }

            // 第三步：若用户名/邮箱均未查到，返回null
            if (user == null) {
                return null;
            }

            // 第四步：验证密码（无论通过用户名还是邮箱查到，均验证密码）
            String hashedPassword = user.getPassword();
            if (BcryptUtils.verify(password, hashedPassword)) {
                return user;
            }
            return null;
        } catch (Exception e) {
            throw new RuntimeException("Failed to check user", e);
        }
    }

    // 【新增】仅校验用户是否存在（用户名或邮箱已被占用）
    @Override
    public boolean isUserExists(String username, String email) {
        Objects.requireNonNull(username, "username must not be null");
        Objects.requireNonNull(email, "email must not be null");
        try {
            // 1. 检查用户名是否已存在
            User userByUsername = userRepository.findByUsername(username);
            if (userByUsername != null) {
                return true;
            }
            // 2. 检查邮箱是否已存在
            User userByEmail = userRepository.findByEmail(email);
            return userByEmail != null;
        } catch (Exception e) {
            throw new RuntimeException("Failed to check user existence", e);
        }
    }

    // 【新增】校验邮箱是否被其他用户占用
    @Override
    public boolean isEmailExists(String email, Long excludeUserId) {
        Objects.requireNonNull(email, "email must not be null");
        try {
            // 1. 检查邮箱是否已存在（排除当前用户）
            if (excludeUserId != null) {
                User userByEmail = userRepository.findByEmailAndExcludeId(email, excludeUserId);
                return userByEmail != null;
            } else {
                User userByEmail = userRepository.findByEmail(email);
                return userByEmail != null;
            }
        } catch (Exception e) {
            throw new RuntimeException("Failed to check email existence", e);
        }
    }

    @Transactional
    @Override
    public User findUserById(Long id) {
        Objects.requireNonNull(id, "id must not be null");

        try {
            return userRepository.getOne(id);
        } catch (Exception e) {
            throw new RuntimeException("Failed to find user by id: " + id, e);
        }
    }

    @Override
    public User findUserByUsername(String username) {
        Objects.requireNonNull(username, "username must not be null");
        try {
            return userRepository.findByUsername(username);
        } catch (Exception e) {
            throw new RuntimeException("Failed to find user by username: " + username, e);
        }
    }

    @Override
    public User save(User user) {
        Objects.requireNonNull(user, "user must not be null");

        try {
            user.setCreateTime(new Date());
            user.setUpdateTime(new Date());
            if (user.getAvatar() == null || user.getAvatar().isEmpty()) {
                user.setAvatar("");
            }
            return userRepository.save(user);
        } catch (Exception e) {
            throw new RuntimeException("Failed to save user", e);
        }
    }

    @Transactional
    @Override
    public User updateUser(Long id, User admin) {
        Objects.requireNonNull(id, "id must not be null");
        Objects.requireNonNull(admin, "admin must not be null");

        try {
            User u = userRepository.getOne(id);
            Objects.requireNonNull(u, "User not found with id: " + id);

            BeanUtils.copyProperties(admin, u, MyBeanUtils.getNullPropertyNames(admin));
            if (admin.getPassword() != null && !admin.getPassword().isEmpty()) {
                String hashedPassword = BcryptUtils.encrypt(admin.getPassword());
                u.setPassword(hashedPassword);
            }
            u.setUpdateTime(new Date()); // 确保更新时间被刷新
            return userRepository.save(u);
        } catch (Exception e) {
            throw new RuntimeException("Failed to update user with id: " + id, e);
        }
    }

    @Override
    public List<User> listUser() {
        try {
            return userRepository.findAll();
        } catch (Exception e) {
            throw new RuntimeException("Failed to list users", e);
        }
    }

    @Override
    public Boolean deleteUserById(Long id) {
        Objects.requireNonNull(id, "id must not be null");

        try {
            userRepository.deleteById(id);
            return true;
        } catch (Exception e) {
            throw new RuntimeException("Failed to delete user with id: " + id, e);
        }
    }

    @Override
    @Transactional
    public Boolean resetPassword(String newPassword, String email) {
        Objects.requireNonNull(newPassword, "newPassword must not be null");
        Objects.requireNonNull(email, "email must not be null");

        try {
            User user = userRepository.findByEmail(email);
            Objects.requireNonNull(user, "User not found with email: " + email);

            String hashedPassword = BcryptUtils.encrypt(newPassword);
            int affectedRows = userRepository.resetPassword(user.getId(), hashedPassword);
            return affectedRows > 0;
        } catch (Exception e) {
            throw new RuntimeException("Failed to reset password for email: " + email, e);
        }
    }

    @Override
    @Transactional
    public Boolean resetPasswordAdmin(Long userId, String newPassword) {
        Objects.requireNonNull(userId, "userId must not be null");
        Objects.requireNonNull(newPassword, "newPassword must not be null");

        try {
            String hashedPassword = BcryptUtils.encrypt(newPassword);
            int affectedRows = userRepository.resetPassword(userId, hashedPassword);
            return affectedRows > 0;
        } catch (Exception e) {
            throw new RuntimeException("Failed to reset password for user id: " + userId, e);
        }
    }

    @Override
    public User getCurrentUser(Long userId) {
        Objects.requireNonNull(userId, "userId must not be null");

        try {
            User user = userRepository.getOne(userId);
            return clearSensitiveFields(user);
        } catch (Exception e) {
            throw new RuntimeException("Failed to get current user with id: " + userId, e);
        }
    }

    @Override
    @Transactional
    public User updateCurrentUser(Long userId, User user, boolean emailChanged) {
        Objects.requireNonNull(userId, "userId must not be null");
        Objects.requireNonNull(user, "user must not be null");

        try {
            User existingUser = userRepository.getOne(userId);
            Objects.requireNonNull(existingUser, "User not found with id: " + userId);

            // 如果邮箱被修改，需要检查新邮箱是否被其他用户占用
            if (emailChanged && user.getEmail() != null) {
                // 检查新邮箱是否被其他用户占用
                if (isEmailExists(user.getEmail().trim(), userId)) {
                    throw new RuntimeException("该邮箱已被绑定");
                }
            }

            // 只更新允许修改的字段
            if (user.getNickname() != null) {
                existingUser.setNickname(user.getNickname());
            }
            if (user.getEmail() != null) {
                existingUser.setEmail(user.getEmail().trim());
            }
            if (user.getPassword() != null && !user.getPassword().isEmpty()) {
                String hashedPassword = BcryptUtils.encrypt(user.getPassword());
                existingUser.setPassword(hashedPassword);
            }
            if (user.getAvatar() != null) {
                existingUser.setAvatar(user.getAvatar());
            }

            existingUser.setUpdateTime(new Date());
            return userRepository.save(existingUser);
        } catch (RuntimeException e) {
            throw e;
        } catch (Exception e) {
            throw new RuntimeException("Failed to update current user with id: " + userId, e);
        }
    }

    @Override
    public User clearSensitiveFields(User user) {
        if (user == null) {
            return null;
        }
        user.setPassword(null);
        user.setLoginProvince(null);
        user.setLoginCity(null);
        user.setLoginLat(null);
        user.setLoginLng(null);
        user.setIsOnline(null);
        user.setCreateTime(null);
        user.setUpdateTime(null);
        user.setLastLoginTime(null);
        return user;
    }
}