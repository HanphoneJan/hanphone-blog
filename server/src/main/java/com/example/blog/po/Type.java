package com.example.blog.po;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.Getter;
import lombok.Setter;

import jakarta.persistence.*;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "t_type")
@JsonIgnoreProperties(value = {"hibernateLazyInitializer"})
@Getter
@Setter// 生成getter、setter、toString、equals和hashCode方法
public class Type {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String name;

    private String pic_url;

    private String color;

//    @JsonIgnore // 序列化时忽略blogs字段，避免循环引用
    @OneToMany(mappedBy = "type")
    private List<Blog> blogs = new ArrayList<>();

    // 保留无参构造方法，确保JPA正常工作
    public Type() {
    }

    // 重写toString方法以排除blogs字段，保持原有行为
    @Override
    public String toString() {
        return "Type{" +
                "id=" + id +
                ", name='" + name + '\'' +
                ", pic_url='" + pic_url + '\'' +
                ", color='" + color + '\'' +
                '}';
    }
}
