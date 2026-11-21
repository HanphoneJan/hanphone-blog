package com.example.blog.web;

import com.example.blog.po.Message;
import com.example.blog.po.Result;
import com.example.blog.service.CurrentUser;
import com.example.blog.service.CurrentUserService;
import com.example.blog.service.MessageService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.mock.web.MockHttpServletRequest;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class MessageShowControllerDeleteTest {

    @Mock
    private MessageService messageService;

    @Mock
    private CurrentUserService currentUserService;

    private MessageShowController controller;
    private MockHttpServletRequest request;

    @BeforeEach
    void setUp() {
        controller = new MessageShowController(messageService, currentUserService);
        request = new MockHttpServletRequest("DELETE", "/messages/1");
    }

    @Test
    void deleteWithoutLoginReturns401() {
        when(currentUserService.resolve(request)).thenReturn(null);

        ResponseEntity<Result<Void>> response = controller.delete(1L, request);

        assertEquals(HttpStatus.UNAUTHORIZED, response.getStatusCode());
        verify(messageService, never()).deleteMessage(anyLong());
    }

    @Test
    void normalUserCannotDeleteMessage() {
        when(currentUserService.resolve(request)).thenReturn(new CurrentUser(5L, false));

        ResponseEntity<Result<Void>> response = controller.delete(1L, request);

        assertEquals(HttpStatus.FORBIDDEN, response.getStatusCode());
        verify(messageService, never()).findMessageById(anyLong());
        verify(messageService, never()).deleteMessage(anyLong());
    }

    @Test
    void adminCanDeleteMessage() {
        when(currentUserService.resolve(request)).thenReturn(new CurrentUser(5L, true));
        when(messageService.findMessageById(1L)).thenReturn(new Message());

        ResponseEntity<Result<Void>> response = controller.delete(1L, request);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertTrue(response.getBody().isFlag());
        verify(messageService).deleteMessage(1L);
    }

    @Test
    void deleteMissingMessageReturns404() {
        when(currentUserService.resolve(request)).thenReturn(new CurrentUser(5L, true));
        when(messageService.findMessageById(1L)).thenReturn(null);

        ResponseEntity<Result<Void>> response = controller.delete(1L, request);

        assertEquals(HttpStatus.NOT_FOUND, response.getStatusCode());
        verify(messageService, never()).deleteMessage(anyLong());
    }
}
