package com.example.blog.service;

import com.example.blog.po.Project;

import java.util.List;

public interface ProjectService {
    List<Project> listProject();

    void deleteProject(Long id);

    Project saveProject(Project project);

    Project updateProject(Long id,Project project);
    Boolean changeRecommend(Long projectId, Boolean recommend);
}
