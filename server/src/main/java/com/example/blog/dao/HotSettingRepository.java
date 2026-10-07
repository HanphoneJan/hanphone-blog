package com.example.blog.dao;

import com.example.blog.po.HotSetting;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface HotSettingRepository extends JpaRepository<HotSetting, Long> {

    Optional<HotSetting> findBySettingKey(String settingKey);
}
