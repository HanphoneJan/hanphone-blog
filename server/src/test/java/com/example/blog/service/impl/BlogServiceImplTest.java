package com.example.blog.service.impl;

import com.example.blog.dao.BlogRepository;
import com.example.blog.dao.UserBlogLikeRepository;
import com.example.blog.dao.UserRepository;
import com.example.blog.po.Blog;
import com.example.blog.po.Type;
import com.example.blog.service.AdminFileService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;

import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class BlogServiceImplTest {

    private static final String COVER = "https://hanphone.top/blog%2Fblogs%2Fcover.jpeg";
    private static final String TYPE_PIC = "https://hanphone.top/blog%2Ftype%2Fjava.jpeg";

    @Mock
    private BlogRepository blogRepository;

    @Mock
    private UserBlogLikeRepository userBlogLikeRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private AdminFileService adminFileService;

    private BlogServiceImpl service;

    @BeforeEach
    void setUp() {
        service = new BlogServiceImpl(blogRepository, userBlogLikeRepository, userRepository, adminFileService);
    }

    private Blog blogWithCover(String cover, Type type) {
        Blog blog = new Blog();
        blog.setId(5L);
        blog.setFirstPicture(cover);
        blog.setType(type);
        return blog;
    }

    private Type typeWithPic(String picUrl) {
        Type type = new Type();
        type.setId(1L);
        type.setPic_url(picUrl);
        return type;
    }

    @Test
    void deleteBlog_syncDeleteImageTrue_reclaimsCover() {
        when(blogRepository.findById(5L)).thenReturn(Optional.of(blogWithCover(COVER, typeWithPic(TYPE_PIC))));

        service.deleteBlog(5L, true);

        verify(blogRepository).deleteById(5L);
        verify(adminFileService).deleteManagedFiles(List.of(COVER));
    }

    @Test
    void deleteBlog_syncDeleteImageFalse_onlyDeletesRecord() {
        when(blogRepository.findById(5L)).thenReturn(Optional.of(blogWithCover(COVER, typeWithPic(TYPE_PIC))));

        service.deleteBlog(5L, false);

        verify(blogRepository).deleteById(5L);
        verifyNoInteractions(adminFileService);
    }

    @Test
    void deleteBlog_coverInheritedFromType_keepsSharedImage() {
        when(blogRepository.findById(5L))
                .thenReturn(Optional.of(blogWithCover(TYPE_PIC, typeWithPic(TYPE_PIC))));

        service.deleteBlog(5L, true);

        verify(blogRepository).deleteById(5L);
        verify(adminFileService, never()).deleteManagedFiles(List.of(TYPE_PIC));
    }

    @Test
    void deleteBlog_withoutCover_neverCallsFileService() {
        when(blogRepository.findById(5L)).thenReturn(Optional.of(blogWithCover(null, null)));

        service.deleteBlog(5L, true);

        verify(blogRepository).deleteById(5L);
        verifyNoInteractions(adminFileService);
    }
}