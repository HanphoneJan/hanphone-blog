package com.example.blog;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import java.io.BufferedReader;
import java.io.FileReader;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;

@SpringBootApplication
public class BlogApplication {

    public static void main(String[] args) {
        // 手动加载 .env 文件到 System Properties
        loadDotEnv();

        SpringApplication.run(BlogApplication.class, args);
    }

    private static void loadDotEnv() {
        // 尝试多个可能的路径
        String[] possiblePaths = {
                System.getProperty("user.dir") + "/.env",
                "/home/hanphone/develop-projects/hanphone-blog-server/.env",
                "./.env",
                "../.env"
        };

        for (String envPath : possiblePaths) {
            Path path = Paths.get(envPath);
            if (Files.exists(path)) {
                System.out.println("Loading .env from: " + envPath);
                try (BufferedReader reader = new BufferedReader(new FileReader(envPath))) {
                    String line;
                    while ((line = reader.readLine()) != null) {
                        line = line.trim();
                        if (line.isEmpty() || line.startsWith("#")) {
                            continue;
                        }

                        int separatorIndex = line.indexOf('=');
                        if (separatorIndex > 0) {
                            String key = line.substring(0, separatorIndex).trim();
                            String value = line.substring(separatorIndex + 1).trim();

                            // 移除引号
                            if ((value.startsWith("\"") && value.endsWith("\"")) ||
                                    (value.startsWith("'") && value.endsWith("'"))) {
                                value = value.substring(1, value.length() - 1);
                            }

                            // 只在未设置时才设置
                            if (System.getProperty(key) == null) {
                                System.setProperty(key, value);
                            }
                        }
                    }
                    System.out.println("Successfully loaded .env file");
                    return;
                } catch (Exception e) {
                    System.err.println("Error loading .env: " + e.getMessage());
                }
            }
        }
        System.err.println("Warning: .env file not found in any expected location");
    }
}
