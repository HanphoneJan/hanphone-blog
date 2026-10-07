package com.example.blog.vo;

import lombok.Data;

import java.util.Date;

/**
 * 洞察信源健康状态。
 */
@Data
public class HotSourceStatusVO {

    private String sourceKey;
    private String category;
    private String displayName;
    private String sourceUrl;
    private boolean enabled;
    private Integer itemCount;
    private String lastStatus;
    private Date lastRunAt;
    private Date lastSuccessAt;
    private String lastError;
}
