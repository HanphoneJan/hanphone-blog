package com.example.blog.dao;

import com.example.blog.po.Notification;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface NotificationRepository extends JpaRepository<Notification, Long> {

    Page<Notification> findByUserIdOrderByCreateTimeDesc(Long userId, Pageable pageable);

    /**
     * 未读数。
     *
     * <p>显式 JPQL，避免 {@code IsReadFalse} 派生查询在布尔属性名 {@code isRead} 上的解析歧义。</p>
     */
    @Query("select count(n) from Notification n where n.userId = :uid and n.isRead = false")
    long countUnread(@Param("uid") Long userId);

    @Modifying
    @Query("update Notification n set n.isRead = true where n.userId = :uid and n.isRead = false")
    int markAllRead(@Param("uid") Long userId);
}
