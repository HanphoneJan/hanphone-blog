package com.example.blog.vo;

import lombok.Data;

/**
 * 模型厂商（归一后的规范名），用于对比页「按公司」选择。
 */
@Data
public class VendorVO {

    /** 规范名（如 Alibaba / Z.ai） */
    private String key;

    /** 展示名（当前与 key 相同） */
    private String label;

    /** 该公司模型数 */
    private int modelCount;

    /** 是否重点厂商（置顶展示） */
    private boolean focused;

    /** 重点排序：越小越靠前；非重点为 Integer.MAX_VALUE */
    private int priority;
}
