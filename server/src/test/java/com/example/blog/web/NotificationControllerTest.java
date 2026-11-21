package com.example.blog.web;

import com.example.blog.enums.ContentType;
import com.example.blog.enums.NotificationType;
import com.example.blog.po.Notification;
import com.example.blog.po.Result;
import com.example.blog.service.CurrentUser;
import com.example.blog.service.NotificationService;
import com.example.blog.vo.NotificationPageVO;
import com.example.blog.vo.NotificationVO;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.util.Date;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class NotificationControllerTest {

    @Mock
    private NotificationService notificationService;

    private NotificationController controller;
    private final CurrentUser user = new CurrentUser(5L, false);

    @BeforeEach
    void setUp() {
        controller = new NotificationController(notificationService);
    }

    private Notification notification(Long id, Long userId) {
        Notification notification = new Notification();
        notification.setId(id);
        notification.setUserId(userId);
        notification.setType(NotificationType.BLOG_COMMENT);
        notification.setTargetType(ContentType.BLOG);
        notification.setTargetId(10L);
        notification.setCreateTime(new Date());
        return notification;
    }

    @Test
    void listReturnsPageFromService() {
        NotificationPageVO page = new NotificationPageVO(List.of(), 1, 20, 0, 0);
        when(notificationService.page(5L, 1, 20)).thenReturn(page);

        Result<NotificationPageVO> result = controller.list(user, 1, 20);

        assertTrue(result.isFlag());
        assertEquals(page, result.getData());
    }

    @Test
    void unreadCountWrapsCount() {
        when(notificationService.unreadCount(5L)).thenReturn(3L);

        Result<Map<String, Long>> result = controller.unreadCount(user);

        assertEquals(3L, result.getData().get("count"));
    }

    @Test
    void markReadMissingNotificationReturns404() {
        when(notificationService.findById(1L)).thenReturn(null);

        ResponseEntity<Result<Void>> response = controller.markRead(1L, user);

        assertEquals(HttpStatus.NOT_FOUND, response.getStatusCode());
        verify(notificationService, never()).markRead(5L, 1L);
    }

    @Test
    void markReadOtherUsersNotificationReturns403() {
        when(notificationService.findById(1L)).thenReturn(notification(1L, 7L));

        ResponseEntity<Result<Void>> response = controller.markRead(1L, user);

        assertEquals(HttpStatus.FORBIDDEN, response.getStatusCode());
        assertFalse(response.getBody().isFlag());
        verify(notificationService, never()).markRead(5L, 1L);
    }

    @Test
    void markReadOwnNotificationReturns200() {
        when(notificationService.findById(1L)).thenReturn(notification(1L, 5L));

        ResponseEntity<Result<Void>> response = controller.markRead(1L, user);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertTrue(response.getBody().isFlag());
        verify(notificationService).markRead(5L, 1L);
    }

    @Test
    void readAllReturnsUpdatedCount() {
        when(notificationService.markAllRead(5L)).thenReturn(4);

        Result<Integer> result = controller.readAll(user);

        assertEquals(4, result.getData());
    }

    @Test
    void blogNotificationUrlPointsToBlogDetail() {
        Notification notification = notification(1L, 5L);
        notification.setTargetType(ContentType.BLOG);
        notification.setTargetId(42L);

        NotificationVO vo = NotificationVO.from(notification);

        assertEquals("/blog/42/", vo.getUrl());
        assertEquals(NotificationType.BLOG_COMMENT, vo.getType());
    }

    @Test
    void essayNotificationUrlUsesHash() {
        Notification notification = notification(1L, 5L);
        notification.setTargetType(ContentType.ESSAY);
        notification.setTargetId(43L);

        assertEquals("/essays/#43", NotificationVO.from(notification).getUrl());
    }
}
