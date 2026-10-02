-- 随笔图片缩略图：新增原图宽高与缩略图地址
--
-- 背景：随笔图片与照片墙同源（原图存 admin-file，单张最大 12MB）。
-- 单篇随笔最多挂了 8 张图，一篇就要下 ~38MB，在 2C/2G 的服务器和移动网络上必然加载失败。
-- admin-file 上传时已会生成 320w/800w/1600w 的 WebP 缩略图，这里补上落库字段。
--
-- 字段说明：
--   width       原图宽度（px，已按 EXIF Orientation 修正）
--   height      原图高度（px，已按 EXIF Orientation 修正）
--   thumb_path  列表页/九宫格用的小图完整 URL（800w，回退 320w）
--
-- 兼容：老数据与外链附件这三列为 NULL，前端会透明回退到原图。
-- 执行：psql -d blog -f 002_essay_thumbnail.sql（幂等，可重复执行）

ALTER TABLE public.t_essay_url
    ADD COLUMN IF NOT EXISTS width integer,
    ADD COLUMN IF NOT EXISTS height integer,
    ADD COLUMN IF NOT EXISTS thumb_path character varying(512);

COMMENT ON COLUMN public.t_essay_url.width IS '原图宽度(px)，已按 EXIF Orientation 修正';
COMMENT ON COLUMN public.t_essay_url.height IS '原图高度(px)，已按 EXIF Orientation 修正';
COMMENT ON COLUMN public.t_essay_url.thumb_path IS '列表页/九宫格用的小图 URL(800w，回退 320w)';