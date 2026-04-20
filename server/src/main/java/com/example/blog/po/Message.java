package com.example.blog.po;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import jakarta.persistence.*;
import java.util.Date;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "t_message")
@JsonIgnoreProperties(value = {"hibernateLazyInitializer"})
public class Message {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    private String nickname;
    private String avatar;
    private String content;
    @Temporal(TemporalType.TIMESTAMP)
    private Date createTime;

    // 关联父消息，实现层级关系（多对一）
    @ManyToOne
    @JoinColumn(name = "parent_message_id")
    private Message parentMessage;
    // 管理员消息标识字段
    private boolean adminMessage = false;
}