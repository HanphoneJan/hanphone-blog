package com.example.blog.web;

import com.example.blog.po.PersonInfo;
import com.example.blog.po.Result;
import com.example.blog.po.StatusCode;
import com.example.blog.service.PersonInfoService;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;


@RestController
public class PersonInfoShowController {
    private final PersonInfoService personInfoService;

    public PersonInfoShowController(PersonInfoService personInfoService) {
        this.personInfoService = personInfoService;
    }

    @GetMapping("/personInfos")
    public Result<?> personInfos(
            @RequestParam(required = false) String category,
            @RequestParam(required = false) Integer page,
            @RequestParam(required = false) Integer pageSize) {
        if (page != null && pageSize != null) {
            Sort sort = Sort.by(Sort.Direction.ASC, "rank");
            Pageable pageable = PageRequest.of(page - 1, pageSize, sort);
            if (category != null && !category.isEmpty()) {
                // TODO: 如需分页+分类，可在Service层添加对应方法
                return new Result<>(true, StatusCode.OK, "获取个人信息成功", personInfoService.listPersonInfoByCategory(category));
            }
            // TODO: 如需PersonInfo分页，需在Service层添加listPersonInfo(Pageable)方法
            return new Result<>(true, StatusCode.OK, "获取个人信息成功", personInfoService.listPersonInfo());
        }
        if (category != null && !category.isEmpty()) {
            return new Result<>(true, StatusCode.OK, "获取个人信息成功", personInfoService.listPersonInfoByCategory(category));
        }
        return new Result<>(true, StatusCode.OK, "获取个人信息成功", personInfoService.listPersonInfo());
    }
}
