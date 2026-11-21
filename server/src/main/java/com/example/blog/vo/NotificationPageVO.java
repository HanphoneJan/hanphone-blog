package com.example.blog.vo;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * 通知列表分页结果。
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class NotificationPageVO {

    private List<NotificationVO> items;
    private int page;
    private int size;
    private long total;
    /** 当前未读数 */
    private long unread;
}
