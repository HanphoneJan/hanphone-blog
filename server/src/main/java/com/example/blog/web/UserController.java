package com.example.blog.web;

import com.example.blog.enums.UserType;
import com.example.blog.po.Result;
import com.example.blog.po.StatusCode;
import com.example.blog.po.User;
import com.example.blog.service.EmailCaptchaService;
import com.example.blog.service.UserService;
import com.example.blog.util.BcryptUtils;
import com.example.blog.util.TokenUtil;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.web.bind.annotation.*;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import java.util.Date;
import java.util.HashMap;
import java.util.Map;
import java.util.Objects;
@RestController
public class UserController {

    private final UserService userService;
    private final EmailCaptchaService emailCaptchaService;

    public UserController(UserService userService, EmailCaptchaService emailCaptchaService) {
        this.userService = userService;
        this.emailCaptchaService = emailCaptchaService;
    }

    @PostMapping(value = "/login")
    public Result<Map<String, Object>> login(@RequestBody User u) {
        if (u == null || u.getUsername() == null || u.getPassword() == null) {
            return new Result<>(false, StatusCode.ERROR, "用户名和密码不能为空", null);
        }
        User user = userService.checkUser(u.getUsername(), u.getPassword());
        if (user != null) {
            TokenUtil.TokenInfo token = TokenUtil.sign(user);
            Map<String, Object> info = new HashMap<>();
            user.setLoginProvince(u.getLoginProvince());
            user.setLoginCity(u.getLoginCity());
            user.setLoginLat(u.getLoginLat());
            user.setLoginLng(u.getLoginLng());
            user.setLastLoginTime(new Date());
            User newUser = userService.save(user);
            userService.clearSensitiveFields(newUser);
            info.put("user", newUser);
            info.put("token", Objects.requireNonNull(token).getToken());
            info.put("expire", token.getExpireTime());

            return new Result<>(true, StatusCode.OK, "登录成功", info);
        } else {
            return new Result<>(true, StatusCode.ERROR, "登录失败", null);
        }
    }

    @PostMapping(value = "/register")
    public Result<Map<String, Object>> post(@RequestBody User u) {
        if (u == null || u.getUsername() == null || u.getPassword() == null || u.getEmail() == null) {
            return new Result<>(false, StatusCode.ERROR, "用户名、密码和邮箱不能为空", null);
        }
        String username = u.getUsername().trim();
        String email = u.getEmail().trim();

        // 分别检查用户名和邮箱是否已被占用
        User existingUserByUsername = userService.findUserByUsername(username);
        if (existingUserByUsername != null) {
            return new Result<>(false, StatusCode.ERROR, "用户名已被占用", null);
        }
        if (userService.isEmailExists(email, null)) {
            return new Result<>(false, StatusCode.ERROR, "邮箱已被绑定", null);
        }

        String encryptPassword = BcryptUtils.encrypt(u.getPassword());
        u.setPassword(encryptPassword);
        u.setUsername(username);
        u.setEmail(email);
        User user = userService.save(u);
        userService.clearSensitiveFields(user);
        TokenUtil.TokenInfo tokenInfo = TokenUtil.sign(user);
        Map<String, Object> info = new HashMap<>();
        info.put("user", user);
        info.put("token", Objects.requireNonNull(tokenInfo).getToken());
        info.put("expire", tokenInfo.getExpireTime());
        return new Result<>(true, StatusCode.OK, "注册并登录成功", info);
    }

    // 重置密码接口：无具体数据返回（null），泛型指定为Void
    @PostMapping(value="/user/resetPassword")
    public Result<Void> resetPassword(@RequestBody Map<String,String> para) {
        try{
            String newPassword = para.get("newPassword");
            String captcha = para.get("captcha");
            String email = para.get("email");
            if(emailCaptchaService.validateCaptcha(email,captcha)){
                if(userService.resetPassword(newPassword,email)){
                    return new Result<>(true, StatusCode.OK, "重置密码成功", null);
                }
                return new Result<>(true, StatusCode.ERROR, "重置密码失败", null);
            }
            return new Result<>(true, StatusCode.ERROR, "重置密码失败", null);
        }catch (Exception e){
            return new Result<>(true, StatusCode.ERROR, "重置密码失败", null);
        }
    }

    // 发送验证码接口：无具体数据返回（null），泛型指定为Void
    @PostMapping(value="/user/sendCaptcha")
    public Result<Void> sendCaptcha(@RequestBody Map<String,String> para) {
        try{
            String email = para.get("email");
            if (email == null || email.trim().isEmpty()) {
                return new Result<>(false, StatusCode.ERROR, "邮箱地址不能为空", null);
            }
            if(emailCaptchaService.sendCaptcha(email)){
                return new Result<>(true, StatusCode.OK, "发送验证码成功", null);
            }
            return new Result<>(true, StatusCode.ERROR, "发送验证码失败", null);
        }catch (Exception e){
            return new Result<>(true, StatusCode.ERROR, "发送验证码失败", null);
        }
    }

    @GetMapping("/logout")
    public Result<Void>  logout(HttpSession session){
        session.removeAttribute("user");
        return new Result<>(true, StatusCode.OK, "退出登录成功", null);
    }

    // 获取当前用户信息
    @PostMapping("/user/current")
    public Result<User> getCurrentUser(@RequestBody Map<String, Long> para, HttpServletRequest request) {
        try {
            String token = request.getHeader("token");
            Long userId = para.get("userId");
            
            if (userId == null) {
                return new Result<>(false, StatusCode.ERROR, "用户ID不能为空", null);
            }

            // 验证 token 和权限
            if (token == null || token.trim().isEmpty()) {
                return new Result<>(false, StatusCode.ERROR, "token不能为空", null);
            }

            if (!TokenUtil.verifyAccess(token, userId)) {
                return new Result<>(false, StatusCode.ERROR, "无权限访问", null);
            }

            User user = userService.getCurrentUser(userId);
            return new Result<>(true, StatusCode.OK, "获取用户信息成功", user);
        } catch (Exception e) {
            return new Result<>(false, StatusCode.ERROR, "获取用户信息失败", null);
        }
    }

    // 更新当前用户信息
    @PostMapping("/user/current/update")
    public Result<User> updateCurrentUser(@RequestBody Map<String, Object> para, HttpServletRequest request) {
        try {
            String token = request.getHeader("token");
            Long userId = Long.valueOf(para.get("userId").toString());
            
            // 使用 ObjectMapper 将 LinkedHashMap 转换为 User 对象
            ObjectMapper mapper = new ObjectMapper();
            User user = mapper.convertValue(para.get("user"), User.class);

            if (userId == null || user == null) {
                return new Result<>(false, StatusCode.ERROR, "用户ID或用户信息不能为空", null);
            }

            // 验证 token 和权限
            if (token == null || token.trim().isEmpty()) {
                return new Result<>(false, StatusCode.ERROR, "token不能为空", null);
            }

            if (!TokenUtil.verifyAccess(token, userId)) {
                return new Result<>(false, StatusCode.ERROR, "无权限访问", null);
            }

            // 获取当前用户信息，判断邮箱是否被修改
            User currentUser = userService.getCurrentUser(userId);

            // 判断邮箱是否被修改
            boolean emailChanged = false;
            if (user.getEmail() != null && !user.getEmail().trim().isEmpty()) {
                emailChanged = !user.getEmail().trim().equals(currentUser.getEmail());
            }

            // 如果邮箱被修改，且当前用户不是管理员，需要验证验证码
            if (emailChanged && !UserType.ADMIN.getCode().equals(currentUser.getType())) {
                String captcha = para.get("captcha") != null ? para.get("captcha").toString() : null;
                if (captcha == null || captcha.trim().isEmpty()) {
                    return new Result<>(false, StatusCode.ERROR, "修改邮箱需要验证码", null);
                }

                // 验证验证码（验证码是针对新邮箱的）
                if (!emailCaptchaService.validateCaptcha(user.getEmail().trim(), captcha.trim())) {
                    return new Result<>(false, StatusCode.ERROR, "验证码错误或已过期", null);
                }
            }

            User updatedUser = userService.updateCurrentUser(userId, user, emailChanged);
            userService.clearSensitiveFields(updatedUser);
            return new Result<>(true, StatusCode.OK, "更新用户信息成功", updatedUser);
        } catch (RuntimeException e) {
            return new Result<>(false, StatusCode.ERROR, e.getMessage(), null);
        } catch (Exception e) {
            return new Result<>(false, StatusCode.ERROR, "更新用户信息失败", null);
        }
    }
}