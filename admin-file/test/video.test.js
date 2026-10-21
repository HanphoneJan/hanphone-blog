/**
 * 视频 HLS 模块单元/集成测试
 *
 * 运行：cd admin-file && node --test test/
 * 集成测试需要系统 ffmpeg/ffprobe；缺失时自动跳过。
 */

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("path");
const fs = require("fs/promises");
const { spawnSync } = require("child_process");

const {
  CONFIG,
  isVideoFile,
  planRenditions,
  outputSize,
  initVideo,
  isAvailable,
  transcodeVideo,
  getVideoMedia,
  getVideoPoster,
  deleteVideoAssets,
  getVersionDir,
} = require("../lib/video");

const baseUploadDir = path.join(__dirname, "..", "uploads");
const testDirRel = "__video_test__";
const testDirAbs = path.join(baseUploadDir, testDirRel);
const sampleRel = `${testDirRel}/sample.mp4`;
const sampleAbs = path.join(baseUploadDir, ...sampleRel.split("/"));

test("isVideoFile 只认明确的视频扩展名（不把代码 .ts 当视频）", () => {
  assert.equal(isVideoFile("a.mp4"), true);
  assert.equal(isVideoFile("a.MOV"), true);
  assert.equal(isVideoFile("a.mkv"), true);
  assert.equal(isVideoFile("a.m2ts"), true);
  assert.equal(isVideoFile("a.ts"), false);
  assert.equal(isVideoFile("a.png"), false);
  assert.equal(isVideoFile("a"), false);
});

test("planRenditions 按短边规划档位，不放大", () => {
  assert.deepEqual(planRenditions(1920, 1080, 1080), [1080, 720]);
  assert.deepEqual(planRenditions(3840, 2160, 1080), [1080, 720]);
  assert.deepEqual(planRenditions(1280, 720, 1080), [720]);
  assert.deepEqual(planRenditions(1080, 1920, 1080), [1080, 720]);
  assert.deepEqual(planRenditions(720, 1280, 1080), [720]);
  assert.deepEqual(planRenditions(640, 360, 1080), [360]);
  assert.deepEqual(planRenditions(1920, 1080, 720), [720]);
  assert.deepEqual(planRenditions(0, 0, 1080), []);
});

test("outputSize 保持比例并输出偶数尺寸", () => {
  assert.deepEqual(outputSize(1920, 1080, 720), { width: 1280, height: 720 });
  assert.deepEqual(outputSize(1920, 800, 720), { width: 1728, height: 720 });
  assert.deepEqual(outputSize(1080, 1920, 720), { width: 720, height: 1280 });
  assert.deepEqual(outputSize(1920, 1080, 1080), { width: 1920, height: 1080 });
});

test("完整转码：原片保留，生成 master/分片/海报/meta，删除时回收派生目录", async (t) => {
  await initVideo();
  if (!isAvailable()) {
    t.skip("ffmpeg/ffprobe 不可用，跳过集成测试");
    return;
  }

  await fs.rm(testDirAbs, { recursive: true, force: true });
  await fs.mkdir(testDirAbs, { recursive: true });

  t.after(async () => {
    await fs.rm(testDirAbs, { recursive: true, force: true });
    await fs.rm(path.join(baseUploadDir, ".video", testDirRel), { recursive: true, force: true });
  });

  const generated = spawnSync(
    CONFIG.ffmpeg,
    [
      "-hide_banner",
      "-loglevel",
      "error",
      "-y",
      "-f",
      "lavfi",
      "-i",
      "testsrc=size=640x360:rate=25",
      "-f",
      "lavfi",
      "-i",
      "sine=frequency=440:sample_rate=44100",
      "-t",
      "2",
      "-c:v",
      "libx264",
      "-pix_fmt",
      "yuv420p",
      "-c:a",
      "aac",
      "-shortest",
      sampleAbs,
    ],
    { timeout: 60_000 }
  );
  assert.equal(generated.status, 0, `生成测试视频失败: ${generated.stderr}`);

  const before = await getVideoMedia(sampleRel, sampleAbs);
  assert.equal(before.status, "none");
  assert.equal(before.original.startsWith("https://"), true);
  assert.equal(before.download.includes("download=1"), true);

  const meta = await transcodeVideo(sampleAbs, sampleRel, { force: true });
  assert.equal(meta.status, "ready");
  assert.ok(meta.renditions.length >= 1);

  const dir = getVersionDir(sampleRel, meta.version).abs;
  await fs.access(path.join(dir, "master.m3u8"));
  await fs.access(path.join(dir, "meta.json"));
  await fs.access(path.join(dir, "poster.jpg"));
  await fs.access(path.join(dir, "v0", "playlist.m3u8"));

  const segments = (await fs.readdir(path.join(dir, "v0"))).filter((f) => f.endsWith(".ts"));
  assert.ok(segments.length >= 1);

  const media = await getVideoMedia(sampleRel, sampleAbs);
  assert.equal(media.status, "ready");
  assert.equal(media.duration > 0, true);
  assert.match(media.hls, /\/hls\/__video_test__\/sample-[0-9a-f]{8}\/master\.m3u8$/);
  assert.match(media.poster, /\/media\/poster\.jpg\?path=/);
  assert.ok(media.renditions[0].playlist.endsWith("playlist.m3u8"));

  const poster = await getVideoPoster(sampleRel, sampleAbs);
  assert.equal(poster, path.join(dir, "poster.jpg"));

  // 原片必须还在
  await fs.access(sampleAbs);

  const removed = await deleteVideoAssets(sampleAbs);
  assert.equal(removed, 1);
  await assert.rejects(fs.access(dir));
});
