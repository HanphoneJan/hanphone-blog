package com.example.blog.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import java.util.List;

/**
 * 启动时尽力创建 pg_trgm GIN 索引，加速全局搜索的 ILIKE 匹配。
 *
 * <p>约束：
 * <ul>
 *   <li>{@code search.trgm.enabled=false} 时完全跳过；</li>
 *   <li>先建扩展，失败（如无 superuser 权限）只告警并跳过全部索引；</li>
 *   <li>每条 DDL 独立 try/catch，一条失败不影响后续，绝不阻断应用启动；</li>
 *   <li>不加 CONCURRENTLY：个人博客数据量小，且避免 autocommit / 事务边界问题。</li>
 * </ul>
 *
 * <p>注意：Doc 只有 title/description，没有 content 列，不能建 content 索引。
 */
@Component
public class SearchIndexInitializer implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(SearchIndexInitializer.class);

    private static final String CREATE_EXTENSION_SQL = "CREATE EXTENSION IF NOT EXISTS pg_trgm";

    /** 索引清单：表名与列名都是写死的，不存在注入风险 */
    private static final List<String> INDEX_DDL = List.of(
            "CREATE INDEX IF NOT EXISTS idx_blog_title_trgm ON t_blog USING gin (title gin_trgm_ops)",
            "CREATE INDEX IF NOT EXISTS idx_blog_description_trgm ON t_blog USING gin (description gin_trgm_ops)",
            "CREATE INDEX IF NOT EXISTS idx_blog_content_trgm ON t_blog USING gin (content gin_trgm_ops)",
            "CREATE INDEX IF NOT EXISTS idx_essay_title_trgm ON t_essay USING gin (title gin_trgm_ops)",
            "CREATE INDEX IF NOT EXISTS idx_essay_content_trgm ON t_essay USING gin (content gin_trgm_ops)",
            "CREATE INDEX IF NOT EXISTS idx_project_title_trgm ON t_project USING gin (title gin_trgm_ops)",
            "CREATE INDEX IF NOT EXISTS idx_project_content_trgm ON t_project USING gin (content gin_trgm_ops)",
            "CREATE INDEX IF NOT EXISTS idx_project_techs_trgm ON t_project USING gin (techs gin_trgm_ops)",
            "CREATE INDEX IF NOT EXISTS idx_doc_title_trgm ON t_doc USING gin (title gin_trgm_ops)",
            "CREATE INDEX IF NOT EXISTS idx_doc_description_trgm ON t_doc USING gin (description gin_trgm_ops)"
    );

    private final JdbcTemplate jdbcTemplate;

    @Value("${search.trgm.enabled:true}")
    private boolean enabled = true;

    public SearchIndexInitializer(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @Override
    public void run(ApplicationArguments args) {
        if (!enabled) {
            log.info("search.trgm.enabled=false，跳过 pg_trgm 搜索索引初始化");
            return;
        }

        try {
            jdbcTemplate.execute(CREATE_EXTENSION_SQL);
        } catch (Exception e) {
            log.warn("创建 pg_trgm 扩展失败，跳过全部搜索索引（不影响搜索功能，仅退化为顺序扫描）: {}",
                    e.getMessage());
            return;
        }

        int created = 0;
        for (String ddl : INDEX_DDL) {
            try {
                jdbcTemplate.execute(ddl);
                created++;
            } catch (Exception e) {
                log.warn("创建搜索索引失败，已跳过: {} ({})", ddl, e.getMessage());
            }
        }
        log.info("pg_trgm 搜索索引初始化完成：{}/{} 条成功", created, INDEX_DDL.size());
    }
}
