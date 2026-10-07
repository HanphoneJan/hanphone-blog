package com.example.blog.vo;

import lombok.Data;

import java.util.Date;

/**
 * 洞察热点流条目。
 */
@Data
public class HotFeedItemVO {

    private String sourceKey;
    private String category;
    private String itemKey;
    private String title;
    private String titleZh;
    private String summaryZh;
    private String url;
    private String author;
    private String tags;
    private Double score;
    private Integer rank;
    private Date publishedAt;
    private Date firstSeenAt;
    private Date lastSeenAt;
}
