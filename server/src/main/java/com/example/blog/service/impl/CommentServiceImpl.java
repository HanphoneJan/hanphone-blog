package com.example.blog.service.impl;

import com.example.blog.dao.CommentRepository;
import com.example.blog.po.Blog;
import com.example.blog.po.Comment;
import com.example.blog.service.CommentService;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;

import javax.transaction.Transactional;
import java.util.Date;
import java.util.List;
import java.util.Objects;

@Service
public class CommentServiceImpl implements CommentService {

    private final CommentRepository commentRepository;

    // 构造函数注入时校验依赖非空
    public CommentServiceImpl(CommentRepository commentRepository) {
        this.commentRepository = Objects.requireNonNull(commentRepository, "commentRepository 不能为null");
    }

    @Override
    public List<Comment> listCommentByBlogId(Long blogId) {
        try {
            // 校验输入参数
            Objects.requireNonNull(blogId, "blogId 不能为null");

            Sort sort = Sort.by("createTime");
            List<Comment> comments = commentRepository.findByBlogIdAndParentCommentNull(blogId, sort);

            // 处理评论集合时做多层非空保护
            if (comments != null) {
                comments.forEach(comment -> {
                    if (comment != null) {
                        Blog blog = comment.getBlog();
                        if (blog != null) {
                            blog.setContent("");
                            comment.setBlog(blog);
                        }
                    }
                });
            }
            return comments;
        } catch (IllegalArgumentException e) {
            // 捕获非空校验异常
            throw new IllegalArgumentException("获取博客评论失败: " + e.getMessage(), e);
        } catch (Exception e) {
            // 捕获其他业务异常
            throw new RuntimeException("获取博客评论时发生错误, blogId=" + blogId, e);
        }
    }

    @Transactional
    @Override
    public Comment saveComment(Comment comment) {
        try {
            // 校验输入参数
            Objects.requireNonNull(comment, "待保存的评论不能为null");

            comment.setCreateTime(new Date());
            Comment saved = commentRepository.save(comment);
            // 校验保存结果
            Objects.requireNonNull(saved, "评论保存后返回结果为null");
            return saved;
        } catch (IllegalArgumentException e) {
            throw new IllegalArgumentException("保存评论失败: " + e.getMessage(), e);
        } catch (Exception e) {
            throw new RuntimeException("保存评论时发生错误", e);
        }
    }

    @Override
    public List<Comment> listComment() {
        try {
            List<Comment> comments = commentRepository.findAll();

            // 处理评论集合时做多层非空保护
            comments.forEach(comment -> {
                if (comment != null) {
                    Blog blog = comment.getBlog();
                    if (blog != null) {
                        blog.setContent("");
                        comment.setBlog(blog);
                    }
                }
            });
            return comments;
        } catch (Exception e) {
            throw new RuntimeException("获取所有评论时发生错误", e);
        }
    }

    @Override
    public List<String> CommentCountByMonth() {
        try {
            List<String> countResult = commentRepository.CommentCountByMonth();
            // 允许返回空集合但不允许返回null
            Objects.requireNonNull(countResult, "月度评论统计结果不能为null");
            return countResult;
        } catch (IllegalArgumentException e) {
            throw new IllegalArgumentException("获取月度评论统计失败: " + e.getMessage(), e);
        } catch (Exception e) {
            throw new RuntimeException("获取月度评论统计时发生错误", e);
        }
    }

    @Override
    public Comment getCommentById(Long id) {
        try {
            // 校验输入参数
            Objects.requireNonNull(id, "评论ID不能为null");

            Comment comment = commentRepository.getOne(id);
            // 校验查询结果
            Objects.requireNonNull(comment, "未找到ID为" + id + "的评论");
            return comment;
        } catch (IllegalArgumentException e) {
            throw new IllegalArgumentException("获取评论失败: " + e.getMessage(), e);
        } catch (Exception e) {
            throw new RuntimeException("获取ID为" + id + "的评论时发生错误", e);
        }
    }

    @Override
    public void deleteComment(Long id) {
        try {
            // 校验输入参数
            Objects.requireNonNull(id, "待删除的评论ID不能为null");

            commentRepository.deleteById(id);
        } catch (IllegalArgumentException e) {
            throw new IllegalArgumentException("删除评论失败: " + e.getMessage(), e);
        } catch (Exception e) {
            throw new RuntimeException("删除ID为" + id + "的评论时发生错误", e);
        }
    }
}