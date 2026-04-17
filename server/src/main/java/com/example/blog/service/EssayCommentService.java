package com.example.blog.service;

import com.example.blog.po.EssayComment;

import java.util.List;

public interface EssayCommentService {
    List<EssayComment> listEssayCommentByEssayId(Long essayId);

    EssayComment saveEssayComment(EssayComment comment);

    List<EssayComment> listEssayComment();

    List<String> EssayCommentCountByMonth();

    EssayComment getEssayCommentById(Long id);

    void deleteEssayComment(Long id);
}
