package com.example.blog.web;

import com.example.blog.enums.BookmarkType;
import com.example.blog.po.Result;
import com.example.blog.service.BookmarkService;
import com.example.blog.service.CurrentUser;
import com.example.blog.vo.BookmarkItemVO;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class BookmarkControllerTest {

    @Mock
    private BookmarkService bookmarkService;

    private BookmarkController controller;
    private final CurrentUser user = new CurrentUser(5L, false);

    @BeforeEach
    void setUp() {
        controller = new BookmarkController(bookmarkService);
    }

    @Test
    void listWithNoTypeReturnsAll() {
        when(bookmarkService.list(5L, null)).thenReturn(List.of());

        ResponseEntity<Result<List<BookmarkItemVO>>> response = controller.list(user, null);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertTrue(response.getBody().isFlag());
        verify(bookmarkService).list(5L, null);
    }

    @Test
    void listWithProjectTypeReturns400() {
        ResponseEntity<Result<List<BookmarkItemVO>>> response = controller.list(user, "PROJECT");

        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
        assertFalse(response.getBody().isFlag());
        verifyNoInteractions(bookmarkService);
    }

    @Test
    void statusReturnsBookmarked() {
        when(bookmarkService.status(5L, BookmarkType.BLOG, "12")).thenReturn(true);

        ResponseEntity<Result<Map<String, Boolean>>> response = controller.status(user, "BLOG", "12");

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals(Boolean.TRUE, response.getBody().getData().get("bookmarked"));
    }

    @Test
    void statusWithInvalidTypeReturns400() {
        ResponseEntity<Result<Map<String, Boolean>>> response = controller.status(user, "PROJECT", "12");

        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
        verifyNoInteractions(bookmarkService);
    }

    @Test
    void statusWithServiceKeyErrorReturns400() {
        when(bookmarkService.status(5L, BookmarkType.BLOG, "abc"))
                .thenThrow(new IllegalArgumentException("收藏内容 key 格式错误"));

        ResponseEntity<Result<Map<String, Boolean>>> response = controller.status(user, "BLOG", "abc");

        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
        assertFalse(response.getBody().isFlag());
    }

    @Test
    void addReturnsBookmarkedTrue() {
        ResponseEntity<Result<Map<String, Boolean>>> response = controller.add(user, body("BLOG", "12"));

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals(Boolean.TRUE, response.getBody().getData().get("bookmarked"));
        verify(bookmarkService).add(5L, BookmarkType.BLOG, "12");
    }

    @Test
    void addAcceptsLowercaseType() {
        controller.add(user, body("blog", "12"));

        verify(bookmarkService).add(5L, BookmarkType.BLOG, "12");
    }

    @Test
    void addWithMissingKeyReturns400() {
        ResponseEntity<Result<Map<String, Boolean>>> response = controller.add(user, body("BLOG", null));

        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
        verify(bookmarkService, never()).add(any(), any(), anyString());
    }

    @Test
    void addWithProjectTypeReturns400() {
        ResponseEntity<Result<Map<String, Boolean>>> response = controller.add(user, body("PROJECT", "12"));

        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
        verifyNoInteractions(bookmarkService);
    }

    @Test
    void addWithUnpublishedContentReturns400() {
        org.mockito.Mockito.doThrow(new IllegalArgumentException("博客不存在或已下线"))
                .when(bookmarkService).add(eq(5L), eq(BookmarkType.BLOG), eq("12"));

        ResponseEntity<Result<Map<String, Boolean>>> response = controller.add(user, body("BLOG", "12"));

        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
        assertFalse(response.getBody().isFlag());
    }

    @Test
    void removeReturnsBookmarkedFalse() {
        ResponseEntity<Result<Map<String, Boolean>>> response = controller.remove(user, "DOC", "doc-1");

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals(Boolean.FALSE, response.getBody().getData().get("bookmarked"));
        verify(bookmarkService).remove(5L, BookmarkType.DOC, "doc-1");
    }

    @Test
    void removeWithInvalidTypeReturns400() {
        ResponseEntity<Result<Map<String, Boolean>>> response = controller.remove(user, "PROJECT", "12");

        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
        verifyNoInteractions(bookmarkService);
    }

    private Map<String, Object> body(String type, String key) {
        Map<String, Object> body = new HashMap<>();
        body.put("type", type);
        body.put("key", key);
        return body;
    }
}
