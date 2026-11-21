package com.example.blog.web;

import com.example.blog.enums.BookmarkType;
import com.example.blog.interceptor.UserAuthInterceptor;
import com.example.blog.po.Result;
import com.example.blog.po.StatusCode;
import com.example.blog.service.BookmarkService;
import com.example.blog.service.CurrentUser;
import com.example.blog.vo.BookmarkItemVO;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestAttribute;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

/**
 * 收藏接口（均需登录，由 {@link UserAuthInterceptor} 保证）。
 */
@RestController
public class BookmarkController {

    private final BookmarkService bookmarkService;

    public BookmarkController(BookmarkService bookmarkService) {
        this.bookmarkService = bookmarkService;
    }

    @GetMapping("/bookmarks")
    public ResponseEntity<Result<List<BookmarkItemVO>>> list(
            @RequestAttribute(UserAuthInterceptor.ATTR_CURRENT_USER) CurrentUser user,
            @RequestParam(required = false) String type) {
        BookmarkType bookmarkType;
        try {
            bookmarkType = parseTypeOrNull(type);
        } catch (IllegalArgumentException e) {
            return badRequest(e.getMessage(), null);
        }
        return ResponseEntity.ok(new Result<>(true, StatusCode.OK, "获取收藏列表成功",
                bookmarkService.list(user.id(), bookmarkType)));
    }

    @GetMapping("/bookmarks/status")
    public ResponseEntity<Result<Map<String, Boolean>>> status(
            @RequestAttribute(UserAuthInterceptor.ATTR_CURRENT_USER) CurrentUser user,
            @RequestParam String type,
            @RequestParam String key) {
        BookmarkType bookmarkType;
        try {
            bookmarkType = parseType(type);
            return ResponseEntity.ok(new Result<>(true, StatusCode.OK, "获取收藏状态成功",
                    Map.of("bookmarked", bookmarkService.status(user.id(), bookmarkType, key))));
        } catch (IllegalArgumentException e) {
            return badRequest(e.getMessage(), null);
        }
    }

    @PostMapping("/bookmarks")
    public ResponseEntity<Result<Map<String, Boolean>>> add(
            @RequestAttribute(UserAuthInterceptor.ATTR_CURRENT_USER) CurrentUser user,
            @RequestBody Map<String, Object> body) {
        try {
            BookmarkType type = parseType(body.get("type") != null ? body.get("type").toString() : null);
            String key = body.get("key") != null ? body.get("key").toString() : null;
            if (key == null || key.trim().isEmpty()) {
                throw new IllegalArgumentException("收藏内容 key 不能为空");
            }
            bookmarkService.add(user.id(), type, key);
            return ResponseEntity.ok(new Result<>(true, StatusCode.OK, "收藏成功",
                    Map.of("bookmarked", true)));
        } catch (IllegalArgumentException e) {
            return badRequest(e.getMessage(), null);
        }
    }

    @DeleteMapping("/bookmarks/{type}/{key}")
    public ResponseEntity<Result<Map<String, Boolean>>> remove(
            @RequestAttribute(UserAuthInterceptor.ATTR_CURRENT_USER) CurrentUser user,
            @PathVariable String type,
            @PathVariable String key) {
        try {
            BookmarkType bookmarkType = parseType(type);
            bookmarkService.remove(user.id(), bookmarkType, key);
            return ResponseEntity.ok(new Result<>(true, StatusCode.OK, "取消收藏成功",
                    Map.of("bookmarked", false)));
        } catch (IllegalArgumentException e) {
            return badRequest(e.getMessage(), null);
        }
    }

    /**
     * 解析类型；{@code null} / 空串表示「全部」，非法值（如 PROJECT）抛 IllegalArgumentException。
     */
    private BookmarkType parseTypeOrNull(String type) {
        if (type == null || type.trim().isEmpty()) {
            return null;
        }
        return parseType(type);
    }

    private BookmarkType parseType(String type) {
        if (type == null || type.trim().isEmpty()) {
            throw new IllegalArgumentException("收藏类型不能为空");
        }
        try {
            return BookmarkType.valueOf(type.trim().toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new IllegalArgumentException("不支持的收藏类型：" + type);
        }
    }

    private <T> ResponseEntity<Result<T>> badRequest(String message, T data) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(new Result<>(false, StatusCode.ERROR, message, data));
    }
}
