package com.example.blog.po;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.Getter;
import lombok.Setter;

import javax.persistence.*;
import java.util.Date;

@Getter
@Setter
@Entity
@Table(name = "t_essay_url")
@JsonIgnoreProperties(value = {"hibernateLazyInitializer", "handler"})
public class EssayFileUrl {
    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "t_essay_url_id_seq")
    @SequenceGenerator(name = "t_essay_url_id_seq", sequenceName = "t_essay_url_id_seq", allocationSize = 1)
    private Long id;

    // 移除手动定义的essayId，由JPA关联维护

    @Column(nullable = false)
    private String url;

    @Column(name = "url_type")
    private String urlType;

    @Column(name = "url_desc")
    private String urlDesc;

    @Column(name = "is_valid")
    private Boolean isValid = true;

    @Temporal(TemporalType.TIMESTAMP)
    @Column(name = "create_time")
    private Date createTime;

    // 多对一关联：多个文件URL属于一篇文章
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "essay_id", nullable = false) // 外键字段对应t_essay表的id
    @JsonIgnoreProperties("essayFileUrls") // 避免循环引用
    private Essay essay;

    // 自动填充创建时间
    @PrePersist
    public void prePersist() {
        this.createTime = new Date();
    }

    @Override
    public String toString() {
        return "EssayFileUrl{" +
                "id=" + id +
                ", fileUrl='" + url + '\'' +
                ", createTime=" + createTime +
                '}'; // 不包含 essay 字段，避免递归
    }
}