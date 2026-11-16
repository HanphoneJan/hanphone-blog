package com.hanphone.blog.ui.admin

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.hanphone.blog.util.adminMessage
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
) : ViewModel() {

    var items by mutableStateOf<List<TagBlogCount>>(emptyList())
        private set
    var loading by mutableStateOf(true)
        private set
    var message by mutableStateOf<String?>(null)
        private set

    init { refresh() }

    fun refresh() {
        viewModelScope.launch {
            loading = true
            try {
                items = repo.tagsWithCount().data.orEmpty()
            } catch (e: Exception) {
                message = e.adminMessage("加载失败")
            } finally {
                loading = false
            }
        }
    }

    fun save(id: Long?, name: String, done: () -> Unit) {
        if (name.isBlank()) {
            message = "标签名不能为空"
            return
        }
        viewModelScope.launch {
            try {
                val res = repo.saveTag(id, name.trim())
                if (res.flag) {
                    done()
                    refresh()
                } else {
                    message = res.message.ifBlank { "保存失败" }
                }
            } catch (e: Exception) {
                message = e.adminMessage("保存失败")
            }
        }
    }

    fun delete(tag: TagBlogCount) {
        viewModelScope.launch {
            try {
                val res = repo.deleteTag(tag.id)
                if (res.flag) {
                    items = items.filterNot { it.id == tag.id }
                    message = "已删除"
                } else {
                    message = res.message.ifBlank { "删除失败（可能仍有关联文章）" }
                }
            } catch (e: Exception) {
                message = e.adminMessage("删除失败（可能仍有关联文章）")
            }
        }
    }

    fun consumeMessage() { message = null }
}

/** 分类：增删改（分类色由后端固定为 blue，分类图可上传） */
@HiltViewModel
class AdminTypesViewModel @Inject constructor(
    private val repo: AdminRepository
) : ViewModel() {

    var items by mutableStateOf<List<Type>>(emptyList())
        private set
    var loading by mutableStateOf(true)
        private set
    var message by mutableStateOf<String?>(null)
        private set

    init { refresh() }

    fun refresh() {
        viewModelScope.launch {
            loading = true
            try {
                items = repo.fullTypes().data.orEmpty()
            } catch (e: Exception) {
                message = e.adminMessage("加载失败")
            } finally {
                loading = false
            }
        }
    }

    fun save(id: Long?, name: String, picUrl: String?, done: () -> Unit) {
        if (name.isBlank()) {
            message = "分类名不能为空"
            return
        }
        viewModelScope.launch {
            try {
                val res = repo.saveType(id, name.trim(), picUrl?.takeIf { it.isNotBlank() })
                if (res.flag) {
                    done()
                    refresh()
                } else {
                    message = res.message.ifBlank { "保存失败" }
                }
            } catch (e: Exception) {
                message = e.adminMessage("保存失败")
            }
        }
    }

    fun delete(type: Type, syncDeleteImage: Boolean = true) {
        viewModelScope.launch {
            try {
                val res = repo.deleteType(type.id, syncDeleteImage)
                if (res.flag) {
                    items = items.filterNot { it.id == type.id }
                    message = "已删除"
                } else {
                    message = res.message.ifBlank { "删除失败" }
                }
            } catch (e: Exception) {
                message = e.adminMessage("删除失败")
            }
        }
    }

    fun consumeMessage() { message = null }
}

/** 标签/分类共用的小工具：把标签转成 Tag（保存时只需要 id/name） */
fun TagBlogCount.toTag(): Tag = Tag(id = id, name = name)
