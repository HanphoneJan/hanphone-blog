package com.example.blog.service;

import com.example.blog.DTO.TagBlogCountDTO;
import com.example.blog.po.Tag;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;


public interface TagService {
    Tag saveTag(Tag tag);

    Tag getTag(Long id);

    Tag getTagByName(String name);

    List<Tag> listTag();

    List<TagBlogCountDTO> listTagAndBlogNumber();

    Page<Tag> listTag(Pageable pageable);

    List<Tag> listTagTop(Integer size);

    List<Tag> listTag(String ids);

    Tag updateTag(Long id,Tag tag);

    void deleteTag(Long id);

    List<Tag> listByNameExceptSelf(Long id, String name);

}
