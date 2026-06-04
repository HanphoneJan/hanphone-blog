package com.example.blog.dao;

import com.example.blog.po.EssayComment;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface EssayCommentRepository extends JpaRepository<EssayComment, Long>{
    List<EssayComment> getCommentsByEssayId(Long essayId);

    List<EssayComment> findByEssayIdAndParentEssayCommentNull(Long essayId, Sort sort);

    @Query("select function('to_char', c.createTime, 'YYYY-MM') AS MONTH, count(c) as essayComment " +
            "from EssayComment c " +
            "group by function('to_char', c.createTime, 'YYYY-MM') " +  // 分组也建议用完整表达式（更规范）
            "order by function('to_char', c.createTime, 'YYYY-MM') desc")  // 关键修复：用原始表达式排序
    List<String> EssayCommentCountByMonth();
}
