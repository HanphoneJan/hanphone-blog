package com.example.blog.vo;

import com.example.blog.enums.ContentType;
import com.example.blog.enums.NotificationType;
import com.example.blog.po.Notification;
import lombok.Data;

import java.util.Date;

/**
 * 单条通知。
 */
@Data
public class NotificationVO {

    private Long id;
    private NotificationType type;
    private Long actorId;
    private String actorName;
    private String actorAvatar;
    private ContentType targetType;
    private Long targetId;
    private Long parentId;
    private String excerpt;
    /** 前端跳转地址：博客 /blog/{id}/，随笔 /essays/#{id} */
    private String url;
    private boolean read;
    private Date createTime;

    public static NotificationVO from(Notification notification) {
        if (notification == null) {
            return null;
        }
        NotificationVO vo = new NotificationVO();
        vo.setId(notification.getId());
        vo.setType(notification.getType());
        vo.setActorId(notification.getActorId());
        vo.setActorName(notification.getActorName());
        vo.setActorAvatar(notification.getActorAvatar());
        vo.setTargetType(notification.getTargetType());
        vo.setTargetId(notification.getTargetId());
        vo.setParentId(notification.getParentId());
        vo.setExcerpt(notification.getExcerpt());
        vo.setUrl(buildUrl(notification.getTargetType(), notification.getTargetId()));
        vo.setRead(notification.isRead());
        vo.setCreateTime(notification.getCreateTime());
        return vo;
    }

    private static String buildUrl(ContentType targetType, Long targetId) {
        if (targetType == null || targetId == null) {
            return null;
        }
        return switch (targetType) {
            case BLOG -> "/blog/" + targetId + "/";
            case ESSAY -> "/essays/#" + targetId;
            default -> null;
        };
    }
}
