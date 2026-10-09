package com.example.blog.dao;

import com.example.blog.po.HotCollectRun;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import java.util.List;

public interface HotCollectRunRepository extends JpaRepository<HotCollectRun, Long>,
        JpaSpecificationExecutor<HotCollectRun> {

    List<HotCollectRun> findTop10ByOrderByStartedAtDesc();
}
