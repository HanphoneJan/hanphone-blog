package com.example.blog.vo;

import lombok.Data;

import java.util.ArrayList;
import java.util.Date;
import java.util.List;

/**
 * 洞察总览。
 */
@Data
public class HotOverviewVO {

    /** 全局最后成功采集时间 */
    private Date updatedAt;

    private int sourceTotal;
    private int sourceHealthy;
    private long itemTotal;

    private List<HotCategoryVO> categories = new ArrayList<>();

    /** 各分类热门预览 */
    private List<HotFeedItemVO> topItems = new ArrayList<>();
}
