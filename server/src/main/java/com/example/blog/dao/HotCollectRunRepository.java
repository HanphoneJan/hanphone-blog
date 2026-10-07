package com.example.blog.dao;

import com.example.blog.po.HotCollectRun;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface HotCollectRunRepository extends JpaRepository<HotCollectRun, Long> {

    List<HotCollectRun> findTop10ByOrderByStartedAtDesc();
}
