package com.hanphone.blog.ui.admin

import androidx.lifecycle.viewModelScope
import com.hanphone.blog.data.model.Tag
import com.hanphone.blog.data.model.TagBlogCount
import com.hanphone.blog.data.model.Type
import com.hanphone.blog.data.repo.AdminRepository
import dagger.hilt.android.lifecycle.HiltViewModel
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
    private val repo: AdminRepository
) : AdminListViewModel<Type>(paged = false) {

    init { start() }

    override suspend fun fetchPage(page: Int, keyword: String): AdminPage<Type> =
        AdminPage(repo.fullTypes().data.orEmpty())

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
