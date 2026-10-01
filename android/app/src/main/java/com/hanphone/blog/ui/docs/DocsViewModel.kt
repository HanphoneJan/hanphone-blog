package com.hanphone.blog.ui.docs

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.hanphone.blog.data.cache.ContentStore
import com.hanphone.blog.data.cache.MemoryCache
import com.hanphone.blog.data.model.Doc
import com.hanphone.blog.data.repo.BlogRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.launch
import javax.inject.Inject

/** 文件夹树节点（对齐 web DocsClient 的 buildTree） */
data class DocNode(
    val name: String,
    val path: String, // 完整相对路径，如 "寒枫的作品集/《刑天》.docx" 或 "寒枫的作品集"
    val isFolder: Boolean,
    val doc: Doc? = null,
    val children: MutableList<DocNode> = mutableListOf(),
    var fileCount: Int = 0
)

const val DOC_TYPE_ALL = "all"

/**
 * 文库：一次拉全量公开文件（GET /docs），按 docNamespace 构建文件夹树，
 * 支持文件夹浏览 / 名称搜索 / 类型筛选（对齐 web DocsClient）。
 * 三层缓存：MemoryCache → ContentStore → 网络静默刷新。
 */
@HiltViewModel
class DocsViewModel @Inject constructor(
    private val repo: BlogRepository
) : ViewModel() {

    var docs by mutableStateOf(MemoryCache.docs ?: emptyList())
        private set
    var loading by mutableStateOf(MemoryCache.docs == null)
        private set
    var refreshing by mutableStateOf(false)
        private set
    var error by mutableStateOf<String?>(null)
        private set

    var query by mutableStateOf("")
        private set

    /** 类型筛选："all" 或 ".docx"/".pdf"/".md"/".html" */
    var selectedType by mutableStateOf(DOC_TYPE_ALL)
        private set

    /** 当前浏览文件夹路径（segment 列表，空 = 全部文档） */
    var currentPath by mutableStateOf<List<String>>(emptyList())
        private set

    /** 文件夹树（根 = 全部文档）。docs 最多几十篇，直接派生即可 */
    val tree: DocNode get() = buildDocTree(docs)

    /** 当前文件夹节点（沿 currentPath 逐层下钻） */
    val currentFolder: DocNode
        get() {
            var node = tree
            for (seg in currentPath) {
                node = node.children.firstOrNull { it.isFolder && it.name == seg } ?: break
            }
            return node
        }

    /** 是否处于搜索/筛选态（此时面包屑隐藏、展示平铺结果） */
    val isSearching: Boolean get() = query.isNotBlank() || selectedType != DOC_TYPE_ALL

    /** 全部文件（搜索用），深度优先收集叶节点 */
    val allFiles: List<DocNode>
        get() {
            val result = mutableListOf<DocNode>()
            fun walk(n: DocNode) {
                for (c in n.children) {
                    if (c.isFolder) walk(c) else if (c.doc != null) result.add(c)
                }
            }
            walk(tree)
            return result
        }

    /** 名称/路径搜索 + 类型筛选（匹配规则与 web DocsClient 一致） */
    val filteredFiles: List<DocNode>
        get() {
            val q = query.trim().lowercase()
            return allFiles.filter { node ->
                val d = node.doc ?: return@filter false
                val name = d.filename.substringBeforeLast('.').lowercase()
                (q.isEmpty() || name.contains(q) || node.path.lowercase().contains(q)) &&
                    (selectedType == DOC_TYPE_ALL || d.fileType == selectedType)
            }
        }

    init {
        // 冷启动：先读磁盘缓存展示，再静默刷新
        viewModelScope.launch {
            val cached = ContentStore.readDocs()
            if (cached != null && docs.isEmpty()) {
                docs = cached
                loading = false
            }
        }
        // 首次加载
        refresh()
    }

    fun refresh(fromPull: Boolean = false) {
        viewModelScope.launch {
            if (fromPull) refreshing = true else loading = true
            try {
                val res = repo.docs()
                if (res.flag) {
                    docs = res.data ?: emptyList()
                    MemoryCache.docs = docs
                    ContentStore.writeDocs(docs)
                    error = null
                } else error = res.message.ifBlank { "加载失败" }
            } catch (e: Exception) {
                error = e.message ?: "网络错误"
            }
            loading = false
            refreshing = false
        }
    }

    fun onQueryChange(q: String) {
        query = q
    }

    fun onTypeChange(t: String) {
        selectedType = t
    }

    /** 进入文件夹（清空搜索与筛选，对齐 web navigateTo） */
    fun navigateTo(path: List<String>) {
        currentPath = path
        query = ""
        selectedType = DOC_TYPE_ALL
    }

    fun navigateRoot() = navigateTo(emptyList())

    /** 打开文件时上报浏览量（后台静默，失败忽略） */
    fun reportView(docId: String) {
        if (docId.isBlank()) return
        viewModelScope.launch { repo.incrementDocView(docId) }
    }
}

/**
 * 按 docNamespace + filename 构建文件夹树：
 * - docNamespace "blog/docs/寒枫的作品集" → 顶层文件夹「寒枫的作品集」；
 * - docNamespace "blog/docs" → 根级文件。
 * 文件夹在前、名称排序，统计每个节点文件数（对齐 web buildTree）。
 */
fun buildDocTree(docs: List<Doc>): DocNode {
    val root = DocNode(name = "全部文档", path = "", isFolder = true)

    for (doc in docs) {
        val folderPath = doc.docNamespace
            .replace("blog/docs/", "")
            .replace("blog/docs", "")
            .trim('/')
        val fullPath = if (folderPath.isEmpty()) doc.filename else "$folderPath/${doc.filename}"
        val parts = fullPath.split('/')
        var current = root
        for (i in 0 until parts.size - 1) {
            val seg = parts[i]
            val fp = parts.subList(0, i + 1).joinToString("/")
            var child = current.children.firstOrNull { it.isFolder && it.name == seg }
            if (child == null) {
                child = DocNode(name = seg, path = fp, isFolder = true)
                current.children.add(child)
            }
            current = child
        }
        current.children.add(DocNode(name = parts.last(), path = fullPath, isFolder = false, doc = doc))
    }

    fun compute(n: DocNode): Int {
        var f = 0
        for (c in n.children) f += if (c.isFolder) compute(c) else 1
        n.fileCount = f
        return f
    }
    compute(root)

    fun sort(n: DocNode) {
        n.children.sortWith(compareBy<DocNode> { !it.isFolder }.thenBy { it.name })
        n.children.filter { it.isFolder }.forEach { sort(it) }
    }
    sort(root)

    return root
}