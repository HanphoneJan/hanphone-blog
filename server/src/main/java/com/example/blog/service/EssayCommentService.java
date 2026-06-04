package com.example.blog.service;

import com.example.blog.po.EssayComment;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;

public interface EssayCommentService {
    List<EssayComment> listEssayCommentByEssayId(Long essayId);

    EssayComment saveEssayComment(EssayComment comment);

    List<EssayComment> listEssayComment();

    Page<EssayComment> listEssayComment(Pageable pageable);

    List<String> EssayCommentCountByMonth();

    EssayComment getEssayCommentById(Long id);

    void deleteEssayComment(Long id);
}
