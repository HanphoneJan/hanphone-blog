package com.example.blog.service;

import com.example.blog.util.GeoIpUtils;

public interface VisitorTrackService {
    // 记录一次访问（fire-and-forget）：取 IP → 定位 → 入缓冲，由定时任务批量落库
    void track(String ip, GeoIpUtils.Location location);

    // 立即把缓冲数据 flush 到 DB（供测试与定时任务复用）
    int flushBuffer();

    long getBufferedCount();

    // 丢弃缓冲（仅清空不写库），供清理操作使用
    void discardBuffer();
}