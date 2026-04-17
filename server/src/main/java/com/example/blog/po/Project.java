package com.example.blog.po;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.Data;

import javax.persistence.*;

@Entity
@Table(name = "t_project")
@JsonIgnoreProperties(value = {"hibernateLazyInitializer"})
@Data // 生成getter、setter、toString、equals和hashCode方法
public class Project {
    @Id
    @GeneratedValue
    private Long id;
    private String title;
    private String content;
    private String pic_url;
    private String url;
    private String techs;
    private Integer type;
    private boolean recommend;
}
