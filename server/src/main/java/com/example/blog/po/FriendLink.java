package com.example.blog.po;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.Getter;
import lombok.Setter;

import jakarta.persistence.*;
import java.util.Date;

@Entity
@Table(name = "friend_links")
@JsonIgnoreProperties(value = {"hibernateLazyInitializer"})
@Getter
@Setter
public class FriendLink {
    @Id
    @GeneratedValue
    private Long id;
    private String type;
    private String name;
    private String description;
    @Column(name = "link_url")
    private String linkUrl;
    private String url;
    private String avatar;
    private String color;
    private boolean recommend;
    
    // 新增字段
    private String siteshot;      // 站点截图URL
    private String rss;           // RSS订阅地址
    private String nickname;      // 站长昵称
    private Boolean published;    // 是否已审核发布（默认false）
    
    @Column(name = "apply_text", columnDefinition = "TEXT")
    private String applyText;     // 友链申请原始文本（用于智能解析）
    
    @Temporal(TemporalType.TIMESTAMP)
    @Column(name = "create_time")
    private Date createTime;
    
    // 获取published的默认值
    public Boolean getPublished() {
        return published != null ? published : false;
    }
}
