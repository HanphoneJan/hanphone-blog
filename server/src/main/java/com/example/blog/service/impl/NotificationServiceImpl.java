package com.example.blog.service.impl;

import com.example.blog.dao.BlogRepository;
import com.example.blog.dao.CommentRepository;
import com.example.blog.dao.EssayCommentRepository;
import com.example.blog.dao.EssayRepository;
import com.example.blog.dao.NotificationRepository;
import com.example.blog.enums.ContentType;
import com.example.blog.enums.NotificationType;
import com.example.blog.po.Blog;
import com.example.blog.po.Comment;
import com.example.blog.po.Essay;
import com.example.blog.po.EssayComment;
import com.example.blog.po.Notification;
import com.example.blog.po.User;
import com.example.blog.service.NotificationService;
import com.example.blog.vo.NotificationPageVO;
import com.example.blog.vo.NotificationVO;
import org.jsoup.Jsoup;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;

import java.util.List;

@Service
public class NotificationServiceImpl implements NotificationService {

    private static final Logger log = LoggerFactory.getLogger(NotificationServiceImpl.class);

    /** 摘要最多保留的字符数 */
    private static final int EXCERPT_LENGTH = 80;

    private static final int MAX_PAGE_SIZE = 100;

    private final NotificationRepository notificationRepository;
    private final CommentRepository commentRepository;
    private final BlogRepository blogRepository;
    private final EssayRepository essayRepository;
    private final EssayCommentRepository essayCommentRepository;
    private final TransactionTemplate requiresNewTransaction;

    public NotificationServiceImpl(NotificationRepository notificationRepository,
                                   CommentRepository commentRepository,
                                   BlogRepository blogRepository,
                                   EssayRepository essayRepository,
                                   EssayCommentRepository essayCommentRepository,
                                   PlatformTransactionManager transactionManager) {
        this.notificationRepository = notificationRepository;
        this.commentRepository = commentRepository;
        this.blogRepository = blogRepository;
        this.essayRepository = essayRepository;
        this.essayCommentRepository = essayCommentRepository;
        // 用 TransactionTemplate 而不是 @Transactional 自调用：从本类内部调用时注解不会生效，
        // 这里显式声明 REQUIRES_NEW，确保通知写入永远不加入调用方事务。
        this.requiresNewTransaction = new TransactionTemplate(transactionManager);
        this.requiresNewTransaction.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);
    }

    // ==================== 评论触发 ====================

    @Override
    public void onBlogComment(Long commentId, Long blogId, Long parentId) {
        if (commentId == null || blogId == null) {
            return;
        }
        try {
            requiresNewTransaction.executeWithoutResult(status -> {
                // 实体加载与保存都放在独立事务内：父评论可能是 getReferenceById 的代理，
                // 在事务外访问 userId / user / essay 会抛 LazyInitializationException。
                Comment saved = commentRepository.findById(commentId).orElse(null);
                if (saved == null) {
                    log.debug("博客评论不存在，跳过通知: commentId={}", commentId);
                    return;
                }
                Blog blog = blogRepository.findById(blogId).orElse(null);
                if (blog == null) {
                    log.debug("博客不存在，跳过通知: blogId={}", blogId);
                    return;
                }
                Comment parent = null;
                if (parentId != null) {
                    parent = commentRepository.findById(parentId).orElse(null);
                    if (parent == null) {
                        log.debug("父评论不存在，跳过通知: parentId={}", parentId);
                        return;
                    }
                }
                saveBlogNotification(saved, parent, blog);
            });
        } catch (Exception e) {
            // 通知失败绝不能影响已保存的评论，也不能把评论事务标记为 rollback-only
            log.warn("写入博客评论通知失败（不影响评论）: blogId={}, commentId={}, error={}",
                    blogId, commentId, e.getMessage());
        }
    }

    @Override
    public void onEssayComment(Long commentId, Long essayId, Long parentId) {
        if (commentId == null || essayId == null) {
            return;
        }
        try {
            requiresNewTransaction.executeWithoutResult(status -> {
                EssayComment saved = essayCommentRepository.findById(commentId).orElse(null);
                if (saved == null) {
                    log.debug("随笔评论不存在，跳过通知: commentId={}", commentId);
                    return;
                }
                Essay essay = essayRepository.findById(essayId).orElse(null);
                if (essay == null) {
                    log.debug("随笔不存在，跳过通知: essayId={}", essayId);
                    return;
                }
                EssayComment parent = null;
                if (parentId != null) {
                    parent = essayCommentRepository.findById(parentId).orElse(null);
                    if (parent == null) {
                        log.debug("父评论不存在，跳过通知: parentId={}", parentId);
                        return;
                    }
                }
                saveEssayNotification(saved, parent, essay);
            });
        } catch (Exception e) {
            log.warn("写入随笔评论通知失败（不影响评论）: essayId={}, commentId={}, error={}",
                    essayId, commentId, e.getMessage());
        }
    }

    /**
     * 收件人规则：回复 → 父评论作者（匿名为空时回退内容作者）；顶级 → 内容作者；
     * 收件人为空或就是触发者时跳过；父评论不属于当前内容时不通知。
     */
    private void saveBlogNotification(Comment saved, Comment parent, Blog blog) {
        Long actorId = saved.getUserId();
        Long contentAuthorId = blog.getUser() != null ? blog.getUser().getId() : null;

        Long recipientId;
        if (parent != null) {
            if (!belongsToBlog(parent, blog)) {
                log.debug("父评论不属于当前博客，跳过通知: parentId={}, blogId={}", parent.getId(), blog.getId());
                return;
            }
            recipientId = parent.getUserId() != null ? parent.getUserId() : contentAuthorId;
        } else {
            recipientId = contentAuthorId;
        }

        if (recipientId == null || recipientId.equals(actorId)) {
            return;
        }

        Notification notification = new Notification();
        notification.setUserId(recipientId);
        notification.setType(NotificationType.BLOG_COMMENT);
        notification.setActorId(actorId);
        notification.setActorName(saved.getNickname());
        notification.setActorAvatar(saved.getAvatar());
        notification.setTargetType(ContentType.BLOG);
        notification.setTargetId(blog.getId());
        notification.setParentId(parent != null ? parent.getId() : null);
        notification.setExcerpt(excerpt(saved.getContent()));

        notificationRepository.save(notification);
    }

    private void saveEssayNotification(EssayComment saved, EssayComment parent, Essay essay) {
        User actor = saved.getUser();
        Long actorId = actor != null ? actor.getId() : null;
        Long contentAuthorId = essay.getUser() != null ? essay.getUser().getId() : null;

        Long recipientId;
        if (parent != null) {
            if (!belongsToEssay(parent, essay)) {
                log.debug("父评论不属于当前随笔，跳过通知: parentId={}, essayId={}", parent.getId(), essay.getId());
                return;
            }
            Long parentAuthorId = parent.getUser() != null ? parent.getUser().getId() : null;
            recipientId = parentAuthorId != null ? parentAuthorId : contentAuthorId;
        } else {
            recipientId = contentAuthorId;
        }

        if (recipientId == null || recipientId.equals(actorId)) {
            return;
        }

        Notification notification = new Notification();
        notification.setUserId(recipientId);
        notification.setType(NotificationType.ESSAY_COMMENT);
        notification.setActorId(actorId);
        notification.setActorName(actor != null ? actor.getNickname() : null);
        notification.setActorAvatar(actor != null ? actor.getAvatar() : null);
        notification.setTargetType(ContentType.ESSAY);
        notification.setTargetId(essay.getId());
        notification.setParentId(parent != null ? parent.getId() : null);
        notification.setExcerpt(excerpt(saved.getContent()));

        notificationRepository.save(notification);
    }

    private boolean belongsToBlog(Comment parent, Blog blog) {
        if (parent.getBlog() == null || parent.getBlog().getId() == null || blog.getId() == null) {
            return false;
        }
        return blog.getId().equals(parent.getBlog().getId());
    }

    private boolean belongsToEssay(EssayComment parent, Essay essay) {
        if (parent.getEssay() == null || parent.getEssay().getId() == null || essay.getId() == null) {
            return false;
        }
        return essay.getId().equals(parent.getEssay().getId());
    }

    /**
     * 评论正文去 HTML 后取前 {@value #EXCERPT_LENGTH} 字，空安全。
     */
    private String excerpt(String content) {
        if (content == null) {
            return null;
        }
        String text = Jsoup.parse(content).text().trim();
        if (text.isEmpty()) {
            return null;
        }
        return text.length() > EXCERPT_LENGTH ? text.substring(0, EXCERPT_LENGTH) : text;
    }

    // ==================== 查询 / 已读 ====================

    @Override
    public NotificationPageVO page(Long userId, int page, int size) {
        int safePage = Math.max(page, 1);
        int safeSize = Math.min(Math.max(size, 1), MAX_PAGE_SIZE);

        Page<Notification> result = notificationRepository
                .findByUserIdOrderByCreateTimeDesc(userId, PageRequest.of(safePage - 1, safeSize));
        List<NotificationVO> items = result.getContent().stream()
                .map(NotificationVO::from)
                .toList();

        return new NotificationPageVO(items, safePage, safeSize, result.getTotalElements(),
                notificationRepository.countUnread(userId));
    }

    @Override
    public long unreadCount(Long userId) {
        return notificationRepository.countUnread(userId);
    }

    @Override
    public Notification findById(Long id) {
        if (id == null) {
            return null;
        }
        return notificationRepository.findById(id).orElse(null);
    }

    @Override
    @Transactional
    public void markRead(Long userId, Long id) {
        if (userId == null || id == null) {
            return;
        }
        notificationRepository.findById(id).ifPresent(notification -> {
            if (userId.equals(notification.getUserId()) && !notification.isRead()) {
                notification.setRead(true);
                notificationRepository.save(notification);
            }
        });
    }

    @Override
    @Transactional
    public int markAllRead(Long userId) {
        if (userId == null) {
            return 0;
        }
        return notificationRepository.markAllRead(userId);
    }
}
