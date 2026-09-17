package com.example.blog.po;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.Data;

import jakarta.persistence.*;

import java.util.Date;

@Entity
@Table(name = "t_project", indexes = {
        @Index(name = "idx_project_published", columnList = "published")
})
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

    @Column(name = "published")
    private Boolean published = false;

    @Column(name = "created_time")
    private Date createdTime;

    @Column(name = "update_time")
    private Date updateTime;

    @PrePersist
    protected void onCreate() {
        if (published == null) {
            published = false;
        }
        Date now = new Date();
        if (createdTime == null) {
            createdTime = now;
        }
        updateTime = now;
    }

    @PreUpdate
    protected void onUpdate() {
        updateTime = new Date();
    }
}
