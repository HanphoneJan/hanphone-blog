package com.example.blog.dao;

import com.example.blog.po.BlogMonthlyVisits;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

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
}
