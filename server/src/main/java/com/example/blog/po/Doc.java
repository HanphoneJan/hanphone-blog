package com.example.blog.po;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.Data;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "t_doc")
@JsonIgnoreProperties(value = {"hibernateLazyInitializer"})
@Data
public class Doc {

    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "doc_seq")
    @SequenceGenerator(name = "doc_seq", sequenceName = "t_doc_id_seq", allocationSize = 1)
    private Long id;

    @Column(name = "doc_id", unique = true, nullable = false, length = 64)
    private String docId;

    @Column(nullable = false, length = 255)
    private String title;

    @Column(length = 512)
    private String description;

    @Column(nullable = false, length = 512)
    private String filename;

    @Column(name = "file_type", nullable = false, length = 20)
    private String fileType;

    @Column(name = "doc_namespace", length = 64)
    private String docNamespace = "blog/docs";

    @Column(name = "view_count")
    private Long viewCount = 0L;

    private Boolean recommend = false;

    private Boolean published = false;

    @Column(name = "create_time")
    private LocalDateTime createTime;

    @Column(name = "update_time")
    private LocalDateTime updateTime;

    @PrePersist
    protected void onCreate() {
        createTime = LocalDateTime.now();
        updateTime = LocalDateTime.now();
        if (viewCount == null) {
            viewCount = 0L;
        }
        if (recommend == null) {
            recommend = false;
        }
        if (published == null) {
            published = false;
        }
        if (docNamespace == null) {
            docNamespace = "blog/docs";
        }
    }

    @PreUpdate
    protected void onUpdate() {
        updateTime = LocalDateTime.now();
    }
}
