package com.example.blog.web;

import com.example.blog.enums.UserType;
import com.example.blog.po.Blog;
import com.example.blog.po.Comment;
import com.example.blog.po.Result;
import com.example.blog.po.User;
import com.example.blog.service.BlogService;
import com.example.blog.service.CommentService;
import com.example.blog.service.CurrentUser;
import com.example.blog.service.CurrentUserService;
import com.example.blog.service.NotificationService;
import com.example.blog.service.UserService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

import java.util.HashMap;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class CommentControllerAuthTest {

    @Mock
    private CommentService commentService;

    @Mock
    private BlogService blogService;

    @Mock
    private UserService userService;

    @Mock
    private CurrentUserService currentUserService;

    @Mock
    private NotificationService notificationService;

    private CommentController controller;
    private MockHttpServletRequest request;
    private MockHttpServletResponse httpResponse;

    @BeforeEach
    void setUp() {
        controller = new CommentController(commentService, blogService, userService, currentUserService, notificationService);
        request = new MockHttpServletRequest("DELETE", "/comments/1");
        httpResponse = new MockHttpServletResponse();
    }

    private Comment commentOwnedBy(Long userId) {
        Comment comment = new Comment();
        comment.setId(1L);
        comment.setUserId(userId);
        return comment;
    }

    // ---------- 删除评论鉴权 ----------

    @Test
    void deleteWithoutLoginReturns401() {
        when(currentUserService.resolve(request)).thenReturn(null);

        ResponseEntity<Result<Void>> response = controller.delete(1L, request);

        assertEquals(HttpStatus.UNAUTHORIZED, response.getStatusCode());
        verify(commentService, never()).findCommentById(anyLong());
        verify(commentService, never()).deleteComment(anyLong());
    }

    @Test
    void deleteOtherUsersCommentReturns403() {
        when(currentUserService.resolve(request)).thenReturn(new CurrentUser(5L, false));
        when(commentService.findCommentById(1L)).thenReturn(commentOwnedBy(7L));

        ResponseEntity<Result<Void>> response = controller.delete(1L, request);

        assertEquals(HttpStatus.FORBIDDEN, response.getStatusCode());
        verify(commentService, never()).deleteComment(anyLong());
    }

    @Test
    void deleteOwnCommentReturns200() {
        when(currentUserService.resolve(request)).thenReturn(new CurrentUser(5L, false));
        when(commentService.findCommentById(1L)).thenReturn(commentOwnedBy(5L));

        ResponseEntity<Result<Void>> response = controller.delete(1L, request);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertTrue(response.getBody().isFlag());
        verify(commentService).deleteComment(1L);
    }

    @Test
    void adminCanDeleteAnyComment() {
        when(currentUserService.resolve(request)).thenReturn(new CurrentUser(5L, true));
        when(commentService.findCommentById(1L)).thenReturn(commentOwnedBy(7L));

        ResponseEntity<Result<Void>> response = controller.delete(1L, request);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        verify(commentService).deleteComment(1L);
    }

    @Test
    void anonymousCommentCanOnlyBeDeletedByAdmin() {
        when(currentUserService.resolve(request)).thenReturn(new CurrentUser(5L, false));
        when(commentService.findCommentById(1L)).thenReturn(commentOwnedBy(null));

        ResponseEntity<Result<Void>> response = controller.delete(1L, request);

        assertEquals(HttpStatus.FORBIDDEN, response.getStatusCode());
        verify(commentService, never()).deleteComment(anyLong());
    }

    @Test
    void adminCanDeleteAnonymousComment() {
        when(currentUserService.resolve(request)).thenReturn(new CurrentUser(5L, true));
        when(commentService.findCommentById(1L)).thenReturn(commentOwnedBy(null));

        ResponseEntity<Result<Void>> response = controller.delete(1L, request);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        verify(commentService).deleteComment(1L);
    }

    @Test
    void deleteMissingCommentReturns404() {
        when(currentUserService.resolve(request)).thenReturn(new CurrentUser(5L, false));
        when(commentService.findCommentById(1L)).thenReturn(null);

        ResponseEntity<Result<Void>> response = controller.delete(1L, request);

        assertEquals(HttpStatus.NOT_FOUND, response.getStatusCode());
        verify(commentService, never()).deleteComment(anyLong());
    }

    // ---------- 评论作者 token 优先 ----------

    private Map<String, Object> commentBody() {
        Map<String, Object> body = new HashMap<>();
        body.put("content", "测试评论");
        body.put("blogId", 1L);
        return body;
    }

    @Test
    void postUsesTokenUserIdAndIgnoresBodyUserId() {
        when(currentUserService.resolve(request)).thenReturn(new CurrentUser(5L, false));
        Blog blog = new Blog();
        blog.setId(1L);
        blog.setPublished(true);
        when(blogService.getBlog(1L)).thenReturn(blog);

        User user = new User();
        user.setId(5L);
        user.setNickname("token-user");
        user.setEmail("token@example.com");
        user.setAvatar("avatar");
        user.setType(UserType.NORMAL.getCode());
        when(userService.findUserById(5L)).thenReturn(user);
        when(commentService.saveComment(any(Comment.class))).thenAnswer(inv -> inv.getArgument(0));

        Map<String, Object> body = commentBody();
        body.put("userId", 9L);

        Result<Comment> result = controller.post(body, request, httpResponse);

        assertTrue(result.isFlag());
        assertEquals(5L, result.getData().getUserId());
        assertEquals("token-user", result.getData().getNickname());
        verify(userService).findUserById(5L);
        verify(userService, never()).findUserById(9L);
    }

    @Test
    void postWithInvalidTokenHeaderReturns401AndDoesNotSave() {
        request.addHeader("token", "expired-or-invalid-token");
        when(currentUserService.resolve(request)).thenReturn(null);

        Map<String, Object> body = commentBody();
        body.put("nickname", "匿名用户");
        body.put("email", "anon@example.com");

        Result<Comment> result = controller.post(body, request, httpResponse);

        assertEquals(HttpStatus.UNAUTHORIZED.value(), httpResponse.getStatus());
        assertFalse(result.isFlag());
        verify(commentService, never()).saveComment(any(Comment.class));
    }

    @Test
    void postWithValidTokenButMissingUserReturns401() {
        when(currentUserService.resolve(request)).thenReturn(new CurrentUser(5L, false));
        Blog blog = new Blog();
        blog.setId(1L);
        blog.setPublished(true);
        when(blogService.getBlog(1L)).thenReturn(blog);
        when(userService.findUserById(5L)).thenReturn(null);

        Result<Comment> result = controller.post(commentBody(), request, httpResponse);

        assertEquals(HttpStatus.UNAUTHORIZED.value(), httpResponse.getStatus());
        assertFalse(result.isFlag());
        verify(commentService, never()).saveComment(any(Comment.class));
    }

    @Test
    void postWithoutTokenIgnoredBodyUserIdAndSavesAnonymous() {
        when(currentUserService.resolve(request)).thenReturn(null);
        Blog blog = new Blog();
        blog.setId(1L);
        blog.setPublished(true);
        when(blogService.getBlog(1L)).thenReturn(blog);
        when(commentService.saveComment(any(Comment.class))).thenAnswer(inv -> inv.getArgument(0));

        Map<String, Object> body = commentBody();
        body.put("userId", 9L);
        body.put("nickname", "匿名用户");
        body.put("email", "anon@example.com");

        Result<Comment> result = controller.post(body, request, httpResponse);

        assertEquals(HttpStatus.OK.value(), httpResponse.getStatus());
        assertTrue(result.isFlag());
        assertNull(result.getData().getUserId());
        assertEquals("匿名用户", result.getData().getNickname());
        verify(userService, never()).findUserById(anyLong());
    }

    @Test
    void postWithoutTokenAndWithoutNicknameIsRejected() {
        when(currentUserService.resolve(request)).thenReturn(null);
        Blog blog = new Blog();
        blog.setId(1L);
        blog.setPublished(true);
        when(blogService.getBlog(1L)).thenReturn(blog);

        Map<String, Object> body = commentBody();
        body.put("userId", 9L);

        Result<Comment> result = controller.post(body, request, httpResponse);

        assertFalse(result.isFlag());
        verify(commentService, never()).saveComment(any(Comment.class));
        verify(userService, never()).findUserById(anyLong());
    }

    @Test
    void postPassesIdsToNotificationService() {
        when(currentUserService.resolve(request)).thenReturn(null);
        Blog blog = new Blog();
        blog.setId(1L);
        blog.setPublished(true);
        when(blogService.getBlog(1L)).thenReturn(blog);
        Comment parent = new Comment();
        parent.setId(3L);
        when(commentService.getCommentById(3L)).thenReturn(parent);
        when(commentService.saveComment(any(Comment.class))).thenAnswer(inv -> {
            Comment saved = inv.getArgument(0);
            saved.setId(88L);
            return saved;
        });

        Map<String, Object> body = commentBody();
        body.put("parentId", 3L);
        body.put("nickname", "匿名用户");
        body.put("email", "anon@example.com");

        controller.post(body, request, httpResponse);

        // 只传 ID，父评论由通知服务在独立事务内加载
        verify(notificationService).onBlogComment(88L, 1L, 3L);
    }
}
