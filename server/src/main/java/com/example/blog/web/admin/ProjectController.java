package com.example.blog.web.admin;

import com.example.blog.po.Project;
import com.example.blog.po.Result;
import com.example.blog.po.StatusCode;
import com.example.blog.service.ProjectService;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/admin")
public class ProjectController {
    final
    ProjectService projectService;

    public ProjectController(ProjectService projectService) {
        this.projectService = projectService;
    }

    @DeleteMapping("/project/{id}")
    public Result<Void> delete(@PathVariable Long id) {
        projectService.deleteProject(id);
        return new Result<>(true, StatusCode.OK, "删除项目成功");
    }

    @GetMapping("/projects")
    public Result<?> projects(
            @RequestParam(required = false) Integer page,
            @RequestParam(required = false) Integer pageSize) {
        if (page != null && pageSize != null) {
            Pageable pageable = PageRequest.of(page - 1, pageSize, Sort.by(Sort.Direction.DESC, "id"));
            return new Result<>(true, StatusCode.OK, "获取项目列表成功", projectService.listProject(pageable));
        }
        return new Result<>(true, StatusCode.OK, "获取项目列表成功", projectService.listProject());
    }

    @PostMapping("/project")
    public Result<Void> post(@RequestBody Map<String, Project> para){
        Project project = para.get("project");
        Project p;
        if (project.getId() == null){
            p = projectService.saveProject(project);
        } else {
            p = projectService.updateProject(project.getId(),project);
        }
        if (p == null) {
            return new Result<>(false,StatusCode.ERROR,"操作失败");
        }
        return new Result<>(true,StatusCode.OK,"操作成功");
    }

    @PostMapping("/projects/recommend")
    public Result<Void> recommend(@RequestBody Map<String, Object> para) {
        Object projectIdObj = para.get("projectId");
        if (projectIdObj == null) {
            return new Result<>(false, StatusCode.ERROR, "projectId不能为空");
        }
        if (!(projectIdObj instanceof Number)) {
            return new Result<>(false, StatusCode.ERROR, "projectId必须是数字类型");
        }
        // 正确的转换方式：先获取Number，再调用longValue()方法
        Long projectId = ((Number) projectIdObj).longValue();
        Boolean recommend = (Boolean) para.get("recommend");
        try{
            if(projectService.changeRecommend(projectId, recommend)){
                return new Result<>(true, StatusCode.OK, "操作成功");
            }
            return new Result<>(false, StatusCode.ERROR, "操作失败");
        } catch (Exception e) {
            return new Result<>(false, StatusCode.ERROR, "操作失败");
        }
    }

    @PostMapping("/projects/published")
    public Result<Void> published(@RequestBody Map<String, Object> para) {
        Object projectIdObj = para.get("projectId");
        if (projectIdObj == null) {
            return new Result<>(false, StatusCode.ERROR, "projectId不能为空");
        }
        if (!(projectIdObj instanceof Number)) {
            return new Result<>(false, StatusCode.ERROR, "projectId必须是数字类型");
        }
        Long projectId = ((Number) projectIdObj).longValue();
        Boolean published = (Boolean) para.get("published");
        try {
            if (projectService.changePublished(projectId, published)) {
                return new Result<>(true, StatusCode.OK, "操作成功");
            }
            return new Result<>(false, StatusCode.ERROR, "操作失败");
        } catch (Exception e) {
            return new Result<>(false, StatusCode.ERROR, "操作失败");
        }
    }

}
