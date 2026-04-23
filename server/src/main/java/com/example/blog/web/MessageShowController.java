package com.example.blog.web;

import com.example.blog.constants.CommonConstants;
import com.example.blog.po.Message;
import com.example.blog.po.Result;
import com.example.blog.po.StatusCode;
import com.example.blog.service.MessageService;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
public class MessageShowController {
    private final MessageService messageService;

    public MessageShowController(MessageService messageService) {
        this.messageService = messageService;
    }

    // 获取留言列表：支持可选分页
    @GetMapping("/messages")
    public Result<?> messages(
            @RequestParam(required = false) Integer page,
            @RequestParam(required = false) Integer pageSize) {
        try {
            if (page != null && pageSize != null) {
                Sort sort = Sort.by(Sort.Direction.DESC, "createTime");
                Pageable pageable = PageRequest.of(page - 1, pageSize, sort);
                return new Result<>(true, StatusCode.OK, "获取留言列表成功", messageService.listMessage(pageable));
            }
            return new Result<>(true, StatusCode.OK, "获取留言列表成功", messageService.listMessage());
        } catch (Exception e) {
            return new Result<>(false, StatusCode.ERROR, "获取留言列表失败: " + e.getMessage(), null);
        }
    }

    @PostMapping("/messages")
    public Result<Message> post(@RequestBody Map<String, Object> para) {
        try {
            Object messageObj = para.get("message");
            if (messageObj == null) {
                throw new IllegalArgumentException("参数中 message 字段不能为空");
            }
            if (!(messageObj instanceof Map)) {
                throw new IllegalArgumentException("message字段必须是Map类型");
            }
            @SuppressWarnings("unchecked")
            Map<String, Object> messageMap = (Map<String, Object>) messageObj;

            String content = (String) messageMap.get("content");
            content = (content == null) ? "" : content;

            String nickname = (String) messageMap.get("nickname");
            nickname = (nickname == null) ? "" : nickname;
            String avatar = (String) messageMap.get("avatar");
            avatar = (avatar == null) ? "" : avatar;

            Object parentIdObj = messageMap.get("parentId");
            long parentId = CommonConstants.DEFAULT_PARENT_ID;
            if (parentIdObj instanceof Number) {
                parentId = ((Number) parentIdObj).longValue();
            }

            Message message = new Message();
            message.setContent(content);
            message.setNickname(nickname);
            message.setAvatar(avatar);

            if (parentId != CommonConstants.DEFAULT_PARENT_ID) {
                message.setParentMessage(messageService.getMessageById(parentId));
            }

            Message newMessage = messageService.saveMessage(message);
            return new Result<>(true, StatusCode.OK, "操作成功", newMessage);
        } catch (Exception e) {
            return new Result<>(false, StatusCode.ERROR, "发表留言失败: " + e.getMessage(), null);
        }
    }

    // 删除留言：无返回数据，指定 Result<Void>
    @DeleteMapping("/messages/{id}")
    public Result<Void> delete(@PathVariable Long id) {
        try {
            messageService.deleteMessage(id);
            return new Result<>(true, StatusCode.OK, "删除评论成功", null);
        } catch (Exception e) {
            return new Result<>(false, StatusCode.ERROR, "删除评论失败: " + e.getMessage(), null);
        }
    }
}