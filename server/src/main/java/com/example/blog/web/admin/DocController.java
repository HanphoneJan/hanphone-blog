package com.example.blog.web.admin;

import com.example.blog.po.Doc;
import com.example.blog.po.Result;
import com.example.blog.po.StatusCode;
import com.example.blog.service.DocService;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/admin")
public class DocController {

    private final DocService docService;

    public DocController(DocService docService) {
        this.docService = docService;
    }

    @GetMapping("/docs")
    public Result<List<Doc>> listDocs() {
        return new Result<>(true, StatusCode.OK, "获取文档列表成功", docService.listDoc());
    }

    @GetMapping("/docs/{id}")
    public Result<Doc> getDoc(@PathVariable Long id) {
        return new Result<>(true, StatusCode.OK, "获取文档成功", docService.getDoc(id));
    }

    @PostMapping("/doc")
    public Result<Void> saveOrUpdate(@RequestBody Map<String, Doc> para) {
        Doc doc = para.get("doc");
        if (doc == null) {
            return new Result<>(false, StatusCode.ERROR, "doc 参数不能为空");
        }
        Doc result;
        if (doc.getId() == null) {
            result = docService.saveDoc(doc);
        } else {
            result = docService.updateDoc(doc.getId(), doc);
        }
        if (result == null) {
            return new Result<>(false, StatusCode.ERROR, "操作失败");
        }
        return new Result<>(true, StatusCode.OK, "操作成功");
    }

    @DeleteMapping("/doc/{id}")
    public Result<Void> delete(@PathVariable Long id) {
        docService.deleteDoc(id);
        return new Result<>(true, StatusCode.OK, "删除文档成功");
    }

    @PostMapping("/docs/recommend")
    public Result<Void> recommend(@RequestBody Map<String, Object> para) {
        Object docIdObj = para.get("docId");
        if (docIdObj == null) {
            return new Result<>(false, StatusCode.ERROR, "docId 不能为空");
        }
        if (!(docIdObj instanceof Number)) {
            return new Result<>(false, StatusCode.ERROR, "docId 必须是数字类型");
        }
        Long docId = ((Number) docIdObj).longValue();
        Boolean recommend = (Boolean) para.get("recommend");
        try {
            if (docService.changeRecommend(docId, recommend)) {
                return new Result<>(true, StatusCode.OK, "操作成功");
            }
            return new Result<>(false, StatusCode.ERROR, "操作失败");
        } catch (Exception e) {
            return new Result<>(false, StatusCode.ERROR, "操作失败");
        }
    }

    @PostMapping("/docs/published")
    public Result<Void> published(@RequestBody Map<String, Object> para) {
        Object docIdObj = para.get("docId");
        if (docIdObj == null) {
            return new Result<>(false, StatusCode.ERROR, "docId 不能为空");
        }
        if (!(docIdObj instanceof Number)) {
            return new Result<>(false, StatusCode.ERROR, "docId 必须是数字类型");
        }
        Long docId = ((Number) docIdObj).longValue();
        Boolean published = (Boolean) para.get("published");
        try {
            if (docService.changePublished(docId, published)) {
                return new Result<>(true, StatusCode.OK, "操作成功");
            }
            return new Result<>(false, StatusCode.ERROR, "操作失败");
        } catch (Exception e) {
            return new Result<>(false, StatusCode.ERROR, "操作失败");
        }
    }
}
