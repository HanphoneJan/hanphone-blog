package com.example.blog.web;

import com.example.blog.interceptor.UserAuthInterceptor;
import com.example.blog.po.Notification;
import com.example.blog.po.Result;
import com.example.blog.po.StatusCode;
import com.example.blog.service.CurrentUser;
import com.example.blog.service.NotificationService;
import com.example.blog.vo.NotificationPageVO;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestAttribute;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

/**
 * 站内通知接口（均需登录，由 {@link UserAuthInterceptor} 保证）。
 */
@RestController
public class NotificationController {

    private final NotificationService notificationService;

    public NotificationController(NotificationService notificationService) {
        this.notificationService = notificationService;
    }

    @GetMapping("/notifications")
    public Result<NotificationPageVO> list(
            @RequestAttribute(UserAuthInterceptor.ATTR_CURRENT_USER) CurrentUser user,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "20") int size) {
        return new Result<>(true, StatusCode.OK, "获取通知列表成功", notificationService.page(user.id(), page, size));
    }

    @GetMapping("/notifications/unread-count")
    public Result<Map<String, Long>> unreadCount(
            @RequestAttribute(UserAuthInterceptor.ATTR_CURRENT_USER) CurrentUser user) {
        return new Result<>(true, StatusCode.OK, "获取未读通知数成功",
                Map.of("count", notificationService.unreadCount(user.id())));
    }

    @PostMapping("/notifications/{id}/read")
    public ResponseEntity<Result<Void>> markRead(
            @PathVariable Long id,
            @RequestAttribute(UserAuthInterceptor.ATTR_CURRENT_USER) CurrentUser user) {
        Notification notification = notificationService.findById(id);
        if (notification == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(new Result<>(false, StatusCode.ERROR, "通知不存在", null));
        }
        if (!user.id().equals(notification.getUserId())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(new Result<>(false, StatusCode.ACCESSERROR, "无权操作该通知", null));
        }

        notificationService.markRead(user.id(), id);
        return ResponseEntity.ok(new Result<>(true, StatusCode.OK, "已标记为已读", null));
    }

    @PostMapping("/notifications/read-all")
    public Result<Integer> readAll(
            @RequestAttribute(UserAuthInterceptor.ATTR_CURRENT_USER) CurrentUser user) {
        return new Result<>(true, StatusCode.OK, "全部标记已读成功", notificationService.markAllRead(user.id()));
    }
}
