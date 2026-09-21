package com.example.blog.po;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.Getter;
import lombok.Setter;

import jakarta.persistence.*;
import java.time.ZonedDateTime;

@Entity
@Table(name = "blog_visitor")
@JsonIgnoreProperties(value = {"hibernateLazyInitializer"})
@Setter
@Getter
public class BlogVisitor {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "ip", length = 64, nullable = false, unique = true)
    private String ip;

    @Column(name = "country", length = 128)
    private String country;

    @Column(name = "province", length = 128)
    private String province;

    @Column(name = "city", length = 128)
    private String city;

    @Column(name = "first_visit_time", nullable = false)
    private ZonedDateTime firstVisitTime;

    @Column(name = "last_visit_time", nullable = false)
    private ZonedDateTime lastVisitTime;

    @Column(name = "visit_count", nullable = false)
    private Long visitCount = 1L;
}