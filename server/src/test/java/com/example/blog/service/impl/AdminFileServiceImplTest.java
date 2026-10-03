package com.example.blog.service.impl;

import com.example.blog.service.AdminFileService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.boot.web.client.RestTemplateBuilder;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.client.RestTemplate;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class AdminFileServiceImplTest {

    private static final String BASE_URL = "https://hanphone.top";

    private RestTemplate restTemplate;
    private AdminFileService service;

    @BeforeEach
    void setUp() {
        service = new AdminFileServiceImpl(new RestTemplateBuilder());
        restTemplate = mock(RestTemplate.class);
        ReflectionTestUtils.setField(service, "restTemplate", restTemplate);
        ReflectionTestUtils.setField(service, "fileServiceBaseUrl", BASE_URL);
        ReflectionTestUtils.setField(service, "internalApiKey", "test-key");
    }

    @Test
    void isManagedFileUrl_acceptsBlogNamespace() {
        assertTrue(service.isManagedFileUrl(BASE_URL + "/blog%2Fproject%2Fdemo.jpeg"));
        assertTrue(service.isManagedFileUrl(BASE_URL + "/blog/project/demo.jpeg"));
        assertTrue(service.isManagedFileUrl(BASE_URL + "/blog/essay/标题/图片.png"));
        assertTrue(service.isManagedFileUrl(BASE_URL + "/blog/type/java.jpeg"));
    }

    @Test
    void isManagedFileUrl_rejectsExternalAndRootPaths() {
        assertFalse(service.isManagedFileUrl("https://example.com/blog/project/demo.jpeg"));
        assertFalse(service.isManagedFileUrl("https://hanphone.top/images/zhuxun.jpg"));
        // blog 根目录本身不是文件，不允许被当成可删目标
        assertFalse(service.isManagedFileUrl(BASE_URL + "/blog"));
        assertFalse(service.isManagedFileUrl(BASE_URL + "/blog/"));
        assertFalse(service.isManagedFileUrl(null));
    }

    @Test
    void deleteManagedFiles_callsFileServiceForManagedUrl() {
        when(restTemplate.exchange(any(), eq(org.springframework.http.HttpMethod.DELETE), any(), eq(String.class)))
                .thenReturn(ResponseEntity.status(HttpStatus.OK).body("ok"));

        service.deleteManagedFiles(List.of(BASE_URL + "/blog%2Fproject%2Fdemo.jpeg"));

        ArgumentCaptor<HttpEntity<Map<String, Object>>> captor = ArgumentCaptor.forClass(HttpEntity.class);
        // 1 次删文件 + 1 次尝试清理空目录 blog/project
        verify(restTemplate, times(2))
                .exchange(any(), eq(org.springframework.http.HttpMethod.DELETE), captor.capture(), eq(String.class));

        List<Map<String, Object>> bodies = captor.getAllValues().stream().map(HttpEntity::getBody).toList();
        assertTrue(bodies.stream().anyMatch(body -> "demo.jpeg".equals(body.get("name"))
                && "blog/project".equals(body.get("namespace"))));
        assertTrue(bodies.stream().anyMatch(body -> "project".equals(body.get("name"))
                && "blog".equals(body.get("namespace"))));
    }

    @Test
    void deleteManagedFiles_skipsExternalUrl() {
        service.deleteManagedFiles(List.of("https://example.com/blog/project/demo.jpeg"));

        verify(restTemplate, never())
                .exchange(any(), eq(org.springframework.http.HttpMethod.DELETE), any(), eq(String.class));
    }

    @Test
    void isManagedEssayFileUrl_onlyAcceptsEssayNamespace() {
        assertTrue(service.isManagedEssayFileUrl(BASE_URL + "/blog%2Fessay%2Fa.png"));
        assertFalse(service.isManagedEssayFileUrl(BASE_URL + "/blog%2Fproject%2Fdemo.jpeg"));
    }

    /** 编译期确认接口契约：调用方按接口类型使用 */
    @SuppressWarnings("unused")
    private AdminFileService contract() {
        return service;
    }
}