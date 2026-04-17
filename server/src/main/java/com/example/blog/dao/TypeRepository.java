package com.example.blog.dao;

import com.example.blog.po.Type;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;


@Repository
public interface TypeRepository extends JpaRepository<Type,Long> {
    Type findByName(String name);

    @Query("select t from Type t where t.id <> ?1 and t.name = ?2")
    List<Type> findByNameExceptSelf(Long id,String name);

    @Query("select t from Type t")
    List<Type> findTop(Pageable pageable);

}
