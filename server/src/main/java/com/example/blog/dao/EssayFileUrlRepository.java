package com.example.blog.dao;

import com.example.blog.po.EssayFileUrl;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface EssayFileUrlRepository extends JpaRepository<EssayFileUrl, Long>{
    // 根据文章ID查询关联的文件URL列表
    List<EssayFileUrl> getEssayFileUrlByEssay_Id(Long essayId);
    // 批量根据文章ID列表查询关联的文件URL列表，避免 N+1
    List<EssayFileUrl> findByEssay_IdIn(List<Long> essayIds);
    // 根据文章ID删除所有关联的文件URL记录
    void deleteByEssay_Id(Long essayId);
    //过 essay 对象（@ManyToOne）关联 Essay，则需遵循 JPA “关联属性。目标属性” 的命名规则，将方法名从 deleteByEssayId 改为 deleteByEssay_Id
}
