package com.example.blog.po;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.Data;

import jakarta.persistence.*;
import java.io.Serializable;

@Data
@Entity
@Table(name = "t_user_blog_like",
        uniqueConstraints = {@UniqueConstraint(columnNames = {"user_id", "blog_id"})})
public class UserBlogLike implements Serializable {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id")
    @JsonIgnoreProperties({"blogs", "likedBlogs", "email", "loginProvince", "loginCity", "loginLat", "loginLng", "isOnline", "createTime", "updateTime", "lastLoginTime"})
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "blog_id")
    @JsonIgnoreProperties({"user", "blogComments", "blogFileUrls"})
    private Blog blog;

    // 记录点赞状态，true为已点赞，false为取消点赞（可选）
    @Column(name = "is_like")
    private Boolean isLike = true;
}