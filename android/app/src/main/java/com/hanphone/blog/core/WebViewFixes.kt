package com.hanphone.blog.core

import android.webkit.WebView
import androidx.webkit.WebViewCompat
import androidx.webkit.WebViewFeature

/**
 * 第一方页面在 App 内 WebView 的「视口单位」修正。
 *
 * ## 问题（真机实测）
 *
 * WebView 里 `window.innerHeight` 是 772，但 CSS 的 `100vh` / `80vh` 全部算成 **0**
 * （`100dvh` 同样为 0；只有 `100%` 正常）。这不是页面写法问题：同一份 CSS 在 Chrome
 * 里正常。后果是后台个人中心外层 `h-screen` 高度 0 + `overflow-hidden` → **整页空白**；
 * 头像弹窗的 `max-h-[80vh]` 变成 0 → 弹窗只剩标题和按钮。
 *
 * 照片墙用 `--app-vh` 变量绕过了同类问题（见 HANDOVER 坑 16），但 Next 后台页的
 * Tailwind `vh` 工具类没法从 App 侧改源码（本轮约束只改 android/），所以在这里统一修。
 *
 * ## 处理
 *
 * 文档就绪后遍历**同源样式表**，把声明值里的 `vh/dvh/svh/lvh` 按当前
 * `window.innerHeight` 换算成 px 就地写回；记录原始值，旋转/尺寸变化时按新视口重算。
 * 只对第一方 origin 生效（与 [AuthBridge] 同一白名单），第三方站点不受影响。
 *
 * 注意：这是「把 vh 解释成视口高度」的等价替换，语义与浏览器一致；
 * 只处理样式表规则，不处理内联 style 属性（本站页面未用到）。
 */
object WebViewFixes {

    private val SCRIPT = """
        (function(){
          try {
            if (window.__appVhFix) { if (window.__appVhApply) window.__appVhApply(); return; }
            window.__appVhFix = true;
            var saved = [];
            var re = /(-?\d*\.?\d+)(dvh|svh|lvh|vh)/g;

            function px(n){ return (parseFloat(n) * (window.innerHeight || 0) / 100); }

            function fixStyle(style, collect){
              try {
                for (var i = 0; i < style.length; i++) {
                  var p = style[i];
                  var v = style.getPropertyValue(p);
                  if (!v || v.indexOf('vh') < 0) continue;
                  var nv = v.replace(re, function(m, num){ return px(num) + 'px'; });
                  if (nv === v) continue;
                  if (collect) saved.push({ s: style, p: p, v: v, pr: style.getPropertyPriority(p) });
                  style.setProperty(p, nv, style.getPropertyPriority(p));
                }
              } catch (e) {}
            }

            function walk(rules, collect){
              for (var i = 0; i < rules.length; i++) {
                var r = rules[i];
                try {
                  if (r.style) fixStyle(r.style, collect);
                  if (r.cssRules) walk(r.cssRules, collect);
                } catch (e) {}
              }
            }

            function collectAll(){
              for (var s = 0; s < document.styleSheets.length; s++) {
                try { walk(document.styleSheets[s].cssRules, true); } catch (e) {}
              }
            }

            function reapply(){
              var h = window.innerHeight || 0;
              if (!h) return;
              for (var i = 0; i < saved.length; i++) {
                var o = saved[i];
                try {
                  o.s.setProperty(o.p, o.v.replace(re, function(m, num){ return px(num) + 'px'; }), o.pr);
                } catch (e) {}
              }
            }

            window.__appVhApply = reapply;

            function boot(){
              collectAll();
              // 样式表可能异步插入（Next 的分包 CSS），多补两次
              setTimeout(collectAll, 300);
              setTimeout(collectAll, 1200);
            }

            if (document.readyState === 'loading') {
              document.addEventListener('DOMContentLoaded', boot);
            } else {
              boot();
            }
            window.addEventListener('load', boot);
            window.addEventListener('resize', function(){
              clearTimeout(window.__appVhT);
              window.__appVhT = setTimeout(reapply, 150);
            });
          } catch (e) {}
        })();
    """.trimIndent()

    /** 挂到 WebView 上；必须在加载页面前调用（与 AuthBridge 一样在文档开始执行） */
    fun install(webView: WebView) {
        if (!WebViewFeature.isFeatureSupported(WebViewFeature.DOCUMENT_START_SCRIPT)) {
            // 老 WebView 降级：页面加载完再补一次
            webView.post {
                webView.evaluateJavascript(SCRIPT, null)
            }
            return
        }
        WebViewCompat.addDocumentStartJavaScript(
            webView,
            SCRIPT,
            AuthBridge.FIRST_PARTY_ORIGINS
        )
    }
}
