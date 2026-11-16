package com.hanphone.blog.ui.admin

import android.content.Context
import android.net.Uri
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.hanphone.blog.util.adminMessage
import com.hanphone.blog.data.auth.TokenStore
import com.hanphone.blog.data.model.Blog
import com.hanphone.blog.data.model.Tag
import com.hanphone.blog.data.model.Type
import com.hanphone.blog.data.model.User
import com.hanphone.blog.data.repo.AdminRepository
import com.hanphone.blog.util.MediaPicker
import dagger.hilt.android.lifecycle.HiltViewModel
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.launch
import javax.inject.Inject

/**
 * 博客编辑（新建 / 修改）。
 *
 * 正文是 Markdown：富文本模式用 richeditor 的 `setMarkdown / toMarkdown` 往返，
 * 这种往返**不是无损的**（表格、围栏代码块会被重排），所以编辑已有文章默认进源码模式，
 * 由 UI 提示后再切换。
 *
 * 保存时整篇回传：后端 `updateBlog` 忽略 null，但 `published/recommend/commentabled/
 * shareStatement` 是原始 boolean，缺省会被覆盖成 false；`tags` 不传会被清空。
 */
@HiltViewModel
class AdminBlogEditViewModel @Inject constructor(
    @ApplicationContext private val appContext: Context,
    private val repo: AdminRepository,
    savedStateHandle: SavedStateHandle
) : ViewModel() {

    private val blogId: Long = savedStateHandle.get<Long>("blogId") ?: 0L
    val isNew: Boolean get() = blogId == 0L

    var title by mutableStateOf("")
        private set
    var description by mutableStateOf("")
        private set
    var content by mutableStateOf("")
        private set
    var flag by mutableStateOf("原创")
        private set
    var firstPicture by mutableStateOf<String?>(null)
        private set
    var commentabled by mutableStateOf(true)
        private set
    var published by mutableStateOf(true)
        private set
    var recommend by mutableStateOf(false)
        private set

    var types by mutableStateOf<List<Type>>(emptyList())
        private set
    var tags by mutableStateOf<List<Tag>>(emptyList())
        private set
    var selectedType by mutableStateOf<Type?>(null)
        private set
    var selectedTagIds by mutableStateOf<Set<Long>>(emptySet())
        private set

    /** 新建时没有远端数据要等，直接进表单（否则会一直卡在加载态） */
    var loading by mutableStateOf(!isNew)
        private set
    var saving by mutableStateOf(false)
        private set
    var uploadingCover by mutableStateOf(false)
        private set
    var message by mutableStateOf<String?>(null)
        private set
    var saved by mutableStateOf(false)
        private set

    init {
        loadTaxonomy()
        if (!isNew) loadBlog()
    }

    private fun loadTaxonomy() {
        viewModelScope.launch {
            try {
                repo.fullTypes().data?.let { types = it }
                repo.fullTags().data?.let { tags = it }
            } catch (_: Exception) {
                // 分类/标签拉取失败不阻断编辑，保存时会提示「请选择分类」
            }
        }
    }

    private fun loadBlog() {
        val cached = AdminEditBus.blog
        if (cached != null && cached.id == blogId) {
            apply(cached)
            return
        }
        viewModelScope.launch {
            try {
                var page = 1
                while (page <= 10) {
                    val res = repo.blogs(page)
                    val found = res.data?.content?.firstOrNull { it.id == blogId }
                    if (found != null) {
                        apply(found)
                        return@launch
                    }
                    if (page >= (res.data?.totalPages ?: page)) break
                    page++
                }
                message = "找不到这篇博客"
            } catch (e: Exception) {
                message = e.adminMessage("加载失败")
            } finally {
                loading = false
            }
        }
    }

    private fun apply(blog: Blog) {
        title = blog.title
        description = blog.description.orEmpty()
        content = blog.content
        flag = blog.flag ?: "原创"
        firstPicture = blog.firstPicture?.takeIf { it.isNotBlank() }
        commentabled = blog.commentabled
        published = blog.published
        recommend = blog.recommend
        selectedType = blog.type
        selectedTagIds = blog.tags.map { it.id }.toSet()
        loading = false
    }

    fun updateTitle(v: String) { title = v }
    fun updateDescription(v: String) { description = v }
    fun updateContent(v: String) { content = v }
    fun updateFlag(v: String) { flag = v }
    fun updateCommentabled(v: Boolean) { commentabled = v }
    fun updatePublished(v: Boolean) { published = v }
    fun selectType(type: Type) { selectedType = type }
    fun toggleTag(id: Long) {
        selectedTagIds = if (id in selectedTagIds) selectedTagIds - id else selectedTagIds + id
    }
    fun clearCover() { firstPicture = null }

    /** 封面上传：压缩到 JPEG 后进 `blog/blogs` 命名空间 */
    fun uploadCover(uri: Uri) {
        viewModelScope.launch {
            uploadingCover = true
            var temp: java.io.File? = null
            try {
                val media = MediaPicker.prepare(appContext, uri)
                temp = media.file
                val item = repo.uploadFile(media.file, "blog/blogs", media.mimeType)
                if (item.success && item.url != null) {
                    firstPicture = item.url
                } else {
                    message = item.error ?: "封面上传失败"
                }
            } catch (e: Exception) {
                message = e.adminMessage("封面上传失败")
            } finally {
                MediaPicker.cleanup(temp)
                uploadingCover = false
            }
        }
    }

    fun save() {
        if (saving) return
        if (title.isBlank()) { message = "标题不能为空"; return }
        if (description.isBlank()) { message = "摘要不能为空"; return }
        if (content.isBlank()) { message = "正文不能为空"; return }
        val type = selectedType
        if (type == null) { message = "请选择分类"; return }

        val author = TokenStore.userId.value
        val blog = Blog(
            id = if (isNew) 0L else blogId,
            title = title.trim(),
            content = content,
            firstPicture = firstPicture,
            flag = flag,
            commentabled = commentabled,
            recommend = recommend,
            published = published,
            description = description.trim(),
            type = type,
            tags = tags.filter { it.id in selectedTagIds },
            user = author?.let { User(id = it) }
        )

        viewModelScope.launch {
            saving = true
            try {
                val res = if (isNew) repo.createBlog(blog) else repo.saveBlog(blog)
                if (res.flag) {
                    AdminEditBus.blogDirty = true
                    saved = true
                } else {
                    message = res.message.ifBlank { "保存失败" }
                }
            } catch (e: Exception) {
                message = e.adminMessage("保存失败")
            } finally {
                saving = false
            }
        }
    }

    fun consumeMessage() { message = null }
}
