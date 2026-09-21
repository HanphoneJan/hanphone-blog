package com.example.blog.dao;

import com.example.blog.po.BlogVisitor;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.ZonedDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface BlogVisitorRepository extends JpaRepository<BlogVisitor, Long> {

    Optional<BlogVisitor> findByIp(String ip);

    // 区域聚合（按国家），仅统计国家非空的行
    @Query(value = "SELECT country AS name, count(*) AS visitor_count, sum(visit_count) AS total_visits "
            + "FROM blog_visitor WHERE country IS NOT NULL AND country <> '' "
            + "GROUP BY country ORDER BY total_visits DESC",
            nativeQuery = true)
    List<Object[]> aggregateByCountry();

    // 区域聚合（按省份），仅统计省份非空的行（主要为国内细分）
    @Query(value = "SELECT province AS name, count(*) AS visitor_count, sum(visit_count) AS total_visits "
            + "FROM blog_visitor WHERE province IS NOT NULL AND province <> '' "
            + "GROUP BY province ORDER BY total_visits DESC",
            nativeQuery = true)
    List<Object[]> aggregateByProvince();

    @Query(value = "SELECT count(*) FROM blog_visitor", nativeQuery = true)
    long countAll();

    @Query(value = "SELECT coalesce(sum(visit_count), 0) FROM blog_visitor", nativeQuery = true)
    long sumVisitCount();

    @Query(value = "SELECT count(*) FROM blog_visitor WHERE country IS NULL OR country = ''", nativeQuery = true)
    long countUnknownRegion();

    // 按 IP 原子 upsert：存在则自增 inc+刷新时间+更新非空位置字段，不存在则插入（IP 唯一约束保证并发安全）
    @Modifying
    @Query(value = "INSERT INTO blog_visitor (ip, country, province, city, first_visit_time, last_visit_time, visit_count) "
            + "VALUES (:ip, :country, :province, :city, :ts, :ts, :inc) "
            + "ON CONFLICT (ip) DO UPDATE SET "
            + "visit_count = blog_visitor.visit_count + :inc, "
            + "last_visit_time = :ts, "
            + "country = CASE WHEN :country IS NULL OR :country = '' THEN blog_visitor.country ELSE :country END, "
            + "province = CASE WHEN :province IS NULL OR :province = '' THEN blog_visitor.province ELSE :province END, "
            + "city = CASE WHEN :city IS NULL OR :city = '' THEN blog_visitor.city ELSE :city END",
            nativeQuery = true)
    int upsertVisit(@Param("ip") String ip,
                    @Param("country") String country,
                    @Param("province") String province,
                    @Param("city") String city,
                    @Param("inc") int inc,
                    @Param("ts") ZonedDateTime ts);

    @Modifying
    @Query("delete from BlogVisitor b where b.lastVisitTime < :before")
    int deleteBefore(@Param("before") ZonedDateTime before);

    @Modifying
    @Query("delete from BlogVisitor b")
    int deleteAllVisitors();
}