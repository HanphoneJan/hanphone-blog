package com.example.blog.service.impl;

import com.example.blog.dao.MessageRepository;
import com.example.blog.po.Message;
import com.example.blog.service.MessageService;
import com.example.blog.util.MyBeanUtils;
import org.springframework.beans.BeanUtils;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;

import java.util.ArrayList;
import java.util.Date;
import java.util.List;
import java.util.Objects;

import static java.util.Objects.requireNonNull;

@Service
public class MessageServiceImpl implements MessageService {
    private static final int MAX_LIST_SIZE = 200;

    private final MessageRepository messageRepository;

    // 构造函数注入时校验依赖非空
    public MessageServiceImpl(MessageRepository messageRepository) {
        this.messageRepository = Objects.requireNonNull(messageRepository, "messageRepository must not be null");
    }

    @Override
    public List<Message> listMessage() {
        try {
            // 限制最大返回数量，避免全表查询拖垮性能
            Pageable limit = PageRequest.of(0, MAX_LIST_SIZE, Sort.by(Sort.Direction.DESC, "createTime"));
            return messageRepository.findAll(limit).getContent();
        } catch (Exception e) {
            throw new RuntimeException("Failed to get message list", e);
        }
    }

    @Override
    public Page<Message> listMessage(Pageable pageable) {
        requireNonNull(pageable, "pageable must not be null");
        try {
            return messageRepository.findAll(pageable);
        } catch (Exception e) {
            throw new RuntimeException("Failed to get message list with pageable", e);
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
            Message m = messageRepository.getReferenceById(id);
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
            Message message = messageRepository.getReferenceById(id);
            Objects.requireNonNull(message, "message with id: " + id + " not found");
            return message;
        } catch (Exception e) {
            throw new RuntimeException("Failed to get message with id: " + id, e);
        }
    }

    @Override
    public Long count() {
        try {
            return messageRepository.count();
        } catch (Exception e) {
            throw new RuntimeException("Failed to count messages", e);
        }
    }
}