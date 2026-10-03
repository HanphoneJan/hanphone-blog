package com.example.blog.service.impl;

import com.example.blog.dao.ProjectRepository;
import com.example.blog.po.Project;
import com.example.blog.service.AdminFileService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;

import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ProjectServiceImplTest {

    @Mock
    private ProjectRepository projectRepository;

    @Mock
    private AdminFileService adminFileService;

    private ProjectServiceImpl service;

    @BeforeEach
    void setUp() {
        service = new ProjectServiceImpl(projectRepository, adminFileService);
    }

    private Project projectWithPic(String picUrl) {
        Project project = new Project();
        project.setId(9L);
        project.setPic_url(picUrl);
        return project;
    }

    @Test
    void deleteProject_syncDeleteImageTrue_reclaimsPhysicalFile() {
        when(projectRepository.findById(9L)).thenReturn(Optional.of(projectWithPic("https://hanphone.top/blog%2Fproject%2Fdemo.jpeg")));

        service.deleteProject(9L, true);

        verify(projectRepository).deleteById(9L);
        verify(adminFileService).deleteManagedFiles(List.of("https://hanphone.top/blog%2Fproject%2Fdemo.jpeg"));
    }

    @Test
    void deleteProject_syncDeleteImageFalse_onlyDeletesRecord() {
        when(projectRepository.findById(9L)).thenReturn(Optional.of(projectWithPic("https://hanphone.top/blog%2Fproject%2Fdemo.jpeg")));

        service.deleteProject(9L, false);

        verify(projectRepository).deleteById(9L);
        verifyNoInteractions(adminFileService);
    }

    @Test
    void deleteProject_withoutPicUrl_neverCallsFileService() {
        when(projectRepository.findById(9L)).thenReturn(Optional.of(projectWithPic(null)));

        service.deleteProject(9L, true);

        verify(projectRepository).deleteById(9L);
        verify(adminFileService, never()).deleteManagedFiles(anyList());
    }

    @Test
    void deleteProject_missingProject_doesNotTouchFileService() {
        when(projectRepository.findById(404L)).thenReturn(Optional.empty());

        service.deleteProject(404L, true);

        verify(projectRepository).deleteById(404L);
        verifyNoInteractions(adminFileService);
    }
}