package com.example.blog.enums;

import com.fasterxml.jackson.annotation.JsonValue;

/**
 * 内容类型枚举
 */
public enum ContentType {
    /**
     * 博客
     */
    BLOG("博客"),

    /**
     * 随笔
     */
    ESSAY("随笔"),

    /**
     * 项目
     */
    PROJECT("项目"),

    /**
     * 文章
     */
    DOC("文章");

    private final String label;

    ContentType(String label) {
        this.label = label;
    }

    public String getLabel() {
        return label;
    }

    public String getName() {
        return name();
    }
}
