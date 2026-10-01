# 03 - 关键算法实现

> 本文档深入讲解 HanPhone Chat 中的三个核心算法：记忆遗忘算法、记忆提取与升级、工具链编排

---

## 📉 一、记忆遗忘算法

### 1.1 算法背景

**问题**：如果记忆只增不减，长期记忆会无限膨胀，导致：
1. 检索效率下降
2. 存储成本增加
3. 噪声记忆干扰

**解决方案**：模拟人类记忆机制——**不重要的记忆会随时间遗忘**

### 1.2 数学模型

基于**艾宾浩斯遗忘曲线**的改进模型：

```
S(t) = S₀ × e^(-λt) × (1 + α × access_count)
```

| 符号 | 含义 | 取值范围 |
|------|------|----------|
| S(t) | t时刻的记忆强度 | 0 ~ 5 |
| S₀ | 初始重要性 | 1 ~ 5 |
| λ | 衰减系数 | 与重要性相关 |
| t | 时间（天） | ≥ 0 |
| α | 访问增强系数 | 默认 0.1 |
| access_count | 访问次数 | ≥ 0 |

### 1.3 重要性衰减权重

```python
# 重要性越高，衰减越慢
IMPORTANCE_DECAY_WEIGHTS = {
    1: 1.5,   # 不重要：衰减快 (λ = 0.1 × 1.5 = 0.15)
    2: 1.2,   # 不太重要
    3: 1.0,   # 一般：标准衰减 (λ = 0.1)
    4: 0.7,   # 重要：衰减慢
    5: 0.4    # 非常重要：衰减很慢 (λ = 0.04)
}
```

### 1.4 遗忘曲线可视化

```
记忆强度 S(t)
    │
5.0 ┤████
    │    ████
4.0 ┤        ████              (重要性5：衰减慢)
    │            ████
3.0 ┤                ████
    │                    ████
2.0 ┤                        ████
    │    ████                      ████  (重要性3：标准衰减)
1.0 ┤        ████                      ████
    │            ████                      ████
0.5 ┤                ████                      ████  (重要性1：衰减快)
    │                    ████                      ████
0.0 ┼────┬────┬────┬────┬────┬────┬────┬────┬────┬────▶ t(天)
    0    5   10   15   20   25   30   35   40   45   50

    ─── 重要性5    ─ ─ 重要性3    ··· 重要性1
```

### 1.5 核心代码实现

```python
class MemoryForgettingAlgorithm:
    """
    记忆遗忘算法

    核心思想：
    1. 记忆强度随时间指数衰减（艾宾浩斯遗忘曲线）
    2. 重要性高的记忆衰减慢
    3. 频繁访问的记忆会刷新强度
    4. 相似记忆会合并去重
    """

    def __init__(
        self,
        base_decay_rate: float = 0.1,      # 基础衰减率（每天）
        access_boost: float = 0.1,          # 每次访问增强系数
        forget_threshold: float = 0.3,      # 遗忘阈值
        min_retention_days: int = 7         # 最短保留时间（天）
    ):
        self.base_decay_rate = base_decay_rate
        self.access_boost = access_boost
        self.forget_threshold = forget_threshold
        self.min_retention_days = min_retention_days

        # 重要性衰减权重（重要性越高，衰减越慢）
        self.importance_decay_weights = {
            1: 1.5,  # 衰减快
            2: 1.2,
            3: 1.0,  # 标准
            4: 0.7,
            5: 0.4   # 衰减慢
        }

    def calculate_memory_score(
        self,
        memory_id: str,
        importance: int,
        created_at: datetime,
        access_count: int = 0
    ) -> MemoryScore:
        """
        计算记忆当前得分

        公式: S(t) = S₀ × e^(-λt) × (1 + α × access_count)
        """
        now = datetime.now()

        # 1. 计算记忆年龄（天）
        age_days = (now - created_at).total_seconds() / (24 * 3600)

        # 2. 获取衰减权重
        decay_weight = self.importance_decay_weights.get(importance, 1.0)
        decay_rate = self.base_decay_rate * decay_weight

        # 3. 计算衰减因子（指数衰减）
        # e^(-λt)，λ越大衰减越快
        decay_factor = math.exp(-decay_rate * age_days)

        # 4. 计算访问增强
        # 每次访问增加 10% 强度
        access_factor = 1 + (self.access_boost * access_count)

        # 5. 最终得分
        current_score = importance * decay_factor * access_factor

        # 6. 判断是否应遗忘
        # 条件：得分低于阈值 且 已保留超过最短时间
        should_forget = (
            current_score < self.forget_threshold and
            age_days > self.min_retention_days
        )

        return MemoryScore(
            memory_id=memory_id,
            original_importance=importance,
            current_score=round(current_score, 4),
            age_days=round(age_days, 2),
            access_count=access_count,
            should_forget=should_forget
        )
```

### 1.6 遗忘决策示例

```
┌─────────────────────────────────────────────────────────────────┐
│                    记忆遗忘决策示例                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  记忆A: "用户喜欢川菜"                                           │
│  ────────────────────                                           │
│  • 创建时间: 30天前                                              │
│  • 重要性: 5 (关键偏好)                                          │
│  • 访问次数: 3                                                   │
│                                                                 │
│  计算:                                                          │
│    λ = 0.1 × 0.4 = 0.04                                        │
│    衰减因子 = e^(-0.04 × 30) = e^(-1.2) ≈ 0.30                 │
│    访问因子 = 1 + 0.1 × 3 = 1.3                                 │
│    得分 = 5 × 0.30 × 1.3 = 1.95                                 │
│                                                                 │
│  结果: 1.95 > 0.3 (阈值) → ✅ 保留                              │
│                                                                 │
│  ===============================================               │
│                                                                 │
│  记忆B: "明天下午3点开会"                                         │
│  ───────────────────────                                        │
│  • 创建时间: 30天前                                              │
│  • 重要性: 2 (临时事件)                                          │
│  • 访问次数: 0                                                   │
│                                                                 │
│  计算:                                                          │
│    λ = 0.1 × 1.2 = 0.12                                        │
│    衰减因子 = e^(-0.12 × 30) = e^(-3.6) ≈ 0.027                │
│    访问因子 = 1 + 0 = 1                                         │
│    得分 = 2 × 0.027 × 1 = 0.054                                 │
│                                                                 │
│  结果: 0.054 < 0.3 (阈值) 且 30 > 7 (最小保留天数)              │
│        → ❌ 遗忘候选                                             │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 1.7 记忆压缩

```python
def compress_memories(self, memories: List[Dict], strategy: str = "merge") -> Dict:
    """
    压缩相似记忆

    策略:
    - keep_latest: 保留最新的
    - merge: 合并内容
    - summarize: LLM总结 (未实现)
    """
    if strategy == "merge":
        contents = [m.get("content", "") for m in memories]
        merged_content = " | ".join(contents)

        # 保留最高重要性
        max_importance = max(m.get("importance", 3) for m in memories)

        # 保留最早的创建时间
        earliest = min(memories, key=lambda x: x.get("created_at"))

        # 累计访问次数
        total_access = sum(m.get("access_count", 0) for m in memories)

        return {
            "content": merged_content,
            "importance": max_importance,
            "created_at": earliest.get("created_at"),
            "access_count": total_access,
            "is_compressed": True,
            "compressed_from": [m.get("id") for m in memories]
        }
```

---

## 🧠 二、记忆提取与升级

### 2.1 问题背景

**挑战**：如何从对话中自动识别重要信息？

**方案**：使用LLM进行记忆提取和分类

### 2.2 提取流程

```
┌─────────────────────────────────────────────────────────────────┐
│                    记忆提取与升级流程                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  用户: "我喜欢吃川菜，尤其喜欢麻婆豆腐，讨厌吃香菜"               │
│  AI:  "收到！我记住你的饮食偏好了"                                │
│                              │                                  │
│                              ▼                                  │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │ 步骤1: 构造提取Prompt                                      │ │
│  │                                                           │ │
│  │ 分析以下对话，提取需要记住的重要信息：                        │ │
│  │                                                           │ │
│  │ 用户: 我喜欢吃川菜，尤其喜欢麻婆豆腐，讨厌吃香菜              │ │
│  │ 助手: 收到！我记住你的饮食偏好了                             │ │
│  │                                                           │ │
│  │ 判断信息的重要程度：                                        │ │
│  │ - level_3: 一般信息（临时计划、一次性需求）                   │ │
│  │ - level_4: 重要信息（用户偏好、重要事实、个人习惯）            │ │
│  │                                                           │ │
│  │ 请以JSON格式返回...                                         │ │
│  └───────────────────────────────────────────────────────────┘ │
│                              │                                  │
│                              ▼                                  │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │ 步骤2: LLM提取结果                                         │ │
│  │                                                           │ │
│  │ {                                                         │ │
│  │   "has_memory": true,                                     │ │
│  │   "memories": [                                           │ │
│  │     {                                                     │ │
│  │       "level": "level_4",                                 │ │
│  │       "content": "用户喜欢吃川菜，尤其喜欢麻婆豆腐",         │ │
│  │       "type": "preference",                               │ │
│  │       "key": "favorite_food",                             │ │
│  │       "importance": 5                                     │ │
│  │     },                                                    │ │
│  │     {                                                     │ │
│  │       "level": "level_4",                                 │ │
│  │       "content": "用户讨厌吃香菜",                          │ │
│  │       "type": "preference",                               │ │
│  │       "key": "hated_food",                                │ │
│  │       "importance": 4                                     │ │
│  │     }                                                     │ │
│  │   ]                                                       │ │
│  │ }                                                         │ │
│  └───────────────────────────────────────────────────────────┘ │
│                              │                                  │
│                              ▼                                  │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │ 步骤3: 存储到对应层级                                       │ │
│  │                                                           │ │
│  │ L4核心记忆 (JSON文件):                                     │ │
│  │ {                                                         │ │
│  │   "preference": {                                         │ │
│  │     "favorite_food": "川菜，尤其喜欢麻婆豆腐",              │ │
│  │     "hated_food": "香菜"                                   │ │
│  │   }                                                       │ │
│  │ }                                                         │ │
│  │                                                           │ │
│  │ L3长期记忆 (Qdrant):                                       │ │
│  │ 向量: [0.12, -0.05, 0.33, ...] (饮食偏好的embedding)        │ │
│  │ metadata: {type: "preference", importance: 5, ...}         │ │
│  └───────────────────────────────────────────────────────────┘ │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 2.3 记忆类型映射

| 类型 | 说明 | 存储位置 | 示例 |
|------|------|----------|------|
| `preference` | 偏好 | L4核心 | 喜欢川菜 |
| `fact` | 事实 | L3长期 | 住在北京 |
| `habit` | 习惯 | L4核心 | 每天喝咖啡 |
| `goal` | 目标 | L4核心 | 要学Python |
| `event` | 事件 | L3长期 | 下周出差 |
| `relationship` | 关系 | L4核心 | 有宠物狗 |
| `identity` | 身份 | L4核心 | 软件工程师 |

### 2.4 核心代码

```python
async def extract_and_promote_memory(
    self,
    user_message: str,
    assistant_response: str,
    llm_client
):
    """
    从对话中提取重要信息并决定存储到哪一层

    - 一般信息 -> L3 长期记忆
    - 重要偏好/事实 -> L4 核心记忆
    """
    extraction_prompt = f"""分析以下对话，提取需要记住的重要信息。

用户消息: {user_message}
助手回应: {assistant_response}

请判断信息的重要程度：
- level_3: 一般信息，需要记住但重要性一般
- level_4: 重要信息，需要长期记住

请以JSON格式返回...
"""

    response = await llm_client.ainvoke(extraction_prompt)
    result = json.loads(response.content)

    if result.get("has_memory"):
        for mem in result.get("memories", []):
            level = mem.get("level")
            content = mem.get("content", "")

            if level == "level_4":
                # 存入核心记忆
                key = mem.get("key")
                core_type = self._map_to_core_type(mem.get("type"))
                self.add_to_core(
                    key=key,
                    value=content,
                    memory_type=core_type,
                    importance=mem.get("importance", 4)
                )
            else:
                # 存入长期记忆
                await self.add_to_long_term(
                    content=content,
                    memory_type=mem.get("type", "fact"),
                    importance=mem.get("importance", 3)
                )
```

---

## 🔧 三、工具链编排算法

### 3.1 问题背景

**场景**：复杂任务需要多个工具按顺序执行，且存在依赖关系

**示例**：
```
用户: "查一下北京明天的天气，如果下雨提醒我带伞，然后帮我规划室内活动"

需要:
1. weather(city="北京", date="明天") → 得到天气
2. condition_check(weather) → 判断是否下雨
3. if 下雨: recommend_indoor_activities() → 推荐室内活动
```

### 3.2 工具链模型

```python
@dataclass
class ToolChainStep:
    """工具链步骤"""
    step_id: str
    tool_name: str
    params: Dict[str, Any]
    depends_on: List[str]  # 依赖的步骤ID
    output_var: Optional[str] = None  # 输出变量名

@dataclass
class ToolChainPlan:
    """工具链执行计划"""
    description: str
    steps: List[ToolChainStep]
    step_map: Dict[str, ToolChainStep]  # step_id -> step

    def get_execution_order(self) -> List[str]:
        """拓扑排序获取执行顺序"""
        # Kahn算法实现拓扑排序
        in_degree = {s.step_id: len(s.depends_on) for s in self.steps}
        graph = defaultdict(list)

        for step in self.steps:
            for dep in step.depends_on:
                graph[dep].append(step.step_id)

        # BFS
        queue = [k for k, v in in_degree.items() if v == 0]
        result = []

        while queue:
            node = queue.pop(0)
            result.append(node)
            for neighbor in graph[node]:
                in_degree[neighbor] -= 1
                if in_degree[neighbor] == 0:
                    queue.append(neighbor)

        return result
```

### 3.3 执行流程

```
┌─────────────────────────────────────────────────────────────────┐
│                     工具链执行流程                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  用户: "搜索Python教程，然后翻译成英文保存到笔记"                 │
│                              │                                  │
│                              ▼                                  │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │ 步骤1: 规划工具链                                          │ │
│  │                                                           │ │
│  │ LLM生成执行计划:                                           │ │
│  │ ┌──────────────┐                                          │ │
│  │ │ Step 1       │  tool: search                            │ │
│  │ │ params:      │    query: "Python教程"                    │ │
│  │ │   query:     │  output_var: "search_results"            │ │
│  │ │   "Python教程"│  depends_on: []                          │ │
│  │ └──────────────┘                                          │ │
│  │         │                                                 │ │
│  │         ▼                                                 │ │
│  │ ┌──────────────┐                                          │ │
│  │ │ Step 2       │  tool: translator                        │ │
│  │ │ params:      │    text: "$search_results"                │ │
│  │ │   text:      │    target: "en"                          │ │
│  │ │   "$search...│  output_var: "translated"                │ │
│  │ │   target:    │  depends_on: ["Step 1"]                  │ │
│  │ │   "en"       │                                          │ │
│  │ └──────────────┘                                          │ │
│  │         │                                                 │ │
│  │         ▼                                                 │ │
│  │ ┌──────────────┐                                          │ │
│  │ │ Step 3       │  tool: note_taking                       │ │
│  │ │ params:      │    action: "add"                          │ │
│  │ │   action:    │    content: "$translated"                 │ │
│  │ │   "add"      │  depends_on: ["Step 2"]                  │ │
│  │ │   content:   │                                          │ │
│  │ │   "$trans..."│                                          │ │
│  │ └──────────────┘                                          │ │
│  └───────────────────────────────────────────────────────────┘ │
│                              │                                  │
│                              ▼                                  │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │ 步骤2: 拓扑排序                                            │ │
│  │                                                           │ │
│  │ 依赖图:  Step 1 ──▶ Step 2 ──▶ Step 3                     │ │
│  │                                                           │ │
│  │ 执行顺序: ["Step 1", "Step 2", "Step 3"]                    │ │
│  └───────────────────────────────────────────────────────────┘ │
│                              │                                  │
│                              ▼                                  │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │ 步骤3: 按序执行                                            │ │
│  │                                                           │ │
│  │ Step 1: search("Python教程")                              │ │
│  │   → 结果: "Python入门指南..."                              │ │
│  │   → 变量: search_results = "Python入门指南..."             │ │
│  │                                                           │ │
│  │ Step 2: translator(text="Python入门指南...", target="en")  │ │
│  │   → 结果: "Python Tutorial Guide..."                      │ │
│  │   → 变量: translated = "Python Tutorial Guide..."          │ │
│  │                                                           │ │
│  │ Step 3: note_taking(action="add", content="Python...")    │ │
│  │   → 结果: 笔记已保存                                       │ │
│  └───────────────────────────────────────────────────────────┘ │
│                              │                                  │
│                              ▼                                  │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │ 步骤4: 生成最终回答                                        │ │
│  │                                                           │ │
│  │ "已搜索Python教程并翻译成英文，已保存到您的笔记中。"         │ │
│  │                                                           │ │
│  └───────────────────────────────────────────────────────────┘ │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 3.4 变量替换机制

```python
def resolve_params(self, params: Dict, context: Dict) -> Dict:
    """
    解析参数中的变量引用

    示例:
    params: {"text": "$search_results", "target": "en"}
    context: {"search_results": "Python教程内容..."}

    返回: {"text": "Python教程内容...", "target": "en"}
    """
    resolved = {}
    for key, value in params.items():
        if isinstance(value, str) and value.startswith("$"):
            var_name = value[1:]  # 去掉$前缀
            resolved[key] = context.get(var_name, value)
        else:
            resolved[key] = value
    return resolved
```

### 3.5 错误处理

```python
async def execute_plan(self, plan: ToolChainPlan) -> ToolChainResult:
    """执行工具链计划"""
    execution_order = plan.get_execution_order()
    results = {}
    step_results = []

    for step_id in execution_order:
        step = plan.step_map[step_id]

        # 检查依赖是否成功
        failed_deps = [
            dep for dep in step.depends_on
            if any(sr["step_id"] == dep and sr["status"] == "failed"
                   for sr in step_results)
        ]
        if failed_deps:
            step_results.append({
                "step_id": step_id,
                "status": "skipped",
                "error": f"依赖步骤失败: {failed_deps}"
            })
            continue

        # 解析参数（变量替换）
        resolved_params = self.resolve_params(step.params, results)

        # 执行工具
        try:
            output = await self.tools.execute_tool(
                step.tool_name,
                **resolved_params
            )

            if output.success:
                results[step.output_var] = output.result
                step_results.append({
                    "step_id": step_id,
                    "status": "success",
                    "result": output.result
                })
            else:
                step_results.append({
                    "step_id": step_id,
                    "status": "failed",
                    "error": output.error
                })

        except Exception as e:
            step_results.append({
                "step_id": step_id,
                "status": "failed",
                "error": str(e)
            })

    # 判断是否整体成功
    success = all(sr["status"] == "success" for sr in step_results)

    return ToolChainResult(
        success=success,
        step_results=step_results,
        final_result=results
    )
```

---

## 📝 四、关键算法总结

| 算法 | 核心思想 | 关键技术 | 应用场景 |
|------|----------|----------|----------|
| **记忆遗忘** | 模拟人类遗忘曲线 | 指数衰减 + 访问增强 | 长期记忆自动清理 |
| **记忆提取** | LLM自动识别重要信息 | Prompt工程 + 分类决策 | 对话信息结构化存储 |
| **工具链编排** | 有向无环图执行 | 拓扑排序 + 变量替换 | 多步骤任务自动化 |

---

## 🔗 回到目录

[📚 技术文档总览](README.md)
