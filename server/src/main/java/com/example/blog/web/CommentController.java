package com.example.blog.web;

import com.example.blog.annotation.Idempotent;
import com.example.blog.constants.CommonConstants;
import com.example.blog.enums.UserType;
import com.example.blog.po.Blog;
import com.example.blog.po.Comment;
import com.example.blog.po.Result;
import com.example.blog.po.StatusCode;
import com.example.blog.po.User;
import com.example.blog.service.BlogService;
import com.example.blog.service.CommentService;
import com.example.blog.service.CurrentUser;
import com.example.blog.service.CurrentUserService;
import com.example.blog.service.NotificationService;
import com.example.blog.service.UserService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
public class CommentController {
    private final CommentService commentService;
    private final BlogService blogService;
    private final UserService userService;
    private final CurrentUserService currentUserService;
    private final NotificationService notificationService;

    public CommentController(CommentService commentService, BlogService blogService, UserService userService,
                             CurrentUserService currentUserService, NotificationService notificationService) {
        this.commentService = commentService;
        this.blogService = blogService;
        this.userService = userService;
        this.currentUserService = currentUserService;
        this.notificationService = notificationService;
    }

    /**
     * 处理博客点赞/取消点赞请求
     */
    @PostMapping("/blog/{id}/like")
    public Result<Void> handleLike(@RequestBody Map<String, Object> requestData, @PathVariable String id) {
        try {
            Long userId = Long.valueOf(requestData.get("userId").toString());
            Long blogId = Long.valueOf(requestData.get("blogId").toString());
            boolean isLike = (Boolean) requestData.get("isLike");

            if (blogService.updateLikes(userId, blogId, isLike)) {
                return new Result<>(true, StatusCode.OK, "点赞成功");
            }
            return new Result<>(false, StatusCode.ERROR, "点赞失败");
        } catch (Exception e) {
            return new Result<>(false, StatusCode.ERROR, "点赞失败");
        }
    }

    //获取评论集合
    @GetMapping("/comments/{blogId}")
    public Result<List<Comment>> comments(@PathVariable Long blogId) {
        Blog blog = blogService.getBlog(blogId);
        if (!blog.isPublished()) {
            return new Result<>(false, StatusCode.ERROR, "博客不存在", null);
        }
        return new Result<>(true, StatusCode.OK, "获取博客评论成功", commentService.listCommentByBlogId(blogId));
    }

    @PostMapping("/comments")
    @Idempotent
    public Result<Comment> post(@RequestBody Map<String, Object> para, HttpServletRequest request,
                                HttpServletResponse response) {
        try {
            // 携带 token 但校验失败（过期/被吊销/伪造）时返回 401，
            // 让客户端触发静默刷新；只有完全没带 token 才按匿名评论处理。
            String tokenHeader = request.getHeader("token");
            boolean tokenPresent = tokenHeader != null && !tokenHeader.trim().isEmpty();
            CurrentUser currentUser = currentUserService.resolve(request);
            if (currentUser == null && tokenPresent) {
                response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
                return new Result<>(false, StatusCode.LOGINERROR, "登录状态已失效，请重新登录", null);
            }

            String content = (String) para.get("content");
            Long blogId = Long.parseLong(para.get("blogId").toString());

            // parentId 可选，默认 -1 表示顶级评论
            long parentId = para.get("parentId") != null
                    ? Long.parseLong(para.get("parentId").toString())
                    : CommonConstants.DEFAULT_PARENT_ID;

            Blog blog = blogService.getBlog(blogId);
            if (!blog.isPublished()) {
                return new Result<>(false, StatusCode.ERROR, "博客不存在", null);
            }
            Comment comment = new Comment();
            comment.setContent(content);
            comment.setBlog(blog);

            if (currentUser != null) {
                User user = userService.findUserById(currentUser.id());
                if (user == null) {
                    response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
                    return new Result<>(false, StatusCode.LOGINERROR, "登录状态已失效，请重新登录", null);
                }
                comment.setUserId(user.getId());
                comment.setNickname(user.getNickname());
                comment.setEmail(user.getEmail());
                comment.setAvatar(user.getAvatar());
                comment.setAdminComment(UserType.ADMIN.getCode().equals(user.getType()));
            } else {
                // 未登录用户：从请求中获取昵称和邮箱
                String nickname = para.get("nickname") != null ? para.get("nickname").toString().trim() : "";
                String email = para.get("email") != null ? para.get("email").toString().trim() : "";
                if (nickname.isEmpty() || email.isEmpty()) {
                    return new Result<>(false, StatusCode.ERROR, "昵称和邮箱不能为空", null);
                }
                comment.setNickname(nickname);
                comment.setEmail(email);
                comment.setAvatar((String) para.getOrDefault("avatar", ""));
            }

            if (parentId != CommonConstants.DEFAULT_PARENT_ID) {
                comment.setParentComment(commentService.getCommentById(parentId));
            }
            Comment newComment = commentService.saveComment(comment);
            // 只传 ID：父评论可能是 getReferenceById 的代理，由通知服务在独立事务内加载实体
            // 通知写入失败不影响评论（service 内部独立事务 + 只记日志）
            Long notifyParentId = parentId != CommonConstants.DEFAULT_PARENT_ID ? parentId : null;
            notificationService.onBlogComment(newComment.getId(), blog.getId(), notifyParentId);
            return new Result<>(true, StatusCode.OK, "评论发表成功！", newComment);
        } catch (NumberFormatException e) {
            return new Result<>(false, StatusCode.ERROR, "参数格式错误", null);
        } catch (Exception e) {
            return new Result<>(false, StatusCode.ERROR, "评论发表失败", null);
        }
    }

    //删除评论：本人或管理员；匿名评论（无 userId）仅管理员可删
    @DeleteMapping("/comments/{id}")
    public ResponseEntity<Result<Void>> delete(@PathVariable Long id, HttpServletRequest request) {
        CurrentUser currentUser = currentUserService.resolve(request);
        if (currentUser == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(new Result<>(false, StatusCode.LOGINERROR, "未登录或登录状态已失效，请重新登录", null));
        }

        Comment comment = commentService.findCommentById(id);
        if (comment == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(new Result<>(false, StatusCode.ERROR, "评论不存在", null));
        }

        boolean owner = comment.getUserId() != null && comment.getUserId().equals(currentUser.id());
        if (!owner && !currentUser.admin()) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(new Result<>(false, StatusCode.ACCESSERROR, "无权删除该评论", null));
        }

        try {
            commentService.deleteComment(id);
            return ResponseEntity.ok(new Result<>(true, StatusCode.OK, "删除评论成功", null));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new Result<>(false, StatusCode.ERROR, "删除评论失败", null));
        }
    }
}
