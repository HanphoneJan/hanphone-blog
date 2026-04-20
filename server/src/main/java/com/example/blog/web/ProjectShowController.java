package com.example.blog.web;

import com.example.blog.constants.PaginationConstants;
import com.example.blog.po.Project;
import com.example.blog.po.Result;
import com.example.blog.po.StatusCode;
import com.example.blog.service.ProjectService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.stream.Collectors;


@RestController
public class ProjectShowController {
    private final ProjectService projectService;

    public ProjectShowController(ProjectService projectService) {
        this.projectService = projectService;
    }

    @GetMapping("/getRecommendProjectList")
    public Result<List<Project>> getRecommendProjectList() {
        return new Result<>(true, StatusCode.OK, "获取推荐项目成功",
                projectService.listRecommendProjectTop(PaginationConstants.RECOMMEND_BLOG_SIZE));
    }

    @GetMapping("/projects")
    public Result<?> projects(
            @RequestParam(required = false) Integer type,
            @RequestParam(required = false) Integer page,
            @RequestParam(required = false) Integer pageSize) {
        // 如果传了分页参数，返回分页结果
        if (page != null && pageSize != null) {
            Sort sort = Sort.by(Sort.Direction.DESC, "id");
            Pageable pageable = PageRequest.of(page - 1, pageSize, sort);
            if (type != null) {
                return new Result<>(true, StatusCode.OK, "获取项目列表成功",
                        projectService.listProjectByType(type, pageable));
            }
            return new Result<>(true, StatusCode.OK, "获取项目列表成功",
                    projectService.listProject(pageable));
        }
        // 不传分页参数，返回列表
        if (type != null) {
            return new Result<>(true, StatusCode.OK, "获取项目列表成功",
                    projectService.listProjectByType(type));
        }
        // 前台接口过滤掉 type=0（不展示）的项目
        List<Project> projects = projectService.listProject();
        List<Project> filtered = projects.stream()
                .filter(p -> p.getType() != null && p.getType() != 0)
                .collect(Collectors.toList());
        return new Result<>(true, StatusCode.OK, "获取项目列表成功", filtered);
    }

    @GetMapping("/projects/{id}")
    public Result<Project> getProjectById(@PathVariable Long id) {
        return new Result<>(true, StatusCode.OK, "获取项目成功", projectService.getProject(id));
    }

    @GetMapping("/projects/search")
    public Result<Page<Project>> search(
            @PageableDefault(size = PaginationConstants.DEFAULT_PAGE_SIZE, sort = {"id"}, direction = Sort.Direction.DESC) Pageable pageable,
            @RequestParam String query) {
        return new Result<>(true, StatusCode.OK, "搜索项目成功", projectService.listProject(query, pageable));
    }
}
