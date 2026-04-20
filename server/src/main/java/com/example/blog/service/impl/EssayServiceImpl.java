package com.example.blog.service.impl;

import com.example.blog.constants.CommonConstants;
import com.example.blog.dao.EssayFileUrlRepository;
import com.example.blog.dao.EssayRepository;
import com.example.blog.dao.UserEssayLikeRepository;
import com.example.blog.dao.UserRepository;
import com.example.blog.po.Essay;
import com.example.blog.po.EssayFileUrl;
import com.example.blog.po.User;
import com.example.blog.po.UserEssayLike;
import com.example.blog.service.EssayService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import jakarta.persistence.EntityNotFoundException;
import jakarta.persistence.criteria.Predicate;
import jakarta.transaction.Transactional;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;
import java.util.Objects;
import java.util.Optional;

import static java.util.Objects.requireNonNull;

@Service
public class EssayServiceImpl implements EssayService {

    private final EssayRepository essayRepository;
    private final UserRepository userRepository;
    private final EssayFileUrlRepository essayFileUrlRepository;
    private final UserEssayLikeRepository userEssayLikeRepository;

    // 构造函数参数非空校验
    public EssayServiceImpl(EssayRepository essayRepository,
                            EssayFileUrlRepository essayFileUrlRepository,
                            UserEssayLikeRepository userEssayLikeRepository,
                            UserRepository userRepository) {
        this.essayRepository = Objects.requireNonNull(essayRepository, "essayRepository must not be null");
        this.userRepository = Objects.requireNonNull(userRepository, "userRepository must not be null");
        this.essayFileUrlRepository = Objects.requireNonNull(essayFileUrlRepository, "essayFileUrlRepository must not be null");
        this.userEssayLikeRepository = Objects.requireNonNull(userEssayLikeRepository, "userEssayLikeRepository must not be null");
    }

    @Override
    public Essay getEssayById(Long id) {
        Objects.requireNonNull(id, "essay id must not be null");
        try {
            return essayRepository.findById(id)
                    .orElseThrow(() -> new EntityNotFoundException("文章不存在，ID: " + id));
        } catch (Exception e) {
            throw new RuntimeException("获取文章失败，ID: " + id, e);
        }
    }

    @Override
    public List<Essay> listEssay(Long userId) {
        try {
            List<Essay> essays = essayRepository.findAll();
            essays.forEach(essay -> {
                Objects.requireNonNull(essay, "essay must not be null");
                List<EssayFileUrl> fileUrls = essayFileUrlRepository.getEssayFileUrlByEssay_Id(essay.getId());
                Optional<UserEssayLike> existingLike = userId != null
                        ? userEssayLikeRepository.findByUserIdAndEssayId(userId, essay.getId())
                        : Optional.empty();
                essay.setEssayFileUrls(fileUrls);
                essay.setLiked(existingLike.isPresent());
                fillParentCommentId(essay);
            });
            return essays;
        } catch (Exception e) {
            throw new RuntimeException("获取文章列表失败", e);
        }
    }

    @Override
    public Page<Essay> listEssay(Long userId, Pageable pageable) {
        try {
            Page<Essay> essays = essayRepository.findAll((Specification<Essay>) (root, cq, cb) -> {
                List<Predicate> predicates = new ArrayList<>();
                if (userId != null) {
                    predicates.add(cb.equal(root.get("user").get("id"), userId));
                }
                cq.where(predicates.toArray(new Predicate[0]));
                return null;
            }, pageable);

            return essays.map(essay -> {
                Objects.requireNonNull(essay, "essay must not be null");
                List<EssayFileUrl> fileUrls = essayFileUrlRepository.getEssayFileUrlByEssay_Id(essay.getId());
                Optional<UserEssayLike> existingLike = userId != null
                        ? userEssayLikeRepository.findByUserIdAndEssayId(userId, essay.getId())
                        : Optional.empty();
                essay.setEssayFileUrls(fileUrls);
                essay.setLiked(existingLike.isPresent());
                fillParentCommentId(essay);
                return essay;
            });
        } catch (Exception e) {
            throw new RuntimeException("获取文章列表失败", e);
        }
    }

    @Override
    @Transactional
    public void deleteEssay(Long id) {
        Objects.requireNonNull(id, "essay id must not be null");
        try {
            // 先检查文章是否存在
            if (!essayRepository.existsById(id)) {
                throw new EntityNotFoundException("文章不存在，ID: " + id);
            }
            essayFileUrlRepository.deleteByEssay_Id(id);
            essayRepository.deleteById(id);
        } catch (EntityNotFoundException e) {
            throw e; // 保留原始业务异常
        } catch (Exception e) {
            throw new RuntimeException("删除文章失败，ID: " + id, e);
        }
    }

    @Override
    @Transactional
    public Essay saveEssay(Essay essay) {
        Objects.requireNonNull(essay, "essay must not be null");
        try {
            Date now = new Date();
            essay.setCreateTime(now);
            Essay savedEssay = essayRepository.save(essay);

            if (essay.getEssayFileUrls() != null && !essay.getEssayFileUrls().isEmpty()) {
                for (EssayFileUrl fileUrl : essay.getEssayFileUrls()) {
                    Objects.requireNonNull(fileUrl, "essayFileUrl must not be null");
                    fileUrl.setEssay(savedEssay);
                    fileUrl.setCreateTime(now);
                    essayFileUrlRepository.save(fileUrl);
                }
            }
            return savedEssay;
        } catch (Exception e) {
            throw new RuntimeException("保存文章失败", e);
        }
    }

    @Override
    @Transactional
    public Essay updateEssay(Long id, Essay essay) {
        Objects.requireNonNull(id, "essay id must not be null");
        Objects.requireNonNull(essay, "essay must not be null");
        try {
            Essay existingEssay = essayRepository.findById(id)
                    .orElseThrow(() -> new EntityNotFoundException("文章不存在，ID: " + id));

            Date now = new Date();
            if (essay.getTitle() != null) {
                existingEssay.setTitle(essay.getTitle());
            }
            if (essay.getContent() != null) {
                existingEssay.setContent(essay.getContent());
            }

            if (essay.getEssayFileUrls() != null) {
                existingEssay.getEssayFileUrls().clear();
                for (EssayFileUrl fileUrl : essay.getEssayFileUrls()) {
                    Objects.requireNonNull(fileUrl, "essayFileUrl must not be null");
                    fileUrl.setEssay(existingEssay);
                    fileUrl.setCreateTime(now);
                    existingEssay.getEssayFileUrls().add(fileUrl);
                }
            }

            return essayRepository.save(existingEssay);
        } catch (EntityNotFoundException e) {
            throw e; // 保留原始业务异常
        } catch (Exception e) {
            throw new RuntimeException("更新文章失败，ID: " + id, e);
        }
    }

    @Override
    @Transactional
    public Essay updateLikes(Long userId, Long essayId, boolean isLike) {
        Objects.requireNonNull(userId, "user id must not be null");
        Objects.requireNonNull(essayId, "essay id must not be null");
        try {
            User user = userRepository.findById(userId)
                    .orElseThrow(() -> new EntityNotFoundException("用户不存在，ID: " + userId));
            Essay essay = essayRepository.findById(essayId)
                    .orElseThrow(() -> new EntityNotFoundException("文章不存在，ID: " + essayId));

            Optional<UserEssayLike> existingLike = userEssayLikeRepository.findByUserIdAndEssayId(userId, essayId);

            if (isLike) {
                if (existingLike.isPresent()) {
                    UserEssayLike like = existingLike.get();
                    like.setIsLike(true);
                    userEssayLikeRepository.save(like);
                } else {
                    UserEssayLike newLike = new UserEssayLike();
                    newLike.setUser(user);
                    newLike.setEssay(essay);
                    newLike.setIsLike(true);
                    userEssayLikeRepository.save(newLike);
                    essayRepository.updateLikes(essayId, CommonConstants.LIKE_INCREMENT);
                }
            } else {
                if (existingLike.isPresent()) {
                    userEssayLikeRepository.delete(existingLike.get());
                    essayRepository.updateLikes(essayId, CommonConstants.LIKE_DECREMENT);
                }
            }

            return essayRepository.findById(essayId)
                    .orElseThrow(() -> new EntityNotFoundException("更新点赞后文章不存在，ID: " + essayId));
        } catch (EntityNotFoundException e) {
            throw e; // 保留原始业务异常
        } catch (Exception e) {
            throw new RuntimeException("更新点赞状态失败，用户ID: " + userId + ", 文章ID: " + essayId, e);
        }
    }

    @Override
    @Transactional
    public Boolean changeRecommend(Long Id, Boolean recommend) {
        requireNonNull(Id, "essay id must not be null");
        requireNonNull(recommend, "recommend flag must not be null");
        try {
            int affectedRows = essayRepository.updateRecommend(Id, recommend);
            return affectedRows > 0;
        } catch (Exception e) {
            throw new RuntimeException("Error changing recommend status for essay: " + Id, e);
        }
    }

    @Override
    public Essay getEssayDetail(Long userId, Long id) {
        Objects.requireNonNull(id, "essay id must not be null");
        try {
            Essay essay = essayRepository.findById(id)
                    .orElseThrow(() -> new EntityNotFoundException("文章不存在，ID: " + id));
            List<EssayFileUrl> fileUrls = essayFileUrlRepository.getEssayFileUrlByEssay_Id(id);
            Optional<UserEssayLike> existingLike = userId != null
                    ? userEssayLikeRepository.findByUserIdAndEssayId(userId, id)
                    : Optional.empty();
            essay.setEssayFileUrls(fileUrls);
            essay.setLiked(existingLike.isPresent());
            fillParentCommentId(essay);
            return essay;
        } catch (EntityNotFoundException e) {
            throw e;
        } catch (Exception e) {
            throw new RuntimeException("获取文章详情失败，ID: " + id, e);
        }
    }

    @Override
    public List<Essay> listRecommendEssayTop(Integer size) {
        Objects.requireNonNull(size, "size must not be null");
        if (size <= 0) {
            throw new IllegalArgumentException("size must be greater than 0");
        }
        try {
            org.springframework.data.domain.Pageable pageable = org.springframework.data.domain.PageRequest.of(0, size);
            List<Essay> essays = essayRepository.findTop(pageable);
            essays.forEach(essay -> {
                Objects.requireNonNull(essay, "essay must not be null");
                List<EssayFileUrl> fileUrls = essayFileUrlRepository.getEssayFileUrlByEssay_Id(essay.getId());
                essay.setEssayFileUrls(fileUrls);
                fillParentCommentId(essay);
            });
            return essays;
        } catch (Exception e) {
            throw new RuntimeException("获取推荐文章列表失败", e);
        }
    }

    /**
     * 填充评论的 parentCommentId，使前端能够识别评论的父子关系
     */
    private void fillParentCommentId(Essay essay) {
        if (essay.getEssayComments() != null) {
            essay.getEssayComments().forEach(comment -> {
                if (comment != null && comment.getParentEssayComment() != null) {
                    comment.setParentCommentId(comment.getParentEssayComment().getId());
                }
            });
        }
    }
}