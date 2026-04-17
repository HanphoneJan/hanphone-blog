package com.example.blog.po;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.Data;

import javax.persistence.*;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;

@Data
@Entity
@Table(name = "t_essay")
@JsonIgnoreProperties(value = {"hibernateLazyInitializer", "handler"}) // 增加handler避免JSON序列化问题
public class Essay {
    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "t_essay_id_seq")
    @SequenceGenerator(name = "t_essay_id_seq", sequenceName = "t_essay_id_seq", allocationSize = 1)
    private Long id;

    @Column(name = "likes")
    private Integer likes = 0;

    @Transient  // 添加此注解，标记该字段不映射到数据库
    private boolean liked;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id")
    @JsonIgnoreProperties({"essays", "email", "loginProvince", "loginCity", "loginLat", "loginLng", "isOnline", "createTime", "updateTime", "lastLoginTime"})
    private User user;

    @Column(name = "title")
    private String title;

    @Column(name = "content")
    private String content;

    @Column(name = "recommend")
    private boolean recommend;

    @Column(name = "image")
    private String image;

    @Temporal(TemporalType.TIMESTAMP)
    @Column(name = "create_time")
    private Date createTime;

    // 修正为一对多关联：一篇文章对应多个文件URL
    @OneToMany(mappedBy = "essay", cascade = CascadeType.ALL, orphanRemoval = true)
    @JsonIgnoreProperties("essay") // 避免JSON序列化循环引用
    private List<EssayFileUrl> essayFileUrls = new ArrayList<>();

    //对Essay执行保存（save）、更新（update） 、删除（delete） 等操作时，会自动级联到关联的EssayFileUrl列表
    @OneToMany(mappedBy = "essay", cascade = CascadeType.ALL, orphanRemoval = true)
    @JsonIgnoreProperties("essay")
    private List<EssayComment> essayComments = new ArrayList<>();

}