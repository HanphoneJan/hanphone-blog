package com.example.atlasapp;

import android.annotation.SuppressLint;
import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.view.KeyEvent;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.ProgressBar;
import androidx.activity.OnBackPressedCallback;
import androidx.activity.result.ActivityResultLauncher;
import androidx.activity.result.contract.ActivityResultContracts;
import androidx.appcompat.app.AppCompatActivity;

public class MainActivity extends AppCompatActivity {

    private WebView webView;
    private ProgressBar progressBar;
    private ValueCallback<Uri[]> uploadMessage;
    private ActivityResultLauncher<Intent> fileChooserLauncher;
    private final static int FILE_CHOOSER_RESULT_CODE = 1;
    private static final String TARGET_URL = "https://hanphone.cn/atlas/"; //网址
    @SuppressLint("SetJavaScriptEnabled")
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);

        // 初始化 WebView 和 ProgressBar
        webView = findViewById(R.id.webView);
        progressBar = findViewById(R.id.progressBar);

        // 关键设置
        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        // 启用 DOM 存储 API (HTML5 本地存储和会话存储)
        // 允许网页使用 localStorage 和 sessionStorage 功能
        // 对需要保存离线数据的 Web 应用至关重要
        settings.setDomStorageEnabled(true);

        // 设置以「概览模式」加载页面
        // 自动缩放页面内容至适合屏幕宽度的比例
        // 类似于手机浏览器默认的「自适应屏幕」效果
        settings.setLoadWithOverviewMode(true);

        // 启用宽视口支持
        // 让网页使用设备的实际宽度作为视口宽度（配合 viewport meta 标签）
        // 与移动端网页响应式设计配合使用，优化移动端显示效果
        settings.setUseWideViewPort(true);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_ALWAYS_ALLOW);

        // 设置 WebViewClient，使网页在 WebView 中打开而不是跳转到浏览器
        webView.setWebViewClient(new WebViewClient());

        // 注册 ActivityResultLauncher 用于处理文件选择结果
        fileChooserLauncher = registerForActivityResult(
                new ActivityResultContracts.StartActivityForResult(),
                result -> {
                    if (uploadMessage == null) return;
                    Uri[] results = null;
                    if (result.getResultCode() == RESULT_OK) {
                        Intent data = result.getData();
                        if (data != null) {
                            String dataString = data.getDataString();
                            if (dataString != null) {
                                results = new Uri[]{Uri.parse(dataString)};
                            }
                        }
                    }
                    uploadMessage.onReceiveValue(results);
                    uploadMessage = null;
                });

        // 设置 WebChromeClient，用于处理网页加载进度和文件选择器
        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public void onProgressChanged(WebView view, int newProgress) {
                super.onProgressChanged(view, newProgress);
                progressBar.setProgress(newProgress);
                if (newProgress == 100) {
                    progressBar.setVisibility(ProgressBar.GONE);
                } else {
                    progressBar.setVisibility(ProgressBar.VISIBLE);
                }
            }

            // 处理文件选择回调
            public boolean onShowFileChooser(
                    WebView webView, ValueCallback<Uri[]> filePathCallback,
                    WebChromeClient.FileChooserParams fileChooserParams) {
                if (uploadMessage != null) {
                    uploadMessage.onReceiveValue(null);
                }
                uploadMessage = filePathCallback;

                Intent intent = fileChooserParams.createIntent();
                try {
                    fileChooserLauncher.launch(intent);
                } catch (Exception e) {
                    uploadMessage = null;
                    return false;
                }
                return true;
            }

        });

        // 加载网页
        webView.loadUrl(TARGET_URL);

        // 处理返回按钮逻辑
        OnBackPressedCallback callback = new OnBackPressedCallback(true) {
            @Override
            public void handleOnBackPressed() {
                if (webView.canGoBack()) {
                    webView.goBack();
                } else {
                    // 允许系统默认的返回操作
                    this.setEnabled(false);
                    getOnBackPressedDispatcher().onBackPressed();
                    this.setEnabled(true);
                }
            }
        };
        getOnBackPressedDispatcher().addCallback(this, callback);

    }

    // 处理文件选择结果
    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode == FILE_CHOOSER_RESULT_CODE) {
            if (uploadMessage == null) return;
            Uri[] results = null;
            if (resultCode == RESULT_OK) {
                if (data != null) {
                    String dataString = data.getDataString();
                    if (dataString != null) {
                        results = new Uri[]{Uri.parse(dataString)};
                    }
                }
            }
            uploadMessage.onReceiveValue(results);
            uploadMessage = null;
        }
    }

    // 处理物理按键的返回事件，以兼容旧设备
    @Override
    public boolean onKeyDown(int keyCode, KeyEvent event) {
        if (keyCode == KeyEvent.KEYCODE_BACK && webView.canGoBack()) {
            webView.goBack();
            return true;
        }
        return super.onKeyDown(keyCode, event);
    }
}