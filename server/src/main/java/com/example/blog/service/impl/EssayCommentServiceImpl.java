package com.example.blog.service.impl;

import com.example.blog.dao.EssayCommentRepository;
import com.example.blog.po.Essay;
import com.example.blog.po.EssayComment;
import com.example.blog.service.EssayCommentService;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;

import jakarta.transaction.Transactional;
import java.util.Date;
import java.util.List;
import java.util.Objects;

@Service
public class EssayCommentServiceImpl implements EssayCommentService {

    private final EssayCommentRepository essayCommentRepository;

    // 构造函数注入时校验依赖非空
    public EssayCommentServiceImpl(EssayCommentRepository essayCommentRepository) {
        this.essayCommentRepository = Objects.requireNonNull(essayCommentRepository,
                "essayCommentRepository must not be null");
    }

    @Override
    public List<EssayComment> listEssayCommentByEssayId(Long essayId) {
        try {
            // 校验输入参数非空
            Objects.requireNonNull(essayId, "essayId must not be null");

            Sort sort = Sort.by("createTime");
            List<EssayComment> essayComments = essayCommentRepository
                    .findByEssayIdAndParentEssayCommentNull(essayId, sort);

            // 处理评论集合时做多层非空保护
            if (essayComments != null) {
                essayComments.forEach(essayComment -> {
                    if (essayComment != null) {
                        Essay essay = essayComment.getEssay();
                        if (essay != null) {
                            essay.setContent("");
                            essayComment.setEssay(essay);
                        }
                    }
                });
            }
            return essayComments;
        } catch (IllegalArgumentException e) {
            throw new IllegalArgumentException("Failed to list essay comments: " + e.getMessage(), e);
        } catch (Exception e) {
            throw new RuntimeException("Error listing essay comments by essayId: " + essayId, e);
        }
    }

    @Transactional
    @Override
    public EssayComment saveEssayComment(EssayComment essayComment) {
        try {
            // 校验输入参数非空
            Objects.requireNonNull(essayComment, "essayComment to save must not be null");

            essayComment.setCreateTime(new Date());
            EssayComment savedComment = essayCommentRepository.save(essayComment);
            // 校验保存结果非空
            Objects.requireNonNull(savedComment, "Saved essayComment must not be null");
            return savedComment;
        } catch (IllegalArgumentException e) {
            throw new IllegalArgumentException("Failed to save essay comment: " + e.getMessage(), e);
        } catch (Exception e) {
            throw new RuntimeException("Error saving essay comment", e);
        }
    }

    @Override
    public List<EssayComment> listEssayComment() {
        try {
            List<EssayComment> essayComments = essayCommentRepository.findAll();

            // 处理评论集合时做多层非空保护
            essayComments.forEach(essayComment -> {
                if (essayComment != null) {
                    Essay essay = essayComment.getEssay();
                    if (essay != null) {
                        essay.setContent("");
                        essayComment.setEssay(essay);
                    }
                }
            });
            return essayComments;
        } catch (Exception e) {
            throw new RuntimeException("Error listing all essay comments", e);
        }
    }

    @Override
    public List<String> EssayCommentCountByMonth() {
        try {
            List<String> countResult = essayCommentRepository.EssayCommentCountByMonth();
            // 确保返回结果非空（允许空集合但不允许null）
            Objects.requireNonNull(countResult, "Essay comment count result must not be null");
            return countResult;
        } catch (IllegalArgumentException e) {
            throw new IllegalArgumentException("Failed to get monthly comment count: " + e.getMessage(), e);
        } catch (Exception e) {
            throw new RuntimeException("Error getting essay comment count by month", e);
        }
    }

    @Override
    public EssayComment getEssayCommentById(Long id) {
        try {
            // 校验输入参数非空
            Objects.requireNonNull(id, "essayComment id must not be null");

            EssayComment essayComment = essayCommentRepository.getReferenceById(id);
            // 校验查询结果非空
            Objects.requireNonNull(essayComment, "Essay comment not found with id: " + id);
            return essayComment;
        } catch (IllegalArgumentException e) {
            throw new IllegalArgumentException("Failed to get essay comment: " + e.getMessage(), e);
        } catch (Exception e) {
            throw new RuntimeException("Error getting essay comment by id: " + id, e);
        }
    }

    @Override
    public void deleteEssayComment(Long id) {
        try {
            // 校验输入参数非空
            Objects.requireNonNull(id, "essayComment id to delete must not be null");

            essayCommentRepository.deleteById(id);
        } catch (IllegalArgumentException e) {
            throw new IllegalArgumentException("Failed to delete essay comment: " + e.getMessage(), e);
        } catch (Exception e) {
            throw new RuntimeException("Error deleting essay comment with id: " + id, e);
        }
    }
}