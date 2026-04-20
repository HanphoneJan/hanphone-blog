package com.example.blog.web;

import com.example.blog.constants.PaginationConstants;
import com.example.blog.po.Doc;
import com.example.blog.po.Result;
import com.example.blog.po.StatusCode;
import com.example.blog.service.DocService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
public class DocShowController {

    private final DocService docService;

    public DocShowController(DocService docService) {
        this.docService = docService;
    }

    @GetMapping("/docs")
    public Result<Page<Doc>> listDocs(
            @PageableDefault(size = PaginationConstants.DEFAULT_PAGE_SIZE, sort = {"createTime"}, direction = Sort.Direction.DESC) Pageable pageable) {
        return new Result<>(true, StatusCode.OK, "获取文档列表成功", docService.listDoc(pageable));
    }

    @GetMapping("/docs/hot")
    public Result<Page<Doc>> hotDocs(
            @RequestParam(defaultValue = "10") Integer size,
            @RequestParam(defaultValue = "1") Integer page) {
        Pageable pageable = PageRequest.of(page - 1, size, Sort.by(Sort.Direction.DESC, "viewCount"));
        return new Result<>(true, StatusCode.OK, "获取热门文档成功", docService.listHotDoc(pageable));
    }

    @GetMapping("/docs/recommended")
    public Result<List<Doc>> recommendedDocs(
            @RequestParam(defaultValue = "10") Integer size) {
        return new Result<>(true, StatusCode.OK, "获取推荐文档成功", docService.listRecommendDocTop(size));
    }

    @GetMapping("/docs/{docId}")
    public Result<Doc> getDocByDocId(@PathVariable String docId) {
        return new Result<>(true, StatusCode.OK, "获取文档成功", docService.getDocByDocId(docId));
    }

    @PostMapping("/docs/{docId}/view")
    public Result<Void> incrementViewCount(@PathVariable String docId) {
        if (docService.incrementViewCount(docId)) {
            return new Result<>(true, StatusCode.OK, "更新访问量成功");
        }
        return new Result<>(false, StatusCode.ERROR, "更新访问量失败");
    }
}
