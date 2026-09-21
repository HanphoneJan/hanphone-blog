package com.example.blog.util;

import com.maxmind.geoip2.DatabaseReader;
import com.maxmind.geoip2.model.CityResponse;
import com.maxmind.geoip2.record.Country;
import com.maxmind.geoip2.record.Subdivision;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import jakarta.annotation.PostConstruct;
import jakarta.annotation.PreDestroy;
import java.io.File;
import java.net.InetAddress;

@Component
public class GeoIpUtils {

    private static final Logger logger = LoggerFactory.getLogger(GeoIpUtils.class);

    private DatabaseReader reader;

    @Value("${geo.db-path:}")
    private String dbPath;

    // 结果记录：country/province/city，任一可能为 null（库缺失或未命中 → 未知区域）
    public record Location(String country, String province, String city) {
        public boolean isUnknown() {
            return (country == null || country.isEmpty())
                    && (province == null || province.isEmpty())
                    && (city == null || city.isEmpty());
        }
    }

    @PostConstruct
    public void init() {
        if (dbPath == null || dbPath.isBlank()) {
            logger.warn("GEO_DB_PATH 未配置，访客 IP 区域解析将降级为未知区域");
            return;
        }
        File dbFile = new File(dbPath);
        if (!dbFile.exists() || !dbFile.isFile()) {
            logger.warn("GeoLite2 mmdb 文件不存在: {}，访客 IP 区域解析将降级为未知区域", dbPath);
            return;
        }
        try {
            this.reader = new DatabaseReader.Builder(dbFile)
                    // 国家名用英文，保证与前端世界地图 world.json 的 features[].properties.name 一致（前端再映射中文）
                    .locales(java.util.List.of("en"))
                    .build();
            logger.info("DB-IP / MaxMind mmdb 数据库加载成功: {}", dbPath);
        } catch (Exception e) {
            logger.warn("IP 定位数据库加载失败，降级为未知区域: {}", e.getMessage());
        }
    }

    @PreDestroy
    public void close() {
        if (reader != null) {
            try {
                reader.close();
            } catch (Exception ignored) {
                // ignore close errors
            }
        }
    }

    // 解析 IP 到国家/省份/城市；库缺失或解析失败返回未知区域（全 null），不抛错。
    public Location lookup(String ip) {
        if (reader == null || ip == null || ip.isBlank()) {
            return new Location(null, null, null);
        }
        try {
            InetAddress addr = InetAddress.getByName(ip);
            CityResponse response = reader.city(addr);
            Country country = response.getCountry();
            String countryName = country != null ? country.getName() : null;
            Subdivision sub = response.getMostSpecificSubdivision();
            String province = sub != null ? sub.getName() : null;
            String cityName = response.getCity() != null ? response.getCity().getName() : null;
            return new Location(countryName, province, cityName);
        } catch (Exception e) {
            // 私有 IP / 保留地址 / 解析异常 → 未知区域，不抛错
            return new Location(null, null, null);
        }
    }

    // 供测试注入 reader
    void setReader(DatabaseReader reader) {
        this.reader = reader;
    }
}