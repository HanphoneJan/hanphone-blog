package com.example.blog.service;

import com.example.blog.enums.BookmarkType;
import com.example.blog.vo.BookmarkItemVO;

import java.util.List;

/**
 * 收藏：博客 / 随笔 / 文档统一存储。
 *
 * <p>接口语义是显式的「添加 / 删除」而不是 toggle，保证客户端重试安全：
 * 重复添加成功、删除不存在的内容也成功。</p>
 */
public interface BookmarkService {

    /**
     * 添加收藏。内容必须存在且已发布。
     *
     * @throws IllegalArgumentException key 非法或内容不存在 / 未发布
     */
    void add(Long userId, BookmarkType type, String key);

    /**
     * 取消收藏（不存在也视为成功）。
     */
    void remove(Long userId, BookmarkType type, String key);

    /**
     * 收藏列表，按收藏时间倒序；已删除 / 未发布的内容会被跳过。
     *
     * @param typeOrNull 为空表示全部类型
     */
    List<BookmarkItemVO> list(Long userId, BookmarkType typeOrNull);

    /**
     * 是否已收藏。
     */
    boolean status(Long userId, BookmarkType type, String key);
}
