package com.example.blog.service.impl;

import com.example.blog.dao.BlogRepository;
import com.example.blog.dao.TypeRepository;
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
class TypeServiceImplTest {

    private static final String PIC_URL = "https://hanphone.top/blog%2Ftype%2Fjava.jpeg";

    @Mock
    private TypeRepository typeRepository;

    @Mock
    private BlogRepository blogRepository;

    @Mock
    private AdminFileService adminFileService;

    private TypeServiceImpl service;

    @BeforeEach
    void setUp() {
        service = new TypeServiceImpl(typeRepository, blogRepository, adminFileService);
    }

    private Type typeWithPic(String picUrl) {
        Type type = new Type();
        type.setId(3L);
        type.setName("Java");
        type.setPic_url(picUrl);
        return type;
    }

    @Test
    void deleteType_syncDeleteImageTrue_reclaimsPhysicalFile() {
        when(typeRepository.findById(3L)).thenReturn(Optional.of(typeWithPic(PIC_URL)));
        when(blogRepository.countByFirstPicture(PIC_URL)).thenReturn(0L);

        service.deleteType(3L, true);

        verify(typeRepository).deleteById(3L);
        verify(adminFileService).deleteManagedFiles(List.of(PIC_URL));
    }

    @Test
    void deleteType_syncDeleteImageFalse_onlyDeletesRecord() {
        when(typeRepository.findById(3L)).thenReturn(Optional.of(typeWithPic(PIC_URL)));

        service.deleteType(3L, false);

        verify(typeRepository).deleteById(3L);
        verifyNoInteractions(adminFileService);
    }

    @Test
    void deleteType_picStillUsedByBlog_keepsFile() {
        when(typeRepository.findById(3L)).thenReturn(Optional.of(typeWithPic(PIC_URL)));
        when(blogRepository.countByFirstPicture(PIC_URL)).thenReturn(2L);

        service.deleteType(3L, true);

        verify(typeRepository).deleteById(3L);
        verify(adminFileService, never()).deleteManagedFiles(List.of(PIC_URL));
    }

    @Test
    void deleteType_withoutPicUrl_neverCallsFileService() {
        when(typeRepository.findById(3L)).thenReturn(Optional.of(typeWithPic(null)));

        service.deleteType(3L, true);

        verify(typeRepository).deleteById(3L);
        verify(adminFileService, never()).deleteManagedFiles(List.of(""));
    }
}