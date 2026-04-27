package com.example.blog.DTO;

import lombok.Getter;
import lombok.Setter;

// 内部DTO类，用于存储标签及关联博客数量信息
@Setter
@Getter
public class TagBlogCountDTO {
    // Getters and Setters
    private Long id;
    private String name;
    private Long blogsNumber;

    //含参构造，在Repository层使用
    public TagBlogCountDTO(Long id, String name, Long blogsNumber) {
        this.id = id;
        this.name = name;
        this.blogsNumber = blogsNumber;
    }
}