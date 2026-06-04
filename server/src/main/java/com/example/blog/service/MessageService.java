package com.example.blog.service;

import com.example.blog.po.Message;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;


public interface MessageService {
    List<Message> listMessage();

    Page<Message> listMessage(Pageable pageable);

    Message saveMessage(Message message);

    Message updateMessage(Long id, Message message);

    Message getMessageById(Long id);

    List<String> messageCountByMonth();

    Long count();

    void deleteMessage(Long id);
}