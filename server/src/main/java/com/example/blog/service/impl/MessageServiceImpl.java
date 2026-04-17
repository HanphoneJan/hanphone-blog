package com.example.blog.service.impl;

import com.example.blog.dao.MessageRepository;
import com.example.blog.po.Message;
import com.example.blog.service.MessageService;
import com.example.blog.util.MyBeanUtils;
import org.springframework.beans.BeanUtils;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.Date;
import java.util.List;
import java.util.Objects;

@Service
public class MessageServiceImpl implements MessageService {
    private final MessageRepository messageRepository;

    // 构造函数注入时校验依赖非空
    public MessageServiceImpl(MessageRepository messageRepository) {
        this.messageRepository = Objects.requireNonNull(messageRepository, "messageRepository must not be null");
    }

    @Override
    public List<Message> listMessage() {
        try {
            return messageRepository.findAll();
        } catch (Exception e) {
            throw new RuntimeException("Failed to get message list", e);
        }
    }

    @Override
    public void deleteMessage(Long id) {
        Objects.requireNonNull(id, "message id must not be null");
        try {
            messageRepository.deleteById(id);
        } catch (Exception e) {
            throw new RuntimeException("Failed to delete message with id: " + id, e);
        }
    }

    @Override
    public Message saveMessage(Message message) {
        Objects.requireNonNull(message, "message must not be null");
        try {
            message.setCreateTime(new Date());
            return messageRepository.save(message);
        } catch (Exception e) {
            throw new RuntimeException("Failed to save message", e);
        }
    }

    @Override
    public Message updateMessage(Long id, Message message) {
        Objects.requireNonNull(id, "message id must not be null");
        Objects.requireNonNull(message, "message must not be null");
        try {
            Message m = messageRepository.getOne(id);
            Objects.requireNonNull(m, "message with id: " + id + " not found");

            BeanUtils.copyProperties(message, m, MyBeanUtils.getNullPropertyNames(message));
            return messageRepository.save(m);
        } catch (Exception e) {
            throw new RuntimeException("Failed to update message with id: " + id, e);
        }
    }

    @Override
    public List<String> messageCountByMonth() {
        try {
            List<String> result = messageRepository.MessageCountByMonth();
            // JDK8兼容处理：如果结果为null则返回空集合
            return result != null ? result : new ArrayList<>();
        } catch (Exception e) {
            throw new RuntimeException("Failed to get message count by month", e);
        }
    }

    @Override
    public Message getMessageById(Long id) {
        Objects.requireNonNull(id, "message id must not be null");
        try {
            Message message = messageRepository.getOne(id);
            Objects.requireNonNull(message, "message with id: " + id + " not found");
            return message;
        } catch (Exception e) {
            throw new RuntimeException("Failed to get message with id: " + id, e);
        }
    }
}