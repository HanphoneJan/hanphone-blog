package com.example.blog.service.impl;

import com.example.blog.dao.ProjectRepository;
import com.example.blog.po.Project;
import com.example.blog.service.ProjectService;
import com.example.blog.util.MyBeanUtils;
import org.springframework.beans.BeanUtils;
import org.springframework.stereotype.Service;

import javax.transaction.Transactional;
import java.util.List;
import java.util.Objects;

import static java.util.Objects.requireNonNull;

@Service
public class ProjectServiceImpl implements ProjectService {

    private final ProjectRepository projectRepository;

    // 构造函数注入时校验依赖非空
    public ProjectServiceImpl(ProjectRepository projectRepository) {
        this.projectRepository = Objects.requireNonNull(projectRepository, "projectRepository must not be null");
    }

    @Override
    public List<Project> listProject() {
        try {
            return projectRepository.findAll();
        } catch (Exception e) {
            throw new RuntimeException("Failed to list projects", e);
        }
    }

    @Override
    public void deleteProject(Long id) {
        // 校验id非空
        Objects.requireNonNull(id, "id must not be null");
        try {
            projectRepository.deleteById(id);
        } catch (Exception e) {
            throw new RuntimeException("Failed to delete project with id: " + id, e);
        }
    }

    @Override
    public Project saveProject(Project project) {
        // 校验project非空
        Objects.requireNonNull(project, "project must not be null");
        try {
            return projectRepository.save(project);
        } catch (Exception e) {
            throw new RuntimeException("Failed to save project", e);
        }
    }

    @Override
    public Project updateProject(Long id, Project project) {
        // 校验参数非空
        Objects.requireNonNull(id, "id must not be null");
        Objects.requireNonNull(project, "project must not be null");

        try {
            Project p = projectRepository.getOne(id);
            // 校验查询结果非空
            Objects.requireNonNull(p, "Project not found with id: " + id);

            BeanUtils.copyProperties(project, p, MyBeanUtils.getNullPropertyNames(project));
            return projectRepository.save(p);
        } catch (Exception e) {
            throw new RuntimeException("Failed to update project with id: " + id, e);
        }
    }

    @Override
    @Transactional
    public Boolean changeRecommend(Long Id, Boolean recommend) {
        requireNonNull(Id, "project id must not be null");
        requireNonNull(recommend, "recommend flag must not be null");
        try {
            int affectedRows = projectRepository.updateRecommend(Id, recommend);
            return affectedRows > 0;
        } catch (Exception e) {
            throw new RuntimeException("Error changing recommend status for project: " + Id, e);
        }
    }
}