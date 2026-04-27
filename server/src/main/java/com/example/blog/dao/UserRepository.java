package com.example.blog.dao;

import com.example.blog.po.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface UserRepository extends JpaRepository<User,Long> {

    User findByUsername(String username);
    User findByEmail(String email);
    @Modifying
    @Query("UPDATE User e SET e.password = :hashedPassword WHERE e.id = :userId")
    int resetPassword(@Param("userId") Long id, @Param("hashedPassword") String hashedPassword);
    @Query("SELECT u FROM User u WHERE u.email = :email AND u.id != :userId")
    User findByEmailAndExcludeId(@Param("email") String email, @Param("userId") Long userId);
}
