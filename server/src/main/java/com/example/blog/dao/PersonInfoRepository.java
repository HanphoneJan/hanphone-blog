package com.example.blog.dao;

import com.example.blog.po.PersonInfo;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface PersonInfoRepository extends JpaRepository<PersonInfo, Long> {
    List<PersonInfo> findByCategory(String category);
}
