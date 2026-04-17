package com.example.blog.web.admin;

import com.example.blog.po.Result;
import com.example.blog.po.StatusCode;
import com.example.blog.po.User;
import com.example.blog.service.UserService;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/admin")
public class AdministratorController {

    private final UserService userService;

    public AdministratorController(UserService userService) {
        this.userService = userService;
    }

    @PostMapping("/setAvatar")
    public Result<User> setAvatar(@RequestBody Map<String, Object> para) {
        String picUrl = (String) para.get("pic_url");
        long id = Long.parseLong(para.get("user_id").toString());
        User admin = userService.findUserById(id);
        if (admin == null){
            return new Result<>(true, StatusCode.ERROR, "用户不存在", null);
        } else {
            admin.setAvatar(picUrl);
            userService.updateUser(id,admin);
            admin.setPassword(null);
        }
        return new Result<>(true, StatusCode.OK, "新增成功", admin);
    }

    @PostMapping("/user")
    public Result<User> post(@RequestBody Map<String, User> para) {
        User user = para.get("user");
        User u;
        if (user.getId() == null){
             u = userService.save(user);
        } else {
             u = userService.updateUser(user.getId(),user);
        }
        u.setPassword(null); // 管理接口也不返回密码
        return new Result<>(true, StatusCode.OK, "修改用户信息成功",u);
    }

    @DeleteMapping("/users/{id}")
    public Result<Void> delete(@PathVariable Long id) {
        if(userService.deleteUserById(id)){
            return new Result<>(true, StatusCode.OK, "删除用户信息成功", null);
        }
        return new Result<>(false, StatusCode.ERROR, "删除用户信息失败", null);
    }

    @GetMapping(value = "/users")
    public Result<List<User>> get(){
        List<User> users = userService.listUser();
        users.forEach(u -> u.setPassword(null)); // 不返回密码
        return new Result<>(true, StatusCode.OK, "获取用户列表成功", users);
    }

    @PostMapping(value="/user/resetPassword")
    public Result<Void> resetPassword(@RequestBody Map<Object,String> para) {
        String userIdStr = para.get("userId");
        if (userIdStr == null || userIdStr.isEmpty()) {
            return new Result<>(false, StatusCode.ERROR, "修改密码失败",null);
        }
        Long userId =Long.parseLong(userIdStr);
        String newPassword = para.get("newPassword");
        if(userService.resetPasswordAdmin(userId,newPassword)){
            return new Result<>(true, StatusCode.OK, "修改密码成功",null);
        }
        return new Result<>(false, StatusCode.ERROR, "修改密码失败",null);
    }
}
