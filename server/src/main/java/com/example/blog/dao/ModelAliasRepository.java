package com.example.blog.dao;

import com.example.blog.po.ModelAlias;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface ModelAliasRepository extends JpaRepository<ModelAlias, Long> {

    Optional<ModelAlias> findByAlias(String alias);
}
