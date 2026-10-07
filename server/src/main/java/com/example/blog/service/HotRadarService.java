package com.example.blog.service;

import com.example.blog.vo.HotFeedItemVO;
import com.example.blog.vo.HotOverviewVO;
import com.example.blog.vo.HotSourceStatusVO;

import java.util.List;

/**
 * 洞察只读查询服务。
 */
public interface HotRadarService {

    HotOverviewVO getOverview();

    List<HotFeedItemVO> getFeed(String category, int limit);

    List<HotSourceStatusVO> getSources();
}
