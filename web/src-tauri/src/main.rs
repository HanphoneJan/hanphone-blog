// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    // Windows Release: 在 Tauri 初始化之前清理 WebView2 用户数据目录。
    // WebView2 Evergreen Runtime 在应用关闭后可能将用户数据目录写入
    // 不一致状态（后台更新、文件锁定残留等），导致下次启动时初始化
    // 失败并回退到 WebView2 引导下载页面。
    // 清理必须在 Tauri 初始化之前执行，确保 WebView2 创建全新的数据目录。
    #[cfg(all(target_os = "windows", not(debug_assertions)))]
    {
        if let Ok(local_app_data) = std::env::var("LOCALAPPDATA") {
            let webview_data = std::path::Path::new(&local_app_data)
                .join("cn.hanphone.blog")
                .join("EBWebView");
            if webview_data.exists() {
                let _ = std::fs::remove_dir_all(&webview_data);
            }
        }
    }

    hanphone_blog_lib::run()
}
