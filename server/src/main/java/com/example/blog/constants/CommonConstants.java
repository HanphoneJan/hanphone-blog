package com.example.blog.constants;

/**
 * 通用常量类
 */
public final class CommonConstants {

    private CommonConstants() {
        throw new UnsupportedOperationException("This is a utility class and cannot be instantiated");
    }

    /**
     * 默认父ID（用于评论、消息等，表示没有父级）
     */
    public static final long DEFAULT_PARENT_ID = -1L;

    /**
     * 点赞增加量
     */
    public static final int LIKE_INCREMENT = 1;

    /**
     * 点赞减少量
     */
    public static final int LIKE_DECREMENT = -1;
}
