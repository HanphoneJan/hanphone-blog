package com.example.blog.po;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.Getter;
import lombok.Setter;

import jakarta.persistence.*;
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

    // ---- 缩略图元信息（admin-file 上传时生成的 WebP 缩略图）----
    // 原图可达十几 MB，列表页/九宫格直接用原图会把浏览器和 2C2G 的服务器一起打爆，
    // 因此列表一律用 thumbPath，点开放大才回原图。老数据这三列为 NULL，前端回退到原图。

    /** 原图宽度（px，已按 EXIF Orientation 修正） */
    @Column(name = "width")
    private Integer width;

    /** 原图高度（px，已按 EXIF Orientation 修正） */
    @Column(name = "height")
    private Integer height;

    /** 列表页/九宫格用的小图完整 URL（800w，回退 320w） */
    @Column(name = "thumb_path", length = 512)
    private String thumbPath;

    @Column(name = "is_valid")
    private Boolean isValid = true;

    @Temporal(TemporalType.TIMESTAMP)
    @Column(name = "create_time")
    private Date createTime;

    // 多对一关联：多个文件URL属于一篇随笔
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
                ", thumbPath='" + thumbPath + '\'' +
                ", createTime=" + createTime +
                '}'; // 不包含 essay 字段，避免递归
    }
}