package com.example.blog.service;

import java.util.List;

/**
 * 文件服务（admin-file）操作接口，用于业务数据删除时的物理文件回收
 */
public interface AdminFileService {

    /**
     * 判断 URL 是否为文件服务托管的随笔文件（blog/essay/ 路径下）
     * 仅此类 URL 才会被物理删除，外链一律跳过
     */
    boolean isManagedEssayFileUrl(String url);

    /**
     * 判断 URL 是否为允许物理回收的本站托管文件（blog/ 命名空间下）
     * blog/project、blog/blogs、blog/type 等上传目录均命中；外链与其他域名一律返回 false
     */
    boolean isManagedFileUrl(String url);

    /**
     * 批量删除随笔文件（按 URL 列表），并尝试清理文件所在空目录
     * 全程 best-effort：单个文件删除失败仅记录日志，不影响其余文件
     *
     * @param urls 随笔文件 URL 列表
     */
    void deleteEssayFiles(List<String> urls);

    /**
     * 批量删除本站托管文件（按 URL 列表），并尝试清理文件所在空目录
     * 非托管 URL（外链、其他域名）自动跳过；全程 best-effort
     *
     * @param urls 文件 URL 列表
     */
    void deleteManagedFiles(List<String> urls);
}