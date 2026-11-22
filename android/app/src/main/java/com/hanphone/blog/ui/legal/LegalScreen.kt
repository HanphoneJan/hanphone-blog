package com.hanphone.blog.ui.legal

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.text.selection.SelectionContainer
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.hanphone.blog.ui.components.AppBackBar

/**
 * 隐私政策 / 服务条款（Android 客户端版）。
 *
 * 与网页版不同：这里只描述 **App 实际会做的事**（账号、发布内容、登录设备、推送、上传），
 * 不复制网站版的 Cookie / 分析脚本等条款，也不嵌入 WebView——内容随 App 发版，离线可读。
 */
private data class LegalSection(val title: String, val paragraphs: List<String>)

private val PRIVACY_SECTIONS = listOf(
    LegalSection(
        "适用范围",
        listOf("本政策适用于「云林有风」Android 客户端（下称本 App）。网页版及第三方站点的隐私实践以其各自说明为准。")
    ),
    LegalSection(
        "我们收集的信息",
        listOf(
            "账号信息：用户名、昵称、邮箱、头像。使用 GitHub / Google 登录时，我们会接收其返回的账号标识与公开资料（昵称、头像、邮箱）。",
            "你主动发布的内容：评论、留言、随笔回复、收藏、私信与聊天室消息。",
            "设备与登录信息：登录设备名称、IP 地址、登录与最近使用时间，用于「登录设备」管理与账号安全。",
            "你选择上传的文件：头像、随笔图片或视频等。",
            "推送令牌：Firebase Cloud Messaging 设备令牌，仅用于热点与私信通知。",
            "本 App 不读取通讯录、短信、精确位置或已安装应用列表。"
        )
    ),
    LegalSection(
        "信息用途",
        listOf("用于登录与多端同步、展示与互动、识别异常登录、发送你已开启的通知，以及排查故障和改进体验。不用于广告画像，也不出售给第三方。")
    ),
    LegalSection(
        "存储与安全",
        listOf("数据存放在位于中国境内的服务器。密码经不可逆摘要后再以 bcrypt 存储；网络传输使用 HTTPS；登录凭证有有效期，退出登录或修改密码会吊销对应会话。")
    ),
    LegalSection(
        "第三方服务",
        listOf("GitHub、Google（第三方登录）、Firebase Cloud Messaging（推送）、网易云音乐（音乐库内容）。这些服务会按其自身隐私政策处理必要信息。")
    ),
    LegalSection(
        "你的权利",
        listOf("你可以在「我的」查看和修改昵称、头像、邮箱与密码，在「设置 → 登录设备」下线其他设备，退出登录会清除本机登录态。需要删除账号或全部数据，请通过下方邮箱联系。")
    ),
    LegalSection("未成年人", listOf("本 App 不面向 14 周岁以下儿童。")),
    LegalSection("政策更新", listOf("内容更新时会在本页标注日期；继续使用即表示接受更新后的政策。"))
)

private val TERMS_SECTIONS = listOf(
    LegalSection(
        "接受条款",
        listOf("使用本 App 即表示你同意本条款。若不同意，请停止使用。")
    ),
    LegalSection(
        "账号与安全",
        listOf(
            "请自行保管账号与密码，不要转借或出售。",
            "通过 GitHub / Google 注册的账号，其登录依赖对应平台，请同时保护好该平台账号。",
            "同一账号可以在多台设备登录，可在「设置 → 登录设备」查看并下线其他设备。"
        )
    ),
    LegalSection(
        "发布规范",
        listOf(
            "评论、留言、随笔与聊天室内容不得违反法律法规，不得侵犯他人权益，不得发布广告、刷屏或恶意攻击。",
            "聊天室与留言板为公开区域，发布前请确认不包含隐私信息。"
        )
    ),
    LegalSection(
        "内容权利",
        listOf("你保留自己发布内容的著作权，并授权本站为展示、存储与分发之目的使用该内容。删除内容后，本站将停止展示。")
    ),
    LegalSection(
        "行为限制",
        listOf("不得爬取数据、攻击服务、绕过鉴权或批量注册；不得使用 MCP 密钥执行未授权操作。")
    ),
    LegalSection(
        "管理与终止",
        listOf("对违规内容我们可删除或隐藏；情节严重时可限制或停用账号。")
    ),
    LegalSection(
        "第三方内容",
        listOf("外链、音乐与开源项目的版权归原权利人所有，本 App 仅提供访问入口。")
    ),
    LegalSection(
        "免责",
        listOf("服务按现状提供，可能因维护、网络或不可抗力中断。请自行备份重要内容；在法律允许的范围内，我们不对由此造成的损失承担责任。")
    ),
    LegalSection("条款更新", listOf("条款更新后会在本页标注日期，继续使用即表示接受。"))
)

@Composable
fun PrivacyPolicyScreen(onBack: () -> Unit) {
    LegalDocumentScreen(
        title = "隐私政策",
        updated = "最后更新：2026-11-22",
        intro = "我们只收集运行这个 App 所必需的信息，并尽量少收集。",
        sections = PRIVACY_SECTIONS,
        onBack = onBack
    )
}

@Composable
fun TermsScreen(onBack: () -> Unit) {
    LegalDocumentScreen(
        title = "服务条款",
        updated = "最后更新：2026-11-22",
        intro = "请在使用前阅读以下约定。",
        sections = TERMS_SECTIONS,
        onBack = onBack
    )
}

@Composable
private fun LegalDocumentScreen(
    title: String,
    updated: String,
    intro: String,
    sections: List<LegalSection>,
    onBack: () -> Unit
) {
    Column(Modifier.fillMaxSize()) {
        AppBackBar(title = title, onBack = onBack)
        LazyColumn(
            Modifier.fillMaxSize().padding(horizontal = 20.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp),
            contentPadding = androidx.compose.foundation.layout.PaddingValues(vertical = 12.dp)
        ) {
            item {
                Column {
                    Text(
                        updated,
                        style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.outline
                    )
                    Text(
                        intro,
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        modifier = Modifier.padding(top = 6.dp)
                    )
                }
            }
            items(sections) { section ->
                Column {
                    Text(
                        section.title,
                        style = MaterialTheme.typography.titleSmall,
                        fontWeight = FontWeight.SemiBold,
                        color = MaterialTheme.colorScheme.primary
                    )
                    SelectionContainer {
                        Column(Modifier.padding(top = 4.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                            section.paragraphs.forEach { paragraph ->
                                Text(
                                    paragraph,
                                    style = MaterialTheme.typography.bodyMedium,
                                    color = MaterialTheme.colorScheme.onSurface,
                                    lineHeight = MaterialTheme.typography.bodyMedium.fontSize * 1.6f
                                )
                            }
                        }
                    }
                }
            }
            item {
                Text(
                    "联系我们：janhizian@qq.com",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    modifier = Modifier.padding(bottom = 16.dp)
                )
            }
        }
    }
}
