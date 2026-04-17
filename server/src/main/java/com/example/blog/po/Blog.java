package com.example.blog.po;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.Data;

import javax.persistence.*;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;

@Data
@Entity
@Table(name = "t_blog")
@JsonIgnoreProperties(value = {"hibernateLazyInitializer"})
public class Blog {

    @Id
    @GeneratedValue
    private Long id;

    private String title;
    private String content;
    private String firstPicture;
    private String flag;
    private Integer views;
    private Integer appreciation;
    private boolean shareStatement;
    private boolean commentabled;
    private boolean published;
    private boolean recommend;

    @Temporal(TemporalType.TIMESTAMP)
    private Date createTime;

    @Temporal(TemporalType.TIMESTAMP)
    private Date updateTime;

    private String description;

    @ManyToOne
    private Type type;

    @Column(name = "likes")
    private Integer likes=0;

    @Transient  // 添加此注解，标记该字段不映射到数据库
    private boolean liked;

    // 级联关系----添加博客时自动添加标签
    @ManyToMany(cascade = {CascadeType.PERSIST})
    private List<Tag> tags = new ArrayList<>();

    @ManyToOne
    @JsonIgnoreProperties("blog")
    private User user;

    @OneToMany(mappedBy = "blog")
    private List<Comment> comments = new ArrayList<>();

    @Transient
    private String tagIds;

    public Blog() {
    }

    public void init(){
        this.tagIds = tagsToIds(this.getTags());
    }

    @JsonIgnoreProperties({ "blog"})
    public List<Comment> getComments() {
        return comments;
    }

    @JsonIgnoreProperties({ "blogs", "email", "loginProvince", "loginCity", "loginLat", "loginLng", "isOnline", "createTime", "updateTime", "lastLoginTime"})
    public User getUser() {
        return user;
    }

    @JsonIgnoreProperties({ "blogs"})
    public List<Tag> getTags() {
        return tags;
    }

    @JsonIgnoreProperties({ "blogs"})
    public Type getType() {
        return type;
    }

    private String tagsToIds(List<Tag> tags){
        if (!tags.isEmpty()){
            StringBuffer ids = new StringBuffer();
            boolean flag = false;
            for (Tag tag : tags){
                if (flag) {
                    ids.append(",");
                } else {
                    flag = true;
                }
                ids.append(tag.getId());
            }
            return ids.toString();
        } else {
            return tagIds;
        }
    }

    @Override
    public String toString() {
        return "Blog{" +
                "id=" + id +
                ", title='" + title + '\'' +
                ", content='" + content + '\'' +
                ", firstPicture='" + firstPicture + '\'' +
                ", flag='" + flag + '\'' +
                ", views=" + views +
                ", appreciation=" + appreciation +
                ", shareStatement=" + shareStatement +
                ", commentabled=" + commentabled +
                ", published=" + published +
                ", recommend=" + recommend +
                ", createTime=" + createTime +
                ", updateTime=" + updateTime +
                ", description='" + description + '\'' +
                ", type=" + type +
//                ", tags=" + tags +
                ", user=" + user +
//                ", comments=" + comments +
                ", tagIds='" + tagIds + '\'' +
                '}';
    }
}
