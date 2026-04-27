package com.example.blog.po;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.Data;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "personal_info")
@JsonIgnoreProperties(value = {"hibernateLazyInitializer"})
@Data // 生成getter、setter、toString、equals和hashCode方法
public class PersonInfo {
    @Id
    @GeneratedValue
    private Long id;
    private String category;
    private String name;
    private String description;
    private String pic_url;
    private String url;
    private String icon_src;
    private Long rank;
}