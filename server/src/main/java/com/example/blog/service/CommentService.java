package com.example.blog.service;

import com.example.blog.po.Comment;

import java.util.List;

public interface CommentService {
    List<Comment> listCommentByBlogId(Long blogId);

    Comment saveComment(Comment comment);

    List<Comment> listComment();

    List<String> CommentCountByMonth();

    Comment getCommentById(Long id);

    void deleteComment(Long id);
}
