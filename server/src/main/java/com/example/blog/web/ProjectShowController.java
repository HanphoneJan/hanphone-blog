package com.example.blog.web;

import com.example.blog.po.Project;
import com.example.blog.po.Result;
import com.example.blog.po.StatusCode;
import com.example.blog.service.ProjectService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;


@RestController
public class ProjectShowController {
    private final ProjectService projectService;

    public ProjectShowController(ProjectService projectService) {
        this.projectService = projectService;
    }

    @GetMapping("/projects")
    public Result<List<Project>> projects() {  // 明确指定泛型类型为 List<Project>
        return new Result<>(true, StatusCode.OK, "获取项目列表成功", projectService.listProject());
    }
}
