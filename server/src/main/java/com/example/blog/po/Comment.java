package com.example.blog.po;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.Data;
import lombok.NoArgsConstructor;

import jakarta.persistence.*;
import java.util.Date;

@Data
@Entity
@NoArgsConstructor
@Table(name = "t_comment")
@JsonIgnoreProperties(value = {"hibernateLazyInitializer"})
public class Comment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Long userId;
    private String nickname;
    private String email;
    private String content;
    private String avatar;

    @Temporal(TemporalType.TIMESTAMP)
    private Date createTime;

    @ManyToOne
    private Blog blog = new Blog();

    @ManyToOne
    @JsonIgnore //防止循环引用
    private Comment parentComment;

    private boolean adminComment;

    @JsonIgnoreProperties({ "comments"})
    public Blog getBlog() {
        return blog;
    }

    @Override
    public String toString() {
        return "Comment{" +
                "id=" + id +
                ", nickname='" + nickname + '\'' +
                ", email='" + email + '\'' +
                ", content='" + content + '\'' +
                ", avatar='" + avatar + '\'' +
                ", createTime=" + createTime +
                ", adminComment=" + adminComment +
                '}';
    }
}
