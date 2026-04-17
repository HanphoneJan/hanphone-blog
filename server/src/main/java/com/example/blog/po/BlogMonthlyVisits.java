package com.example.blog.po;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.Getter;
import lombok.Setter;

import javax.persistence.*;
import java.time.ZonedDateTime;

@Entity
@Table(name = "blog_monthly_visits")
@JsonIgnoreProperties(value = {"hibernateLazyInitializer"})
@Setter
@Getter
public class BlogMonthlyVisits {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY) // 对应自增主键
    private Long id;

    @Column(name = "year_month", length = 6, nullable = false, unique = true)
    private String yearMonth; // 年月标识，格式为YYYYMM（如202510）

    @Column(name = "total_visits", nullable = false)
    private Long totalVisits; // 当月总访问量

    @Column(name = "record_update_time", nullable = false)
    private ZonedDateTime recordUpdateTime; // 记录最后更新时间，带时区
}
