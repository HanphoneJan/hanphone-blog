package com.example.blog.enums;

/**
 * 可收藏的内容类型。
 *
 * <p>刻意不复用带 {@code PROJECT} 的 {@link ContentType}：项目暂不支持收藏，
 * 传 {@code PROJECT} 应返回 400 而不是静默落库。</p>
 */
public enum BookmarkType {
    BLOG,
    ESSAY,
    DOC
}
