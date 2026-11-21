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
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.transaction.PlatformTransactionManager;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class NotificationServiceImplTest {

    @Mock
    private NotificationRepository notificationRepository;

    @Mock
    private CommentRepository commentRepository;

    @Mock
    private BlogRepository blogRepository;

    @Mock
    private EssayRepository essayRepository;

    @Mock
    private EssayCommentRepository essayCommentRepository;

    @Mock
    private PlatformTransactionManager transactionManager;

    private NotificationServiceImpl service;

    @BeforeEach
    void setUp() {
        service = new NotificationServiceImpl(notificationRepository, commentRepository, blogRepository,
                essayRepository, essayCommentRepository, transactionManager);
    }

    // ==================== 构造辅助 ====================

    private User user(Long id) {
        User user = new User();
        user.setId(id);
        return user;
    }

    private Blog blog(Long id, Long authorId) {
        Blog blog = new Blog();
        blog.setId(id);
        blog.setPublished(true);
        if (authorId != null) {
            blog.setUser(user(authorId));
        }
        return blog;
    }

    private Comment comment(Long id, Long userId, Blog blog, String content) {
        Comment comment = new Comment();
        comment.setId(id);
        comment.setUserId(userId);
        comment.setBlog(blog);
        comment.setContent(content);
        return comment;
    }

    private Essay essay(Long id, Long authorId) {
        Essay essay = new Essay();
        essay.setId(id);
        essay.setPublished(true);
        if (authorId != null) {
            essay.setUser(user(authorId));
        }
        return essay;
    }

    private EssayComment essayComment(Long id, Long userId, Essay essay, String content) {
        EssayComment comment = new EssayComment();
        comment.setId(id);
        comment.setEssay(essay);
        comment.setContent(content);
        if (userId != null) {
            comment.setUser(user(userId));
        }
        return comment;
    }

    /** 准备「已保存评论 + 内容 + 可选父评论」的仓库返回值 */
    private void stubBlogComment(Comment saved, Blog blog, Comment parent) {
        when(commentRepository.findById(saved.getId())).thenReturn(Optional.of(saved));
        when(blogRepository.findById(blog.getId())).thenReturn(Optional.of(blog));
        if (parent != null) {
            when(commentRepository.findById(parent.getId())).thenReturn(Optional.of(parent));
        }
    }

    private void stubEssayComment(EssayComment saved, Essay essay, EssayComment parent) {
        when(essayCommentRepository.findById(saved.getId())).thenReturn(Optional.of(saved));
        when(essayRepository.findById(essay.getId())).thenReturn(Optional.of(essay));
        if (parent != null) {
            when(essayCommentRepository.findById(parent.getId())).thenReturn(Optional.of(parent));
        }
    }

    private Notification savedNotification() {
        ArgumentCaptor<Notification> captor = ArgumentCaptor.forClass(Notification.class);
        verify(notificationRepository).save(captor.capture());
        return captor.getValue();
    }

    // ==================== 博客评论 ====================

    @Test
    void replyNotifiesParentAuthor() {
        Blog blog = blog(10L, 100L);
        Comment parent = comment(7L, 200L, blog, "父评论");
        Comment saved = comment(8L, 5L, blog, "回复");
        saved.setNickname("小明");
        saved.setAvatar("avatar.png");
        stubBlogComment(saved, blog, parent);

        service.onBlogComment(8L, 10L, 7L);

        Notification notification = savedNotification();
        assertEquals(200L, notification.getUserId());
        assertEquals(NotificationType.BLOG_COMMENT, notification.getType());
        assertEquals(ContentType.BLOG, notification.getTargetType());
        assertEquals(10L, notification.getTargetId());
        assertEquals(7L, notification.getParentId());
        assertEquals(5L, notification.getActorId());
        assertEquals("小明", notification.getActorName());
        assertEquals("avatar.png", notification.getActorAvatar());
        assertEquals("回复", notification.getExcerpt());
    }

    @Test
    void selfReplyDoesNotCreateNotification() {
        Blog blog = blog(10L, 100L);
        Comment parent = comment(7L, 5L, blog, "父评论");
        Comment saved = comment(8L, 5L, blog, "自己回自己");
        stubBlogComment(saved, blog, parent);

        service.onBlogComment(8L, 10L, 7L);

        verifyNoInteractions(notificationRepository);
    }

    @Test
    void topLevelCommentNotifiesContentAuthor() {
        Blog blog = blog(10L, 100L);
        Comment saved = comment(8L, 5L, blog, "顶级评论");
        stubBlogComment(saved, blog, null);

        service.onBlogComment(8L, 10L, null);

        Notification notification = savedNotification();
        assertEquals(100L, notification.getUserId());
        assertNull(notification.getParentId());
        assertEquals(ContentType.BLOG, notification.getTargetType());
    }

    @Test
    void anonymousParentFallsBackToContentAuthor() {
        Blog blog = blog(10L, 100L);
        Comment parent = comment(7L, null, blog, "匿名楼层");
        Comment saved = comment(8L, 5L, blog, "回复匿名");
        stubBlogComment(saved, blog, parent);

        service.onBlogComment(8L, 10L, 7L);

        Notification notification = savedNotification();
        assertEquals(100L, notification.getUserId());
        assertEquals(7L, notification.getParentId());
    }

    @Test
    void parentFromAnotherBlogDoesNotCreateNotification() {
        Blog current = blog(10L, 100L);
        Blog other = blog(11L, 100L);
        Comment parent = comment(7L, 200L, other, "别的文章下的评论");
        Comment saved = comment(8L, 5L, current, "回复");
        stubBlogComment(saved, current, parent);

        service.onBlogComment(8L, 10L, 7L);

        verifyNoInteractions(notificationRepository);
    }

    @Test
    void contentAuthorWithoutUserDoesNotCreateNotification() {
        Blog blog = blog(10L, null);
        Comment saved = comment(8L, 5L, blog, "顶级评论");
        when(commentRepository.findById(8L)).thenReturn(Optional.of(saved));
        when(blogRepository.findById(10L)).thenReturn(Optional.of(blog));

        service.onBlogComment(8L, 10L, null);

        verifyNoInteractions(notificationRepository);
    }

    @Test
    void excerptStripsHtmlAndTruncates() {
        Blog blog = blog(10L, 100L);
        Comment saved = comment(8L, 5L, blog, "<p>你好 <strong>世界</strong></p>");
        stubBlogComment(saved, blog, null);

        service.onBlogComment(8L, 10L, null);

        assertEquals("你好 世界", savedNotification().getExcerpt());
    }

    @Test
    void blankContentProducesNullExcerpt() {
        Blog blog = blog(10L, 100L);
        Comment saved = comment(8L, 5L, blog, "<p>   </p>");
        stubBlogComment(saved, blog, null);

        service.onBlogComment(8L, 10L, null);

        assertNull(savedNotification().getExcerpt());
    }

    @Test
    void repositoryFailureIsSwallowed() {
        Blog blog = blog(10L, 100L);
        Comment saved = comment(8L, 5L, blog, "顶级评论");
        stubBlogComment(saved, blog, null);
        when(notificationRepository.save(any(Notification.class)))
                .thenThrow(new RuntimeException("db down"));

        assertDoesNotThrow(() -> service.onBlogComment(8L, 10L, null));
    }

    @Test
    void missingCommentIsIgnored() {
        when(commentRepository.findById(8L)).thenReturn(Optional.empty());

        assertDoesNotThrow(() -> service.onBlogComment(8L, 10L, null));
        verifyNoInteractions(notificationRepository);
    }

    @Test
    void missingBlogIsIgnored() {
        Comment saved = comment(8L, 5L, null, "评论");
        when(commentRepository.findById(8L)).thenReturn(Optional.of(saved));
        when(blogRepository.findById(10L)).thenReturn(Optional.empty());

        assertDoesNotThrow(() -> service.onBlogComment(8L, 10L, null));
        verifyNoInteractions(notificationRepository);
    }

    @Test
    void missingParentIsIgnored() {
        Blog blog = blog(10L, 100L);
        Comment saved = comment(8L, 5L, blog, "回复");
        when(commentRepository.findById(8L)).thenReturn(Optional.of(saved));
        when(blogRepository.findById(10L)).thenReturn(Optional.of(blog));
        when(commentRepository.findById(7L)).thenReturn(Optional.empty());

        assertDoesNotThrow(() -> service.onBlogComment(8L, 10L, 7L));
        verify(notificationRepository, never()).save(any());
    }

    @Test
    void nullIdsAreIgnored() {
        service.onBlogComment(null, 10L, null);
        service.onBlogComment(8L, null, null);

        verifyNoInteractions(notificationRepository, commentRepository, blogRepository);
    }

    // ==================== 随笔评论 ====================

    @Test
    void essayReplyNotifiesParentAuthor() {
        Essay essay = essay(20L, 100L);
        EssayComment parent = essayComment(3L, 200L, essay, "父评论");
        EssayComment saved = essayComment(4L, 5L, essay, "<p>回复</p>");
        saved.getUser().setNickname("小红");
        saved.getUser().setAvatar("red.png");
        stubEssayComment(saved, essay, parent);

        service.onEssayComment(4L, 20L, 3L);

        Notification notification = savedNotification();
        assertEquals(200L, notification.getUserId());
        assertEquals(NotificationType.ESSAY_COMMENT, notification.getType());
        assertEquals(ContentType.ESSAY, notification.getTargetType());
        assertEquals(20L, notification.getTargetId());
        assertEquals(3L, notification.getParentId());
        assertEquals(5L, notification.getActorId());
        assertEquals("小红", notification.getActorName());
    }

    @Test
    void essayTopLevelCommentNotifiesContentAuthor() {
        Essay essay = essay(20L, 100L);
        EssayComment saved = essayComment(4L, 5L, essay, "顶级评论");
        stubEssayComment(saved, essay, null);

        service.onEssayComment(4L, 20L, null);

        assertEquals(100L, savedNotification().getUserId());
    }

    @Test
    void essaySelfReplyDoesNotCreateNotification() {
        Essay essay = essay(20L, 100L);
        EssayComment parent = essayComment(3L, 5L, essay, "父评论");
        EssayComment saved = essayComment(4L, 5L, essay, "自己回自己");
        stubEssayComment(saved, essay, parent);

        service.onEssayComment(4L, 20L, 3L);

        verifyNoInteractions(notificationRepository);
    }

    @Test
    void essayAnonymousParentFallsBackToContentAuthor() {
        Essay essay = essay(20L, 100L);
        EssayComment parent = essayComment(3L, null, essay, "匿名父评论");
        EssayComment saved = essayComment(4L, 5L, essay, "回复");
        stubEssayComment(saved, essay, parent);

        service.onEssayComment(4L, 20L, 3L);

        assertEquals(100L, savedNotification().getUserId());
    }

    @Test
    void essayParentFromAnotherEssayDoesNotCreateNotification() {
        Essay current = essay(20L, 100L);
        Essay other = essay(21L, 100L);
        EssayComment parent = essayComment(3L, 200L, other, "别的随笔下的评论");
        EssayComment saved = essayComment(4L, 5L, current, "回复");
        stubEssayComment(saved, current, parent);

        service.onEssayComment(4L, 20L, 3L);

        verifyNoInteractions(notificationRepository);
    }

    @Test
    void essayMissingEntitiesAreIgnored() {
        when(essayCommentRepository.findById(4L)).thenReturn(Optional.empty());

        assertDoesNotThrow(() -> service.onEssayComment(4L, 20L, null));
        verifyNoInteractions(notificationRepository);
    }

    @Test
    void essayRepositoryFailureIsSwallowed() {
        Essay essay = essay(20L, 100L);
        EssayComment saved = essayComment(4L, 5L, essay, "顶级评论");
        stubEssayComment(saved, essay, null);
        when(notificationRepository.save(any(Notification.class)))
                .thenThrow(new RuntimeException("db down"));

        assertDoesNotThrow(() -> service.onEssayComment(4L, 20L, null));
    }
}
