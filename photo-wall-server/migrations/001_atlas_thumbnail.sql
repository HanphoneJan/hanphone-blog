-- 照片墙缩略图改造：新增宽高与缩略图字段，并把 path 放宽
--
-- 背景：照片墙此前直接展示上传原图（单张最大 12MB），列表页一次进入需拉取数十 MB，
-- 在 2C/2G 的服务器上必然出现加载失败。改为上传时生成多档 WebP 缩略图，
-- 前端列表页用缩略图、预览/下载仍用原图。
--
-- 字段说明：
--   width       原图宽度（px，已按 EXIF Orientation 修正）
--   height      原图高度（px，已按 EXIF Orientation 修正）
--   thumb_path  列表页默认缩略图完整 URL（800w，回退 320w）
--   path        由 varchar(128) 放宽到 varchar(512)：URL 里含域名 + 中文文件名的百分号编码，
--               128 已经很接近上限（现网最长 101）
--
-- 执行方式：psql -d blog -f 001_atlas_thumbnail.sql
-- 幂等：可重复执行

ALTER TABLE public.atlas_files
    ADD COLUMN IF NOT EXISTS width integer,
    ADD COLUMN IF NOT EXISTS height integer,
    ADD COLUMN IF NOT EXISTS thumb_path character varying(512);

-- 只放宽不收窄，兼容低版本 schema
ALTER TABLE public.atlas_files
    ALTER COLUMN path TYPE character varying(512);

COMMENT ON COLUMN public.atlas_files.width IS '原图宽度(px)，已按 EXIF Orientation 修正';
COMMENT ON COLUMN public.atlas_files.height IS '原图高度(px)，已按 EXIF Orientation 修正';
COMMENT ON COLUMN public.atlas_files.thumb_path IS '列表页默认缩略图完整 URL(800w，回退 320w)';