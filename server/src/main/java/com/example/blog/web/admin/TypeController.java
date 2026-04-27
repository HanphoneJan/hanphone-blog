package com.example.blog.web.admin;

import com.example.blog.po.Result;
import com.example.blog.po.StatusCode;
import com.example.blog.po.Type;
import com.example.blog.service.TypeService;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/admin")
public class TypeController {

    private final TypeService typeService;

    public TypeController(TypeService typeService) {
        this.typeService = typeService;
    }

    // 新增或更新type
    @PostMapping("/types")
    public Result<Type> saveOrUpdate(@RequestBody Map<String, Object> para) {

        // 从请求参数中提取Type对象
        Type type = extractTypeFromRequest(para);
        if (type == null) {
            return new Result<>(false, StatusCode.ERROR, "请求参数格式错误，缺少type对象", null);
        }

        // 验证名称是否重复
        if (type.getId() == null) {
            // 新增操作
            Type existingType = typeService.getTypeByName(type.getName());
            if (existingType != null) {
                return new Result<>(false, StatusCode.ERROR, "不能添加重复的分类", null);
            }
            // 调用专门的新增方法
            Type savedType = typeService.saveType(type);
            if (savedType == null) {
                return new Result<>(false, StatusCode.ERROR, "新增失败", null);
            }
            return new Result<>(true, StatusCode.OK, "新增成功", savedType);
        } else {
            // 更新操作
            List<Type> typeList = typeService.listByNameExceptSelf(type.getId(), type.getName());
            if (!typeList.isEmpty()) {
                return new Result<>(false, StatusCode.ERROR, "分类名称已存在", null);
            }
            Type updatedType = typeService.updateType(type.getId(), type);
            if (updatedType == null) {
                return new Result<>(false, StatusCode.ERROR, "修改失败", null);
            }
            return new Result<>(true, StatusCode.OK, "修改成功", updatedType);
        }
    }

    /**
     * 从请求参数中提取Type对象
     * @param para 请求参数Map
     * @return 构建好的Type对象，如果参数格式错误则返回null
     */
    private Type extractTypeFromRequest(Map<String, Object> para) {
        Object typeObj = para.get("type");
        if (!(typeObj instanceof Map)) {
            return null;
        }

        @SuppressWarnings("unchecked")
        Map<String, Object> typeMap = (Map<String, Object>) typeObj;

        Type type = new Type();
        type.setName((String) typeMap.get("name"));
        type.setPic_url((String) typeMap.get("pic_url"));
        type.setColor("blue");

        if (typeMap.get("id") != null) {
            Number idNum = (Number) typeMap.get("id");
            type.setId(idNum.longValue());
        }

        return type;
    }

    @DeleteMapping("/types/{id}")
    public Result<Void> delete(@PathVariable Long id) {
        typeService.deleteType(id);
        return new Result<>(true, StatusCode.OK, "删除成功");
    }
}