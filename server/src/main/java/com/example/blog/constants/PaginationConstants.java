package com.example.blog.constants;

/**
 * 分页常量类
 */
public final class PaginationConstants {

    private PaginationConstants() {
        throw new UnsupportedOperationException("This is a utility class and cannot be instantiated");
    }

    /**
     * 默认分页大小
     */
    public static final int DEFAULT_PAGE_SIZE = 8;

    /**
     * 推荐博客列表显示数量
     */
    public static final int RECOMMEND_BLOG_SIZE = 8;
}
