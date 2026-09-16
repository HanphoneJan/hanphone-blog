package com.example.blog.dao;

import com.example.blog.po.BlogMonthlyVisits;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.ZonedDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface BlogMonthlyVisitsRepository extends JpaRepository<BlogMonthlyVisits, Long> {

    // 根据年月标识查询记录
    Optional<BlogMonthlyVisits> findByYearMonth(String yearMonth);

    // 查询除了当前记录外是否存在相同的年月标识（用于更新时的唯一性校验）
    @Query("select b from BlogMonthlyVisits b where b.id <> ?1 and b.yearMonth = ?2")
    List<BlogMonthlyVisits> findByYearMonthExceptSelf(Long id, String yearMonth);

    // 查询最新的N条访问记录，按年月倒序排列
    @Query("select b from BlogMonthlyVisits b order by b.yearMonth desc")
    List<BlogMonthlyVisits> findLatestVisits(int limit);

    // 查询指定年份的所有月度访问记录
    @Query("select b from BlogMonthlyVisits b where substring(b.yearMonth, 1, 4) = ?1 order by b.yearMonth asc")
    List<BlogMonthlyVisits> findByYear(String year);

    // 查询最近半年的访问记录
    @Query("select b from BlogMonthlyVisits b where b.yearMonth >= ?1 order by b.yearMonth asc")
    List<BlogMonthlyVisits> findLastSixMonths(String sixMonthsAgoYearMonth);

    // 使用数据库聚合查询总访问量，避免查全表
    @Query("select coalesce(sum(b.totalVisits), 0) from BlogMonthlyVisits b")
    Long sumTotalVisits();

    // 原子自增当月访问量（recordUpdateTime 用绑定参数匹配 ZonedDateTime 字段）
    @Modifying
    @Query("UPDATE BlogMonthlyVisits b SET b.totalVisits = b.totalVisits + 1, b.recordUpdateTime = :ts WHERE b.yearMonth = :yearMonth")
    int incrementVisits(@Param("yearMonth") String yearMonth, @Param("ts") ZonedDateTime ts);

    // 单条语句完成「当月记录不存在则插入、存在则自增」，避免先查后插的竞态与额外往返
    @Modifying
    @Query(value = "INSERT INTO blog_monthly_visits (year_month, total_visits, record_update_time) "
            + "VALUES (:yearMonth, 1, :ts) "
            + "ON CONFLICT (year_month) DO UPDATE SET "
            + "total_visits = blog_monthly_visits.total_visits + 1, record_update_time = :ts",
            nativeQuery = true)
    int upsertIncrementVisits(@Param("yearMonth") String yearMonth, @Param("ts") ZonedDateTime ts);
}
