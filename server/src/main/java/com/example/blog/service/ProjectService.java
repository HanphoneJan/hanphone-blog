package com.example.blog.service;

import com.example.blog.po.Project;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;

public interface ProjectService {
    List<Project> listProject();

    Page<Project> listProject(Pageable pageable);

    Page<Project> listProjectByType(Integer type, Pageable pageable);

    List<Project> listRecommendProjectTop(Integer size);

    List<Project> listProjectByType(Integer type);

    Project getProject(Long id);

    Page<Project> listProject(String query, Pageable pageable);

    void deleteProject(Long id);

    Project saveProject(Project project);

    Project updateProject(Long id, Project project);

    Boolean changeRecommend(Long projectId, Boolean recommend);
}
