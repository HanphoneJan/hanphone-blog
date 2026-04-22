package com.example.blog.dao;

import com.example.blog.po.Tag;
import com.example.blog.DTO.TagBlogCountDTO;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface TagRepository extends JpaRepository<Tag, Long> {
    Tag findByName(String name);

    @Query("select t from Tag t")
    List<Tag> findTop(Pageable pageable);

    @Query("select t from Tag t left join t.blogs b group by t.id order by count(b) desc")
    List<Tag> findTopByBlogCount(Pageable pageable);

    @Query("select t from Tag t where t.id <> ?1 and t.name = ?2")
    List<Tag> findByNameExceptSelf(Long id, String name);

    // 自定义查询：获取所有标签及其关联的博客数量
    @Query("select new com.example.blog.DTO.TagBlogCountDTO(t.id, t.name, count(b.id)) " +
            "from Tag t left join t.blogs b group by t.id, t.name")
    List<TagBlogCountDTO> findAllWithBlogCount();

}
