package com.example.blog.po;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.*;

import jakarta.persistence.*;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;

@Entity
@Table(name = "t_user")
@JsonIgnoreProperties(value = { "hibernateLazyInitializer"})
// 替换@Data注解，手动排除关联字段
@Getter
@Setter
@EqualsAndHashCode(exclude = "blogs") // 排除blogs字段
@ToString(exclude = "blogs") // 排除blogs字段
public class User {
    @Id
    @GeneratedValue
    private Long id;
    private String nickname;

    @Column(name = "username")
    private String username;

    @Column(name="password")
    @JsonProperty(access = JsonProperty.Access.WRITE_ONLY)
    private String password;

    @Column(name="email")
    private String email;

    private String avatar;
    private String loginProvince;
    private String loginCity;
    private String loginLat;
    private String loginLng;
    private String type;
    private Boolean isOnline = false;
    @Temporal(TemporalType.TIMESTAMP)
    private Date createTime;

    @Temporal(TemporalType.TIMESTAMP)
    private Date updateTime;

    @Temporal(TemporalType.TIMESTAMP)
    private Date lastLoginTime;

    @OneToMany(mappedBy = "user")
    @JsonIgnore
    private List<Blog> blogs = new ArrayList<>();
}
