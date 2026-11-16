package com.hanphone.blog.util

import android.content.Context
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Matrix
import android.net.Uri
import androidx.exifinterface.media.ExifInterface
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.io.File
import java.io.FileOutputStream

/**
 * 相册选择 → 上传前的本地处理。
 *
 * 为什么必须压缩：服务端只有 2C2G，手机原图单张 10MB+、一篇随笔最多 9 张，
 * 直传会同时打满上行带宽和内存。网页版用 Compressor(0.8 / 1280)，这里对齐到
 * 长边 1600 / JPEG 0.85（比网页稍高，因为 App 详情页看的是原图）。
 *
 * EXIF：Android 相册里的竖拍照片通常把方向写在 EXIF 里，BitmapFactory 解码不会
 * 自动旋转，不处理就会出现「上传后横躺」。这里按 EXIF 度数转正后再压缩。
 *
 * 视频/文档不压缩，原样复制到缓存目录（服务端会异步转 HLS）。
 */
object MediaPicker {

    private const val MAX_IMAGE_SIDE = 1600
    private const val JPEG_QUALITY = 85

    /** 选择结果的归类，与后端 `url_type` 取值一致（大写） */
    enum class Kind { IMAGE, VIDEO, TEXT, OTHER }

    data class PickedMedia(
        val file: File,
        val name: String,
        val mimeType: String,
        val kind: Kind
    )

    /**
     * 把一个 content Uri 变成可直接上传的本地文件。
     * 图片会压缩 + 纠正方向；其余类型只复制。
     */
    suspend fun prepare(context: Context, uri: Uri, displayName: String? = null): PickedMedia =
        withContext(Dispatchers.IO) {
            val mime = context.contentResolver.getType(uri) ?: "application/octet-stream"
            val rawName = displayName ?: queryDisplayName(context, uri) ?: fallbackName(mime)
            val kind = kindOf(mime, rawName)

            if (kind == Kind.IMAGE) {
                val src = copyToCache(context, uri, "src_$rawName")
                val out = try {
                    compressImage(src, rawName)
                } catch (e: Exception) {
                    // 压缩失败就退回原文件（例如 HEIF 解码失败），至少不要阻断上传
                    src
                }
                PickedMedia(
                    file = out,
                    name = out.name,
                    mimeType = if (out == src) mime else "image/jpeg",
                    kind = Kind.IMAGE
                )
            } else {
                val dst = copyToCache(context, uri, rawName)
                PickedMedia(dst, rawName, mime, kind)
            }
        }

    private fun kindOf(mime: String, name: String): Kind {
        val lower = name.lowercase()
        return when {
            mime.startsWith("image/") -> Kind.IMAGE
            mime.startsWith("video/") -> Kind.VIDEO
            mime.startsWith("text/") || lower.endsWith(".md") || lower.endsWith(".txt") -> Kind.TEXT
            else -> Kind.OTHER
        }
    }

    private fun fallbackName(mime: String): String {
        val ext = mime.substringAfter('/', "bin").substringBefore('+')
        return "upload_${System.currentTimeMillis()}.$ext"
    }

    private fun queryDisplayName(context: Context, uri: Uri): String? = runCatching {
        context.contentResolver.query(uri, null, null, null, null)?.use { c ->
            val idx = c.getColumnIndex(android.provider.OpenableColumns.DISPLAY_NAME)
            if (idx >= 0 && c.moveToFirst()) c.getString(idx) else null
        }
    }.getOrNull()

    private fun sanitize(name: String): String =
        name.replace(Regex("""[\\/:*?"<>|\s]+"""), "_").take(80).ifBlank { "file" }

    private fun copyToCache(context: Context, uri: Uri, name: String): File {
        val dir = File(context.cacheDir, "admin_upload").apply { mkdirs() }
        val out = File(dir, "${System.currentTimeMillis()}_${sanitize(name)}")
        context.contentResolver.openInputStream(uri)?.use { input ->
            out.outputStream().use { output -> input.copyTo(output) }
        } ?: throw IllegalStateException("无法读取所选文件")
        return out
    }

    private fun compressImage(src: File, name: String): File {
        val bounds = BitmapFactory.Options().apply { inJustDecodeBounds = true }
        BitmapFactory.decodeFile(src.absolutePath, bounds)
        if (bounds.outWidth <= 0 || bounds.outHeight <= 0) return src

        var sample = 1
        while (bounds.outWidth / sample > MAX_IMAGE_SIDE * 2 && bounds.outHeight / sample > MAX_IMAGE_SIDE * 2) {
            sample *= 2
        }

        val decoded = BitmapFactory.decodeFile(
            src.absolutePath,
            BitmapFactory.Options().apply { inSampleSize = sample }
        ) ?: return src

        val rotated = applyExifRotation(src, decoded)
        val scaled = scaleDown(rotated, MAX_IMAGE_SIDE)

        val dir = File(src.parentFile, "").apply { mkdirs() }
        val stem = name.substringBeforeLast('.', name).let(::sanitize)
        val out = File(dir, "$stem.jpg")
        FileOutputStream(out).use { scaled.compress(Bitmap.CompressFormat.JPEG, JPEG_QUALITY, it) }

        if (scaled != rotated) rotated.recycle()
        if (rotated != decoded) decoded.recycle()
        scaled.recycle()
        return out
    }

    private fun applyExifRotation(src: File, bitmap: Bitmap): Bitmap {
        val degrees = runCatching {
            when (ExifInterface(src.absolutePath).getAttributeInt(
                ExifInterface.TAG_ORIENTATION,
                ExifInterface.ORIENTATION_NORMAL
            )) {
                ExifInterface.ORIENTATION_ROTATE_90 -> 90f
                ExifInterface.ORIENTATION_ROTATE_180 -> 180f
                ExifInterface.ORIENTATION_ROTATE_270 -> 270f
                else -> 0f
            }
        }.getOrDefault(0f)

        if (degrees == 0f) return bitmap
        val matrix = Matrix().apply { postRotate(degrees) }
        return Bitmap.createBitmap(bitmap, 0, 0, bitmap.width, bitmap.height, matrix, true)
    }

    private fun scaleDown(bitmap: Bitmap, maxSide: Int): Bitmap {
        val longest = maxOf(bitmap.width, bitmap.height)
        if (longest <= maxSide) return bitmap
        val ratio = maxSide.toFloat() / longest
        return Bitmap.createScaledBitmap(
            bitmap,
            (bitmap.width * ratio).toInt().coerceAtLeast(1),
            (bitmap.height * ratio).toInt().coerceAtLeast(1),
            true
        )
    }

    /** 上传后清理临时文件（失败也无所谓，缓存在 App 缓存目录） */
    fun cleanup(vararg files: File?) {
        files.filterNotNull().forEach { runCatching { it.delete() } }
    }
}
