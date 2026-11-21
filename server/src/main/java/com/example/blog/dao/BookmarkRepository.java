package com.example.blog.dao;

import com.example.blog.enums.BookmarkType;
import com.example.blog.po.Bookmark;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface BookmarkRepository extends JpaRepository<Bookmark, Long> {

    Optional<Bookmark> findByUserIdAndContentTypeAndContentKey(Long userId, BookmarkType contentType, String contentKey);

    List<Bookmark> findByUserIdOrderByCreateTimeDesc(Long userId);

    List<Bookmark> findByUserIdAndContentTypeOrderByCreateTimeDesc(Long userId, BookmarkType contentType);

    boolean existsByUserIdAndContentTypeAndContentKey(Long userId, BookmarkType contentType, String contentKey);
}
