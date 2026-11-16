package com.hanphone.blog.ui.admin

import com.hanphone.blog.data.model.Blog
import com.hanphone.blog.data.model.Essay

/**
 * 列表 → 编辑页的数据交接（进程内）。
 *
 * 为什么不用导航参数：管理端没有「按 id 取单条」的接口
 * （`/essays/{id}` 只返回已发布随笔，`/admin/blogs` 只有列表），
 * 而列表返回的对象本来就带完整正文与附件，直接传引用最省事。
 *
 * 进程被回收后这里会空：编辑页会退化为翻页查找（见各 EditViewModel）。
 */
object AdminEditBus {
    var essay: Essay? = null
    var blog: Blog? = null

    /** 编辑页保存成功后置位，列表页在回到前台时据此刷新（列表 VM 不会被重建） */
    var essayDirty: Boolean = false
    var blogDirty: Boolean = false
}
