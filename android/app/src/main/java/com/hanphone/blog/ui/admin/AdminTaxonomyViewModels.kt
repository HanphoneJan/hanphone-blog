package com.hanphone.blog.ui.admin

import android.content.Context
import android.net.Uri
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.viewModelScope
import com.hanphone.blog.data.model.Tag
import com.hanphone.blog.data.model.TagBlogCount
import com.hanphone.blog.data.model.Type
import com.hanphone.blog.data.repo.AdminRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.launch
import javax.inject.Inject

/** 标签：带关联文章数的列表 + 增删改 */
@HiltViewModel
class AdminTagsViewModel @Inject constructor(
    private val repo: AdminRepository
) : AdminListViewModel<TagBlogCount>(paged = false) {

    init { start() }

    override suspend fun fetchPage(page: Int, keyword: String): AdminPage<TagBlogCount> =
        AdminPage(repo.tagsWithCount().data.orEmpty())

    fun save(id: Long?, name: String, done: () -> Unit) {
        if (name.isBlank()) {
            notify("标签名不能为空")
            return
        }
        viewModelScope.launch {
            val err = adminOp("保存失败") { repo.saveTag(id, name.trim()) }
            if (err != null) return@launch notify(err)
            done()
            refresh()
        }
    }

    fun delete(tag: TagBlogCount) {
        viewModelScope.launch {
            val err = adminOp("删除失败（可能仍有关联文章）") { repo.deleteTag(tag.id) }
            if (err != null) return@launch notify(err)
            items = items.filterNot { it.id == tag.id }
            notify("已删除")
        }
    }
}

/** 分类：增删改（分类色由后端固定为 blue，分类图可上传） */
@HiltViewModel
class AdminTypesViewModel @Inject constructor(
    @ApplicationContext private val appContext: Context,
    private val repo: AdminRepository
) : AdminListViewModel<Type>(paged = false) {

    init { start() }

    /** 分类图上传中（由页面上的 [AdminImageField] 显示转圈） */
    var uploadingPic by mutableStateOf(false)
        private set

    override suspend fun fetchPage(page: Int, keyword: String): AdminPage<Type> =
        AdminPage(repo.fullTypes().data.orEmpty())

    /** 相册选图 → 上传，成功后把 URL 回给表单；失败提示并回 null */
    fun uploadTypeImage(uri: Uri, onDone: (String?) -> Unit) {
        if (uploadingPic) return
        viewModelScope.launch {
            uploadingPic = true
            try {
                val url = repo.uploadImage(appContext, uri, "blog/type")
                if (url == null) notify("分类图上传失败")
                onDone(url)
            } finally {
                uploadingPic = false
            }
        }
    }

    fun save(id: Long?, name: String, picUrl: String?, done: () -> Unit) {
        if (name.isBlank()) {
            notify("分类名不能为空")
            return
        }
        viewModelScope.launch {
            val err = adminOp("保存失败") { repo.saveType(id, name.trim(), picUrl?.takeIf { it.isNotBlank() }) }
            if (err != null) return@launch notify(err)
            done()
            refresh()
        }
    }

    fun delete(type: Type, syncDeleteImage: Boolean = true) {
        viewModelScope.launch {
            val err = adminOp("删除失败") { repo.deleteType(type.id, syncDeleteImage) }
            if (err != null) return@launch notify(err)
            items = items.filterNot { it.id == type.id }
            notify("已删除")
        }
    }
}

/** 标签/分类共用的小工具：把标签转成 Tag（保存时只需要 id/name） */
fun TagBlogCount.toTag(): Tag = Tag(id = id, name = name)
