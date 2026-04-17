package com.example.blog.web.admin;

import com.example.blog.po.PersonInfo;
import com.example.blog.po.Result;
import com.example.blog.po.StatusCode;
import com.example.blog.service.PersonInfoService;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/admin")
public class PersonInfoController {
    final PersonInfoService personInfoService;

    public PersonInfoController(PersonInfoService personInfoService) {
        this.personInfoService = personInfoService;
    }

    @DeleteMapping("/personInfo/{id}")
    public Result<Void> delete(@PathVariable Long id) {
        personInfoService.deletePersonInfo(id);
        return new Result<>(true, StatusCode.OK, "删除个人展示信息成功",null );
    }

    @GetMapping("/personInfos")
    public Result<List<PersonInfo>> personInfos() {
        return new Result<>(true, StatusCode.OK, "获取个人展示信息成功", personInfoService.listPersonInfo());
    }

    //修改或新增
    @PostMapping("/personInfo")
    public Result<Void> post(@RequestBody Map<String, PersonInfo> para){
        PersonInfo personInfo = para.get("personInfo");
        PersonInfo p;
        if (personInfo.getId() == null){
            p = personInfoService.savePersonInfo(personInfo);
        } else {
            p = personInfoService.updatePersonInfo(personInfo.getId(),personInfo);
        }
        if (p == null) {
            return new Result<>(false,StatusCode.ERROR,"操作失败");
        }
        return new Result<>(true,StatusCode.OK,"操作成功");
    }

}
