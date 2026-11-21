package com.example.blog.enums;

/**
 * 站内通知类型。
 *
 * <p>目前只有评论类通知，不包含邮件 / FCM 推送。</p>
 */
public enum NotificationType {
    /**
     * 博客评论（含回复）
     */
    BLOG_COMMENT,

    /**
     * 随笔评论（含回复）
     */
    ESSAY_COMMENT
}
