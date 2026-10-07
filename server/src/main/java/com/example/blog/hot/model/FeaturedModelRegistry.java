package com.example.blog.hot.model;

import org.springframework.stereotype.Component;

import java.util.List;

/**
 * 精选代表模型注册表：按用户关注的重点厂商/系列人工挑选，
 * 运行时按关键字在库中解析到具体模型（取最新版本）。
 */
@Component
public class FeaturedModelRegistry {

    public record FeaturedEntry(String label, List<String> keywords) {
    }

    public record FeaturedGroup(String key, String label, String modality, List<FeaturedEntry> entries) {
    }

    private static final List<FeaturedGroup> GROUPS = List.of(
            new FeaturedGroup("general", "通用大模型", "text", List.of(
                    new FeaturedEntry("Claude", List.of("claude")),
                    new FeaturedEntry("GPT", List.of("gpt-5", "gpt-4", "gpt")),
                    new FeaturedEntry("Gemini", List.of("gemini")),
                    new FeaturedEntry("DeepSeek", List.of("deepseek")),
                    new FeaturedEntry("GLM", List.of("glm")),
                    new FeaturedEntry("Kimi", List.of("kimi")),
                    new FeaturedEntry("Grok", List.of("grok")),
                    new FeaturedEntry("Qwen", List.of("qwen3", "qwen"))
            )),
            new FeaturedGroup("small", "小尺寸模型", "text", List.of(
                    new FeaturedEntry("Qwen 小模型", List.of("qwen3-4b", "qwen3-1.7b", "qwen3-0.6b", "qwen3-8b", "qwen2.5-7b", "qwen")),
                    new FeaturedEntry("Llama", List.of("llama")),
                    new FeaturedEntry("Gemma", List.of("gemma")),
                    new FeaturedEntry("Phi", List.of("phi")),
                    new FeaturedEntry("MiniCPM", List.of("minicpm")),
                    new FeaturedEntry("Mistral", List.of("mistral", "magistral"))
            )),
            new FeaturedGroup("video", "视频生成", "video", List.of(
                    new FeaturedEntry("Seedance", List.of("seedance")),
                    new FeaturedEntry("Kling", List.of("kling")),
                    new FeaturedEntry("Veo", List.of("veo")),
                    new FeaturedEntry("Sora", List.of("sora")),
                    new FeaturedEntry("Wan", List.of("wan")),
                    new FeaturedEntry("Hailuo / MiniMax", List.of("hailuo", "minimax")),
                    new FeaturedEntry("Runway", List.of("runway")),
                    new FeaturedEntry("Pika", List.of("pika"))
            )),
            new FeaturedGroup("image", "图像生成", "image", List.of(
                    new FeaturedEntry("Seedream", List.of("seedream")),
                    new FeaturedEntry("Nano Banana", List.of("nano banana", "nano-banana")),
                    new FeaturedEntry("GPT Image", List.of("gpt image", "gpt-image")),
                    new FeaturedEntry("FLUX", List.of("flux")),
                    new FeaturedEntry("Qwen-Image", List.of("qwen-image")),
                    new FeaturedEntry("Imagen", List.of("imagen")),
                    new FeaturedEntry("Midjourney", List.of("midjourney")),
                    new FeaturedEntry("Recraft", List.of("recraft"))
            )),
            new FeaturedGroup("coding", "代码模型", "coding", List.of(
                    new FeaturedEntry("Claude", List.of("claude")),
                    new FeaturedEntry("GPT", List.of("gpt")),
                    new FeaturedEntry("Gemini", List.of("gemini")),
                    new FeaturedEntry("DeepSeek", List.of("deepseek")),
                    new FeaturedEntry("Qwen Coder", List.of("qwen3-coder", "qwen")),
                    new FeaturedEntry("GLM", List.of("glm")),
                    new FeaturedEntry("Kimi", List.of("kimi"))
            )),
            new FeaturedGroup("embedding", "Embedding 模型", "embedding", List.of(
                    new FeaturedEntry("Qwen3-Embedding", List.of("qwen3-embedding", "qwen")),
                    new FeaturedEntry("BGE", List.of("bge")),
                    new FeaturedEntry("Jina", List.of("jina")),
                    new FeaturedEntry("GTE", List.of("gte")),
                    new FeaturedEntry("Nomic", List.of("nomic")),
                    new FeaturedEntry("E5", List.of("e5")),
                    new FeaturedEntry("Cohere", List.of("cohere", "embed")),
                    new FeaturedEntry("Voyage", List.of("voyage"))
            ))
    );

    public List<FeaturedGroup> groups() {
        return GROUPS;
    }
}
