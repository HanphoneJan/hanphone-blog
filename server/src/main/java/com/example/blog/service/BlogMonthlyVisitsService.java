package com.example.blog.service;

import com.example.blog.po.BlogMonthlyVisits;

import java.util.List;
import java.util.Optional;

public interface BlogMonthlyVisitsService {

    // 保存或更新月度访问记录
    BlogMonthlyVisits saveBlogMonthlyVisits(BlogMonthlyVisits blogMonthlyVisits);

    // 根据ID获取记录
    BlogMonthlyVisits getBlogMonthlyVisits(Long id);

    // 根据年月标识获取记录
    Optional<BlogMonthlyVisits> getBlogMonthlyVisitsByYearMonth(String yearMonth);

    // 获取所有月度访问记录
    List<BlogMonthlyVisits> listBlogMonthlyVisits();
    // 获取格式化的月度统计数据
    List<String> getFormattedMonthlyStats(String year);
    // 获取最新的N条访问记录
    List<BlogMonthlyVisits> listLatestVisits(int limit);

    // 获取指定年份的月度访问记录
    List<BlogMonthlyVisits> listByYear(String year);

    // 获取最近半年的月度访问记录
    List<BlogMonthlyVisits> listLastSixMonths();

    // 检查除自身外是否存在相同年月的记录
    List<BlogMonthlyVisits> listByYearMonthExceptSelf(Long id, String yearMonth);

    // 更新月度访问记录
    BlogMonthlyVisits updateBlogMonthlyVisits(Long id, BlogMonthlyVisits blogMonthlyVisits);

    // 删除月度访问记录
    void deleteBlogMonthlyVisits(Long id);

    // 新增：获取所有时间的总阅读量
    Long getTotalVisits();

    // 新增：获取指定年份的总阅读量
    Long getTotalVisitsByYear(String year);

    // 新增方法：递增当前月份的访问量并返回总访问量
    Long incrementAndGetTotalVisits();

    // 新增方法：获取或创建当前月份的访问记录
    BlogMonthlyVisits getOrCreateCurrentMonthRecord();
}
