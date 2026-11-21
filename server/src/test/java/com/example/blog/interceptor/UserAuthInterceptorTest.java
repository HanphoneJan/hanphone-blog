package com.example.blog.interceptor;

import com.example.blog.service.CurrentUser;
import com.example.blog.service.CurrentUserService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class UserAuthInterceptorTest {

    private final CurrentUserService currentUserService = mock(CurrentUserService.class);
    private final UserAuthInterceptor interceptor = new UserAuthInterceptor(currentUserService, new ObjectMapper());

    @Test
    void optionsRequestPassesWithoutToken() throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest("OPTIONS", "/bookmarks");
        MockHttpServletResponse response = new MockHttpServletResponse();

        assertTrue(interceptor.preHandle(request, response, new Object()));
        assertEquals(200, response.getStatus());
        verify(currentUserService, never()).resolve(request);
    }

    @Test
    void missingUserReturns401Json() throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/notifications");
        MockHttpServletResponse response = new MockHttpServletResponse();
        when(currentUserService.resolve(request)).thenReturn(null);

        assertFalse(interceptor.preHandle(request, response, new Object()));
        assertEquals(401, response.getStatus());
        assertTrue(response.getContentAsString().contains("未登录"));
        assertNull(request.getAttribute(UserAuthInterceptor.ATTR_CURRENT_USER));
    }

    @Test
    void loggedInUserIsStoredOnRequest() throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/notifications");
        MockHttpServletResponse response = new MockHttpServletResponse();
        CurrentUser user = new CurrentUser(5L, true);
        when(currentUserService.resolve(request)).thenReturn(user);

        assertTrue(interceptor.preHandle(request, response, new Object()));
        assertEquals(user, request.getAttribute(UserAuthInterceptor.ATTR_CURRENT_USER));
    }
}
