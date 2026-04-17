package com.example.blog.po;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.Data;

import javax.persistence.*;
import java.io.Serializable;

@Data
@Entity
@Table(name = "t_user_essay_like",
        uniqueConstraints = {@UniqueConstraint(columnNames = {"user_id", "essay_id"})})
public class UserEssayLike implements Serializable {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id")
    @JsonIgnoreProperties({"essays", "likedEssays", "email", "loginProvince", "loginCity", "loginLat", "loginLng", "isOnline", "createTime", "updateTime", "lastLoginTime"})
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "essay_id")
    @JsonIgnoreProperties({"user", "essayComments", "essayFileUrls"})
    private Essay essay;

    // 记录点赞状态，true为已点赞，false为取消点赞（可选）
    @Column(name = "is_like")
    private Boolean isLike = true;
}