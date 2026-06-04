package com.example.blog.web;

import com.example.blog.po.Result;
import com.example.blog.po.StatusCode;
import com.example.blog.po.User;
import com.example.blog.service.UserService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * 内部 API 控制器 — 供 hanphone-chat 等内部服务调用
 *
 * 鉴权方式：请求头 X-Internal-Key
 * 这些接口不经过 TokenInterceptor，使用独立的密钥验证
 */
@RestController
public class InternalApiController {

    private final UserService userService;

    @Value("${internal.api.key:}")
    private String internalApiKey;

    public InternalApiController(UserService userService) {
        this.userService = userService;
    }

    /**
     * 根据 ID 查询用户（返回完整信息，不清除敏感字段）
     */
    @GetMapping("/user/{id}")
    public Result<User> getUserById(
            @PathVariable Long id,
            @RequestHeader(value = "X-Internal-Key", defaultValue = "") String key) {
        if (!verifyKey(key)) {
            return unauthorized();
        }
        try {
            User user = userService.findUserById(id);
            if (user != null) {
                // 内部接口返回完整信息，但清空密码
                user.setPassword(null);
                return new Result<>(true, StatusCode.OK, "查询成功", user);
            }
            return new Result<>(false, StatusCode.ERROR, "用户不存在", null);
        } catch (Exception e) {
            return new Result<>(false, StatusCode.ERROR, "查询失败: " + e.getMessage(), null);
        }
    }

    /**
     * 根据用户名查询用户
     */
    @GetMapping("/user/username/{username}")
    public Result<User> getUserByUsername(
            @PathVariable String username,
            @RequestHeader(value = "X-Internal-Key", defaultValue = "") String key) {
        if (!verifyKey(key)) {
            return unauthorized();
        }
        try {
            User user = userService.findUserByUsername(username);
            if (user != null) {
                user.setPassword(null);
                return new Result<>(true, StatusCode.OK, "查询成功", user);
            }
            return new Result<>(false, StatusCode.ERROR, "用户不存在", null);
        } catch (Exception e) {
            return new Result<>(false, StatusCode.ERROR, "查询失败: " + e.getMessage(), null);
        }
    }

    /**
     * 获取所有用户列表
     */
    @GetMapping("/users")
    public Result<List<User>> getAllUsers(
            @RequestHeader(value = "X-Internal-Key", defaultValue = "") String key) {
        if (!verifyKey(key)) {
            return unauthorized();
        }
        try {
            List<User> users = userService.listUser();
            // 清除所有用户的密码
            users.forEach(u -> u.setPassword(null));
            return new Result<>(true, StatusCode.OK, "查询成功", users);
        } catch (Exception e) {
            return new Result<>(false, StatusCode.ERROR, "查询失败: " + e.getMessage(), null);
        }
    }

    /**
     * 获取在线用户列表
     */
    @GetMapping("/users/online")
    public Result<List<User>> getOnlineUsers(
            @RequestHeader(value = "X-Internal-Key", defaultValue = "") String key) {
        if (!verifyKey(key)) {
            return unauthorized();
        }
        try {
            List<User> users = userService.getOnlineUsers();
            users.forEach(u -> u.setPassword(null));
            return new Result<>(true, StatusCode.OK, "查询成功", users);
        } catch (Exception e) {
            return new Result<>(false, StatusCode.ERROR, "查询失败: " + e.getMessage(), null);
        }
    }

    /**
     * 设置用户在线状态
     */
    @PostMapping("/users/{id}/online")
    public Result<Void> setUserOnlineStatus(
            @PathVariable Long id,
            @RequestParam Boolean online,
            @RequestHeader(value = "X-Internal-Key", defaultValue = "") String key) {
        if (!verifyKey(key)) {
            return unauthorized();
        }
        try {
            Boolean success = userService.setUserOnlineStatus(id, online);
            if (Boolean.TRUE.equals(success)) {
                return new Result<>(true, StatusCode.OK, "设置成功", null);
            }
            return new Result<>(false, StatusCode.ERROR, "设置失败，用户可能不存在", null);
        } catch (Exception e) {
            return new Result<>(false, StatusCode.ERROR, "设置失败: " + e.getMessage(), null);
        }
    }

    // ========== 私有方法 ==========

    private boolean verifyKey(String key) {
        if (internalApiKey == null || internalApiKey.trim().isEmpty()) {
            return false;
        }
        return internalApiKey.equals(key);
    }

    private <T> Result<T> unauthorized() {
        return new Result<>(false, StatusCode.ERROR, "未授权访问", null);
    }
}
