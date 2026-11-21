package com.example.blog.service;

import com.example.blog.po.Notification;
import com.example.blog.vo.NotificationPageVO;

/**
 * 站内通知。
 *
 * <p>评论通知的写入绝不能影响评论本身：实现类外层方法不开启事务、异常只记日志，
 * 通知在独立事务中完成。为了让事务内的实体加载有效，触发侧只传 ID，
 * 由通知服务自己加载实体（父评论可能是 {@code getReferenceById} 的代理）。</p>
 */
public interface NotificationService {

    /**
     * 博客评论保存成功后写入通知。
     *
     * @param commentId 已保存的评论 ID
     * @param blogId    当前博客 ID
     * @param parentId  被回复的父评论 ID（顶级评论为 null）
     */
    void onBlogComment(Long commentId, Long blogId, Long parentId);

    /**
     * 随笔评论保存成功后写入通知。
     *
     * @param commentId 已保存的评论 ID
     * @param essayId   当前随笔 ID
     * @param parentId  被回复的父评论 ID（顶级评论为 null）
     */
    void onEssayComment(Long commentId, Long essayId, Long parentId);

    /**
     * 倒序分页查询当前用户的通知，并附带未读数。
     *
     * @param page 页码，从 1 开始（越界自动修正）
     * @param size 每页条数（限制在 1~100）
     */
    NotificationPageVO page(Long userId, int page, int size);

    /**
     * 当前用户未读通知数。
     */
    long unreadCount(Long userId);

    /**
     * 按 ID 查询通知（不存在返回 null）。
     */
    Notification findById(Long id);

    /**
     * 标记单条通知已读（只会更新属于该用户的记录）。
     */
    void markRead(Long userId, Long id);

    /**
     * 全部标记已读。
     *
     * @return 实际更新的条数
     */
    int markAllRead(Long userId);
}
