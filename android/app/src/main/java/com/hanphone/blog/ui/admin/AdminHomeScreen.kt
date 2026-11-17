package com.hanphone.blog.ui.admin

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Book
import androidx.compose.material.icons.filled.Build
import androidx.compose.material.icons.filled.Description
import androidx.compose.material.icons.filled.Email
import androidx.compose.material.icons.filled.Folder
import androidx.compose.material.icons.filled.Insights
import androidx.compose.material.icons.filled.LocalFireDepartment
import androidx.compose.material.icons.filled.People
import androidx.compose.material.icons.filled.Share
import androidx.compose.material.icons.filled.TravelExplore
import androidx.compose.material.icons.filled.EditNote
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp

/**
 * 管理中心：仅管理员可见（入口在「我的」页，由 TokenStore.isAdmin 控制）。
 * 纯入口列表，不放统计数据——统计在「站点概览」里。
 */
@Composable
fun AdminHomeScreen(
    onBack: () -> Unit,
    onOpenDashboard: () -> Unit,
    onOpenVisitors: () -> Unit,
    onOpenEssays: () -> Unit,
    onOpenBlogs: () -> Unit,
    onOpenComments: () -> Unit,
    onOpenTags: () -> Unit,
    onOpenTypes: () -> Unit,
    onOpenFriendLinks: () -> Unit,
    onOpenProjects: () -> Unit,
    onOpenDocs: () -> Unit,
    onOpenUsers: () -> Unit,
    onOpenInsight: () -> Unit
) {
    AdminScaffold(title = "管理中心", onBack = onBack) {
        Column(Modifier.fillMaxSize().verticalScroll(rememberScrollState())) {
            Text(
                "内容发布后，网页文章详情页需要重新构建部署才会更新；随笔列表 5 分钟内自动刷新。",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier.padding(vertical = 10.dp)
            )
            AdminSectionTitle("内容")
            AdminEntry(Icons.Filled.EditNote, "随笔", "发布 / 编辑 / 附件上传", onOpenEssays)
            AdminDivider()
            AdminEntry(Icons.Filled.Description, "博客", "列表管理 · Markdown 编辑", onOpenBlogs)
            AdminDivider()
            AdminEntry(Icons.Filled.Email, "评论", "查看与删除", onOpenComments)
            AdminDivider()
            AdminEntry(Icons.Filled.Folder, "文库", "文件 · 教程 · 参考资料", onOpenDocs)

            AdminSectionTitle("分类与链接")
            AdminEntry(Icons.Filled.Book, "标签", "增删改 · 关联文章数", onOpenTags)
            AdminDivider()
            AdminEntry(Icons.Filled.Book, "分类", "增删改 · 分类图", onOpenTypes)
            AdminDivider()
            AdminEntry(Icons.Filled.Share, "友链", "审核 / 推荐 / 编辑", onOpenFriendLinks)
            AdminDivider()
            AdminEntry(Icons.Filled.Build, "项目", "作品展示维护", onOpenProjects)

            AdminSectionTitle("站点")
            AdminEntry(Icons.Filled.Insights, "站点概览", "访问 / 评论 / 点赞趋势", onOpenDashboard)
            AdminDivider()
            AdminEntry(Icons.Filled.TravelExplore, "访客明细", "UV / PV · IP 归属地 · 清理", onOpenVisitors)
            AdminDivider()
            AdminEntry(Icons.Filled.LocalFireDepartment, "聚合数据", "立即采集热点与模型榜单", onOpenInsight)
            AdminDivider()
            AdminEntry(
                Icons.Filled.People,
                "用户",
                "只读：注册用户列表",
                onOpenUsers,
                tint = Color(0xFF7A6FF0)
            )
        }
    }
}
