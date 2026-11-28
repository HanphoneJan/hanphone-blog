# 第三方来源与许可

本目录运行/生成时依赖或引用了以下项目。**不把测试数据提交到公开仓库**；数据文件的许可证以各自下载页为准。

| 项目 | 用途 | 许可 |
|---|---|---|
| [criyle/go-judge](https://github.com/criyle/go-judge) | 沙箱执行 | MIT |
| [newfacade/LeetCodeDataset](https://huggingface.co/datasets/newfacade/LeetCodeDataset) | LeetCode 测试数据 | HF 数据集卡 Apache-2.0；GitHub 仓库代码 MIT（以实际页面为准） |
| [lbaf23/LeetCode-Contest](https://huggingface.co/datasets/lbaf23/LeetCode-Contest) | LeetCode 周赛测试数据（后续接入） | MIT |
| [RinCloud/TrickyBugs](https://github.com/RinCloud/TrickyBugs) | 测试集质量闸门（后续接入） | MIT |
| [yosupo06/library-checker-problems](https://github.com/yosupo06/library-checker-problems) | 评测机 smoke/生成器参考（后续接入） | Apache-2.0 |
| [luogu-dev/cyaron](https://github.com/luogu-dev/cyaron) | 随机测试数据生成（后续接入） | LGPL-3.0（作为库 import，不复制/修改源码） |
| [MikeMirzayanov/testlib](https://github.com/MikeMirzayanov/testlib) | validator/checker（后续接入） | MIT |
| [ifsmirnov/jngen](https://github.com/ifsmirnov/jngen) | 复杂数据生成（后续接入） | MIT |
| [linux-tools/ojgen](https://github.com/linux-tools/ojgen) | 多平台数据生成（后续接入） | MIT |

比较器 `src/compare.ts` 移植自 HanphoneJan.github.io 的 `src/components/training/pyrunner/compare.ts`，两边保持同步。
