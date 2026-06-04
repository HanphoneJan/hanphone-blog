  
-- 主机： localhost
-- PHP 版本： 8.0.26

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


--
-- 数据库： `atlas`
--
CREATE DATABASE IF NOT EXISTS `atlas` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;
USE `atlas`;

-- --------------------------------------------------------

--
-- 表的结构 `files` 存储图片数据
--

DROP TABLE IF EXISTS `files`;
CREATE TABLE IF NOT EXISTS `files` (
  `id` varchar(512) COLLATE utf8mb4_general_ci NOT NULL,
  `path` varchar(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `author` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `description` varchar(512) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `title` varchar(24) COLLATE utf8mb4_general_ci NOT NULL,
  `upload_time` varchar(24) COLLATE utf8mb4_general_ci NOT NULL,
  `likes` int NOT NULL DEFAULT '0',
  `type` int NOT NULL DEFAULT '0',
  `username` varchar(64) COLLATE utf8mb4_general_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `id` (`id`),
  KEY `type` (`type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- 表的结构 `files_tag` 桥接表
--

DROP TABLE IF EXISTS `files_tag`;
CREATE TABLE IF NOT EXISTS `files_tag` (
  `files_id` varchar(512) COLLATE utf8mb4_general_ci NOT NULL,
  `tag_id` int NOT NULL,
  PRIMARY KEY (`files_id`,`tag_id`),
  KEY `tag_id` (`tag_id`),
  KEY `files_id` (`files_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- 表的结构 `tag`  标签表
--

DROP TABLE IF EXISTS `tag`;
CREATE TABLE IF NOT EXISTS `tag` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(128) COLLATE utf8mb4_general_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- 表的结构 `type` 图片分类表
--

DROP TABLE IF EXISTS `type`;
CREATE TABLE IF NOT EXISTS `type` (
  `type` int NOT NULL,
  `name` varchar(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  PRIMARY KEY (`type`),
  UNIQUE KEY `name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- 表的结构 `user` 用户表
--

DROP TABLE IF EXISTS `user`;
CREATE TABLE IF NOT EXISTS `user` (
  `username` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `password` varchar(1024) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `is_admin` int NOT NULL,
  `email` varchar(24) COLLATE utf8mb4_general_ci NOT NULL,
  PRIMARY KEY (`email`),
  UNIQUE KEY `username` (`username`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- 表的结构 `visitcounts` 访问量表
--

DROP TABLE IF EXISTS `visitcounts`;
CREATE TABLE IF NOT EXISTS `visitcounts` (
  `id` int NOT NULL AUTO_INCREMENT,
  `visitCount` int NOT NULL DEFAULT '0',
  `last_visit` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- 限制导出的表
--

--
-- 限制表 `files` 
--
ALTER TABLE `files`
  ADD CONSTRAINT `分类唯一` FOREIGN KEY (`type`) REFERENCES `type` (`type`) ON DELETE RESTRICT ON UPDATE RESTRICT;

--
-- 限制表 `files_tag`
--
ALTER TABLE `files_tag`
  ADD CONSTRAINT `文件` FOREIGN KEY (`files_id`) REFERENCES `files` (`id`),
  ADD CONSTRAINT `标签` FOREIGN KEY (`tag_id`) REFERENCES `tag` (`id`);
COMMIT;


