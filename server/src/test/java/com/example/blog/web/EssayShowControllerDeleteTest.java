package com.example.blog.web;

import com.example.blog.enums.UserType;
import com.example.blog.po.Essay;
import com.example.blog.po.EssayComment;
import com.example.blog.po.Result;
import com.example.blog.po.User;
import com.example.blog.service.CurrentUser;
import com.example.blog.service.CurrentUserService;
import com.example.blog.service.EssayCommentService;
import com.example.blog.service.EssayService;
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
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class EssayShowControllerDeleteTest {

    @Mock
    private EssayService essayService;

    @Mock
    private UserService userService;

    @Mock
    private EssayCommentService essayCommentService;

    @Mock
    private CurrentUserService currentUserService;

    @Mock
    private NotificationService notificationService;

    private EssayShowController controller;
    private MockHttpServletRequest request;

    @BeforeEach
    void setUp() {
        controller = new EssayShowController(essayService, userService, essayCommentService, currentUserService,
                notificationService);
        request = new MockHttpServletRequest("DELETE", "/essays/comments/1");
    }

    private EssayComment commentOwnedBy(Long userId) {
        EssayComment essayComment = new EssayComment();
        essayComment.setId(1L);
        if (userId != null) {
            User user = new User();
            user.setId(userId);
            essayComment.setUser(user);
        }
        return essayComment;
    }

    @Test
    void deleteWithoutLoginReturns401() {
        when(currentUserService.resolve(request)).thenReturn(null);

        ResponseEntity<Result<Void>> response = controller.delete(1L, request);

        assertEquals(HttpStatus.UNAUTHORIZED, response.getStatusCode());
        verify(essayCommentService, never()).deleteEssayComment(anyLong());
    }

    @Test
    void deleteOwnCommentReturns200() {
        when(currentUserService.resolve(request)).thenReturn(new CurrentUser(5L, false));
        when(essayCommentService.findEssayCommentById(1L)).thenReturn(commentOwnedBy(5L));

        ResponseEntity<Result<Void>> response = controller.delete(1L, request);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertTrue(response.getBody().isFlag());
        verify(essayCommentService).deleteEssayComment(1L);
    }

    @Test
    void deleteOtherUsersCommentReturns403() {
        when(currentUserService.resolve(request)).thenReturn(new CurrentUser(5L, false));
        when(essayCommentService.findEssayCommentById(1L)).thenReturn(commentOwnedBy(7L));

        ResponseEntity<Result<Void>> response = controller.delete(1L, request);

        assertEquals(HttpStatus.FORBIDDEN, response.getStatusCode());
        verify(essayCommentService, never()).deleteEssayComment(anyLong());
    }

    @Test
    void adminCanDeleteOtherUsersComment() {
        when(currentUserService.resolve(request)).thenReturn(new CurrentUser(5L, true));
        when(essayCommentService.findEssayCommentById(1L)).thenReturn(commentOwnedBy(7L));

        ResponseEntity<Result<Void>> response = controller.delete(1L, request);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        verify(essayCommentService).deleteEssayComment(1L);
    }

    // ---------- 随笔评论 token 优先 ----------

    @Test
    void postWithoutLoginReturns401() {
        when(currentUserService.resolve(request)).thenReturn(null);
        MockHttpServletResponse response = new MockHttpServletResponse();

        Map<String, Object> body = new HashMap<>();
        body.put("content", "随笔评论");
        body.put("userId", 9L);

        Result<EssayComment> result = controller.post(1L, body, request, response);

        assertEquals(HttpStatus.UNAUTHORIZED.value(), response.getStatus());
        assertFalse(result.isFlag());
        verify(essayCommentService, never()).saveEssayComment(any(EssayComment.class));
    }

    @Test
    void postIgnoresBodyUserIdWhenTokenPresent() {
        when(currentUserService.resolve(request)).thenReturn(new CurrentUser(5L, false));
        User user = new User();
        user.setId(5L);
        user.setType(UserType.NORMAL.getCode());
        when(userService.findUserById(5L)).thenReturn(user);
        when(essayService.getEssayById(1L)).thenReturn(new Essay());
        when(essayCommentService.saveEssayComment(any(EssayComment.class)))
                .thenAnswer(inv -> inv.getArgument(0));
        MockHttpServletResponse response = new MockHttpServletResponse();

        Map<String, Object> body = new HashMap<>();
        body.put("content", "随笔评论");
        body.put("userId", 9L);

        Result<EssayComment> result = controller.post(1L, body, request, response);

        assertEquals(HttpStatus.OK.value(), response.getStatus());
        assertTrue(result.isFlag());
        assertEquals(5L, result.getData().getUser().getId());
        verify(userService, never()).findUserById(9L);
    }

    @Test
    void postPassesIdsToNotificationService() {
        when(currentUserService.resolve(request)).thenReturn(new CurrentUser(5L, false));
        User user = new User();
        user.setId(5L);
        user.setType(UserType.NORMAL.getCode());
        when(userService.findUserById(5L)).thenReturn(user);
        Essay essay = new Essay();
        essay.setId(1L);
        when(essayService.getEssayById(1L)).thenReturn(essay);
        EssayComment parent = new EssayComment();
        parent.setId(2L);
        when(essayCommentService.getEssayCommentById(2L)).thenReturn(parent);
        when(essayCommentService.saveEssayComment(any(EssayComment.class))).thenAnswer(inv -> {
            EssayComment saved = inv.getArgument(0);
            saved.setId(9L);
            return saved;
        });
        MockHttpServletResponse response = new MockHttpServletResponse();

        Map<String, Object> body = new HashMap<>();
        body.put("content", "回复");
        body.put("parentCommentId", 2L);

        controller.post(1L, body, request, response);

        // 只传 ID，父评论由通知服务在独立事务内加载
        verify(notificationService).onEssayComment(9L, 1L, 2L);
    }
}
