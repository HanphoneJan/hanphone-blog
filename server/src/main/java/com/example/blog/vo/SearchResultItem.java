package com.example.blog.vo;

import com.example.blog.enums.ContentType;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class SearchResultItem {
    private Long id;
    private String title;
    private String description;
    private ContentType contentType;
    private String url;
    private boolean external;
    private int score;
    private LocalDateTime updateTime;

    public SearchResultItem(Long id, String title, String description,
                            ContentType contentType, String url,
                            boolean external, int score) {
        this.id = id;
        this.title = title;
        this.description = description;
        this.contentType = contentType;
        this.url = url;
        this.external = external;
        this.score = score;
    }
}
