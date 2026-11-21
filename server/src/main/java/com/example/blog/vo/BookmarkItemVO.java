package com.example.blog.vo;

import com.example.blog.enums.BookmarkType;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Date;

/**
 * 收藏列表条目。
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class BookmarkItemVO {

    private BookmarkType type;
    /** BLOG / ESSAY 为数值 ID 字符串，DOC 为 docId */
    private String key;
    private String title;
    private String subtitle;
    private String cover;
    private String url;
    private Date createdAt;
}
