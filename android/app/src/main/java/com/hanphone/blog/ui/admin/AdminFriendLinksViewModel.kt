package com.hanphone.blog.ui.admin

import android.content.Context
import android.net.Uri
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.hanphone.blog.data.auth.TokenStore
import com.hanphone.blog.data.model.AdminCollectRun
import com.hanphone.blog.data.model.AdminRebuildSummary
import com.hanphone.blog.data.model.AdminSummarySettings
import com.hanphone.blog.data.model.Doc
import com.hanphone.blog.data.model.FriendLink
import com.hanphone.blog.data.model.HotSourceStatus
import com.hanphone.blog.data.model.Project
import com.hanphone.blog.data.model.User
import com.hanphone.blog.data.repo.AdminRepository
import com.hanphone.blog.data.repo.FileRepository
import com.hanphone.blog.ui.components.PullRefreshHost
import com.hanphone.blog.util.MediaPicker
import com.hanphone.blog.util.adminMessage
import com.hanphone.blog.util.decoded
import com.hanphone.blog.util.normalized
import dagger.hilt.android.lifecycle.HiltViewModel
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.Job
import kotlinx.coroutines.async
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import java.io.File
import java.time.LocalDate
import javax.inject.Inject

/** 友链：审核（发布）、推荐、增删改 */
@HiltViewModel
class AdminFriendLinksViewModel @Inject constructor(
    private val repo: AdminRepository
) : AdminListViewModel<FriendLink>(paged = false) {

    init { start() }

    override suspend fun fetchPage(page: Int, keyword: String): AdminPage<FriendLink> =
        AdminPage(repo.friendLinks().data.orEmpty().normalized())

    fun save(link: FriendLink, done: () -> Unit) {
        if (link.name.isBlank() || link.url.isBlank()) {
            notify("名称与链接不能为空")
            return
        }
        viewModelScope.launch {
            val err = adminOp("保存失败") { repo.saveFriendLink(link.decoded()) }
            if (err != null) return@launch notify(err)
            done()
            refresh()
        }
    }

    fun togglePublished(link: FriendLink) {
        viewModelScope.launch {
            val err = adminOp("操作失败") { repo.toggleFriendLinkPublished(link) }
            if (err != null) return@launch notify(err)
            items = items.map { if (it.id == link.id) it.copy(published = link.published != true) else it }
        }
    }

    fun toggleRecommend(link: FriendLink) {
        viewModelScope.launch {
            val err = adminOp("操作失败") { repo.toggleFriendLinkRecommend(link) }
            if (err != null) return@launch notify(err)
            items = items.map { if (it.id == link.id) it.copy(recommend = !link.recommend) else it }
        }
    }

    fun delete(link: FriendLink) {
        viewModelScope.launch {
            val err = adminOp("删除失败") { repo.deleteFriendLink(link.id) }
            if (err != null) return@launch notify(err)
            items = items.filterNot { it.id == link.id }
        }
    }
}
