package com.example.blog.web;

import com.example.blog.po.PersonInfo;
import com.example.blog.po.Result;
import com.example.blog.po.StatusCode;
import com.example.blog.service.PersonInfoService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;


@RestController
public class PersonInfoShowController {
    private final PersonInfoService personInfoService;

    public PersonInfoShowController(PersonInfoService personInfoService) {
        this.personInfoService = personInfoService;
    }

    @GetMapping("/personInfos")
    public Result<List<PersonInfo>> personInfos() {
        return new Result<>(true, StatusCode.OK, "获取个人信息成功", personInfoService.listPersonInfo());
    }
}
