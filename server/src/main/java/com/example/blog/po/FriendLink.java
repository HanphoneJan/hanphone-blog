package com.example.blog.po;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.Getter;
import lombok.Setter;

import javax.persistence.*;
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
    private String link_url;
    private String url;
    private String avatar;
    private String color;
    private boolean recommend;
    @Temporal(TemporalType.TIMESTAMP)
    @Column(name = "create_time")
    private Date createTime;
}