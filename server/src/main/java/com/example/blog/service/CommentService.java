package com.example.blog.service;

import com.example.blog.po.Comment;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;

public interface CommentService {
    List<Comment> listCommentByBlogId(Long blogId);

    Comment saveComment(Comment comment);

    List<Comment> listComment();

    Page<Comment> listComment(Pageable pageable);

    List<String> CommentCountByMonth();

    Comment getCommentById(Long id);

    void deleteComment(Long id);
}
