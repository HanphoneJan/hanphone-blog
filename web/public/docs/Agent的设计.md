一个简洁的定义：**智能体 = 在循环中自主调用工具的 LLM**。
典型的 Agent 循环由两个主要步骤组成：

1. **模型调用** - 使用提示和可用工具调用 LLM，返回响应或执行工具的请求
2. **工具执行** - 执行 LLM 请求的工具，返回工具结果
   要构建可靠的 Agent，需要控制 Agent 循环每个步骤发生的事情，以及步骤之间发生的事情。
   推荐教程：[datawhalechina/hello-agents: 📚 《从零开始构建智能体》——从零开始的智能体原理与实践教程](https://github.com/datawhalechina/hello-agents)

## Agent开发框架

Agent开发框架可以分为代码类(langchain、crewai等等)和低代码类（dify、n8n）

| **工具名称**              | **类型**                    | **技术特点（修正后）**                                                                                                                                                           | **普遍的应用场景分析（修正后）**                                                                                                                    |
| ------------------------------- | --------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **AutoGen**               | 多智能体对话框架（实验性）        | 基于“多Agent对话”的抽象，本质是LLM之间的消息传递与prompt编排；缺乏显式状态管理与确定性控制，token消耗高、调试困难。更偏研究与模拟而非工程系统。                                      | **多角色讨论/仿真类场景**：如评审会、辩论、狼人杀、多专家讨论等“对话即结果”的任务；不适合高可靠生产任务或复杂流程自动化。                         |
| **CrewAI**                | 轻量级多Agent流程框架             | 将多Agent收敛为“角色化任务流水线”，工程上更可控；但本质仍是线性workflow + prompt编排，缺乏复杂状态管理与动态决策能力。                                                               | **结构化任务拆解执行**：如内容生成、市场分析、报告生成等“可拆解为步骤”的任务；适合中等复杂度流程，不适合强动态、多分支系统。                      |
| **AutoGPT**               | 自主Agent原型（已过时）           | 早期autonomous agent范式，实现“目标驱动+自我规划”；但存在不可控、低效率、错误累积等问题，缺乏工程可用性，基本退出生产视野。                                                          | **技术探索/概念验证**：用于理解agent规划、自反思机制；不适合实际业务系统，已被workflow+LLM模式替代。                                                |
| **Dify**                  | 低代码AI应用平台（产品层）        | 高度封装的可视化平台，集成RAG、workflow、模型调用；抽象层高，灵活性受限，本质是“AI应用搭建工具”而非底层Agent框架。                                                                   | **快速搭建AI应用**：如客服Bot、知识库问答、简单自动化流程；适合快速落地与产品验证，不适合复杂Agent系统开发。                                        |
| **n8n**                   | 通用工作流自动化平台              | 成熟的事件驱动workflow引擎，强集成能力；LLM作为普通节点使用，无Agent抽象但具备极强工程可控性与稳定性。                                                                                 | **企业级自动化流程（现实主流方案）**：如数据流转、业务自动化、SaaS集成；结合LLM可构建“弱Agent系统”，在生产中极其实用。                            |
| **LangChain / LangGraph** | LLM框架 + Agent运行时（分层体系） | LangChain提供模型/工具/RAG等抽象，但历史包袱重、部分抽象（Chain）已过时；LangGraph引入基于状态机的Graph执行模型，支持显式状态、可控流程与长生命周期任务，是当前Agent runtime演进方向。 | **分层Agent系统构建**：LangChain适合工具调用、RAG、简单Agent；LangGraph适合复杂流程、多Agent协作、长任务与可恢复系统，逐渐成为生产级Agent核心架构。 |

#### 为什么很少用到agent框架？

**当前agent开发整体处于快速迭代的过程中，范式不确定，框架不稳定；通用 Agent 框架能力不足；过于黑盒，难以定制；过度抽象，过度复杂。**

## 经典智能体范式

### ReAct (Reason + Act)

ReAct的巧妙之处在于，它认识到**思考与行动是相辅相成的**。思考指导行动，而行动的结果又反过来修正思考。为此，ReAct范式通过一种特殊的提示工程来引导模型，使其每一步的输出都遵循一个固定的轨迹：

- **Thought (思考)：** 这是智能体的“内心独白”。它会分析当前情况、分解任务、制定下一步计划，或者反思上一步的结果。
- **Action (行动)：** 这是智能体决定采取的具体动作，通常是调用一个外部工具，例如 `Search['华为最新款手机']`。
- **Observation (观察)：** 这是执行 `Action`后从外部工具返回的结果，例如搜索结果的摘要或API的返回值。

智能体将不断重复这个 **Thought -> Action -> Observation** 的循环，将新的观察结果追加到历史记录中，形成一个不断增长的上下文，直到它在 `Thought`中认为已经找到了最终答案，然后输出结果。这个过程形成了一个强大的协同效应：**推理使得行动更具目的性，而行动则为推理提供了事实依据。**
![](https://hanphone.top/gh/HanphoneJan/public-pictures/agent/ReAct%20%E8%8C%83%E5%BC%8F%E4%B8%AD%E7%9A%84%E2%80%9C%E6%80%9D%E8%80%83-%E8%A1%8C%E5%8A%A8-%E8%A7%82%E5%AF%9F%E2%80%9D%E5%8D%8F%E5%90%8C%E5%BE%AA%E7%8E%AF.webp)

#### ReAct 提示词模板

```markdown
# ReAct 提示词模板
REACT_PROMPT_TEMPLATE = """
请注意，你是一个有能力调用外部工具的智能助手。

可用工具如下:
{tools}

请严格按照以下格式进行回应:

Thought: 你的思考过程，用于分析问题、拆解任务和规划下一步行动。
Action: 你决定采取的行动，必须是以下格式之一:
- `{{tool_name}}[{{tool_input}}]`:调用一个可用工具。
- `Finish[最终答案]`:当你认为已经获得最终答案时。
- 当你收集到足够的信息，能够回答用户的最终问题时，你必须在Action:字段后使用 Finish[最终答案] 来输出最终答案。

现在，请开始解决以下问题:
Question: {question}
History: {history}
"""
```

- **角色定义**： “你是一个有能力调用外部工具的智能助手”，设定了LLM的角色。
- **工具清单 (`{tools}`)**： 告知LLM它有哪些可用的“手脚”。
- **格式规约 (`Thought`/`Action`)**： 这是最重要的部分，它强制LLM的输出具有结构性，使我们能通过代码精确解析其意图。
- **动态上下文 (`{question}`/`{history}`)**： 将用户的原始问题和不断累积的交互历史注入，让LLM基于完整的上下文进行决策。

#### ReAct 核心循环的实现

`ReActAgent` 的核心是一个循环，它不断地“格式化提示词 -> 调用LLM -> 执行动作 -> 整合结果”，直到任务完成或达到最大步数限制。

```python
class ReActAgent:
    def __init__(self, llm_client: HelloAgentsLLM, tool_executor: ToolExecutor, max_steps: int = 5):
        self.llm_client = llm_client
        self.tool_executor = tool_executor
        self.max_steps = max_steps
        self.history = []

    def run(self, question: str):
        """
        运行ReAct智能体来回答一个问题。
        """
        self.history = [] # 每次运行时重置历史记录
        current_step = 0

        while current_step < self.max_steps:
            current_step += 1
            print(f"--- 第 {current_step} 步 ---")

            # 1. 格式化提示词
            tools_desc = self.tool_executor.getAvailableTools()
            history_str = "\n".join(self.history)
            prompt = REACT_PROMPT_TEMPLATE.format(
                tools=tools_desc,
                question=question,
                history=history_str
            )

            # 2. 调用LLM进行思考
            messages = [{"role": "user", "content": prompt}]
            response_text = self.llm_client.think(messages=messages)
        
            if not response_text:
                print("错误:LLM未能返回有效响应。")
                break

            # 3. 解析LLM的输出
            # LLM 返回的是纯文本，需要用正则表达式从中精确地提取出`Thought`和`Action`。
            thought, action = self._parse_output(response_text)
        
            if thought:
                print(f"思考: {thought}")

            if not action:
                print("警告:未能解析出有效的Action，流程终止。")
                break

            # 4. 执行Action
            if action.startswith("Finish"):
                # 如果是Finish指令，提取最终答案并结束
                final_answer = re.match(r"Finish\[(.*)\]", action).group(1)
                print(f"🎉 最终答案: {final_answer}")
                return final_answer
        
            tool_name, tool_input = self._parse_action(action)
            if not tool_name or not tool_input:
                # ... 处理无效Action格式 ...
                continue

            print(f"🎬 行动: {tool_name}[{tool_input}]")
        
            tool_function = self.tool_executor.getTool(tool_name)
            if not tool_function:
                observation = f"错误:未找到名为 '{tool_name}' 的工具。"
            else:
                observation = tool_function(tool_input) # 调用真实工具

            print(f"👀 观察: {observation}")
        
            # 将本轮的Action和Observation添加到历史记录中
            self.history.append(f"Action: {action}")
            self.history.append(f"Observation: {observation}")

        # 循环结束
        print("已达到最大步数，流程终止。")
        return None

```

### Plan-and-Solve

![](https://hanphone.top/gh/HanphoneJan/public-pictures/agent/Plan-and-Solve%20%E8%8C%83%E5%BC%8F%E7%9A%84%E4%B8%A4%E9%98%B6%E6%AE%B5%E5%B7%A5%E4%BD%9C%E6%B5%81.webp)

[Plan Mode | Claude AI Dev](https://claudeai.dev/docs/mechanics/foundation/plan-mode/?utm_source=chatgpt.com)

#### 规划器 Planner

````python
PLANNER_PROMPT_TEMPLATE = """
你是一个顶级的AI规划专家。你的任务是将用户提出的复杂问题分解成一个由多个简单步骤组成的行动计划。
请确保计划中的每个步骤都是一个独立的、可执行的子任务，并且严格按照逻辑顺序排列。
你的输出必须是一个Python列表，其中每个元素都是一个描述子任务的字符串。

问题: {question}

请严格按照以下格式输出你的计划,```python与```作为前后缀是必要的:
```python
["步骤1", "步骤2", "步骤3", ...]
```
"""
````

#### 执行器 Executor

执行器的提示词与规划器不同。它的目标不是分解问题，而是**在已有上下文的基础上，专注解决当前这一个步骤**。因此，提示词需要包含以下关键信息：

- **原始问题**： 确保模型始终了解最终目标。
- **完整计划**： 让模型了解当前步骤在整个任务中的位置。
- **历史步骤与结果**： 提供至今为止已经完成的工作，作为当前步骤的直接输入。
- **当前步骤**： 明确指示模型现在需要解决哪一个具体任务。

```python
EXECUTOR_PROMPT_TEMPLATE = """
你是一位顶级的AI执行专家。你的任务是严格按照给定的计划，一步步地解决问题。
你将收到原始问题、完整的计划、以及到目前为止已经完成的步骤和结果。
请你专注于解决“当前步骤”，并仅输出该步骤的最终答案，不要输出任何额外的解释或对话。

# 原始问题:
{question}

# 完整计划:
{plan}

# 历史步骤与结果:
{history}

# 当前步骤:
{current_step}

请仅输出针对“当前步骤”的回答:
"""
```

将执行逻辑封装到 `Executor` 类中。这个类将循环遍历计划，调用 LLM，并维护一个历史记录（状态）。

```python
class Executor:
    def __init__(self, llm_client):
        self.llm_client = llm_client

    def execute(self, question: str, plan: list[str]) -> str:
        """
        根据计划，逐步执行并解决问题。
        """
        history = "" # 用于存储历史步骤和结果的字符串
    
        print("\n--- 正在执行计划 ---")
    
        for i, step in enumerate(plan):
            print(f"\n-> 正在执行步骤 {i+1}/{len(plan)}: {step}")
        
            prompt = EXECUTOR_PROMPT_TEMPLATE.format(
                question=question,
                plan=plan,
                history=history if history else "无", # 如果是第一步，则历史为空
                current_step=step
            )
        
            messages = [{"role": "user", "content": prompt}]
        
            response_text = self.llm_client.think(messages=messages) or ""
        
            # 更新历史记录，为下一步做准备
            history += f"步骤 {i+1}: {step}\n结果: {response_text}\n\n"
        
            print(f"✅ 步骤 {i+1} 已完成，结果: {response_text}")

        # 循环结束后，最后一步的响应就是最终答案
        final_answer = response_text
        return final_answer
```

### Reflection

![](https://hanphone.top/gh/HanphoneJan/public-pictures/agent/Reflection%20%E6%9C%BA%E5%88%B6%E4%B8%AD%E7%9A%84%E2%80%9C%E6%89%A7%E8%A1%8C-%E5%8F%8D%E6%80%9D-%E4%BC%98%E5%8C%96%E2%80%9D%E8%BF%AD%E4%BB%A3%E5%BE%AA%E7%8E%AF.webp)
**反思提示词 (Reflection Prompt)** 是 Reflection 机制的灵魂。它指示模型扮演“代码评审员”的角色，对上一轮生成的代码进行批判性分析，并提供具体的、可操作的反馈。

````python
REFLECT_PROMPT_TEMPLATE = """
你是一位极其严格的代码评审专家和资深算法工程师，对代码的性能有极致的要求。
你的任务是审查以下Python代码，并专注于找出其在<strong>算法效率</strong>上的主要瓶颈。

# 原始任务:
{task}

# 待审查的代码:
```python
{code}
```

请分析该代码的时间复杂度，并思考是否存在一种<strong>算法上更优</strong>的解决方案来显著提升性能。
如果存在，请清晰地指出当前算法的不足，并提出具体的、可行的改进算法建议（例如，使用筛法替代试除法）。
如果代码在算法层面已经达到最优，才能回答“无需改进”。

请直接输出你的反馈，不要包含任何额外的解释。
"""
````

## Agent Tool

### ToolRegistry

首先每个Tool都有统一的 `run`、`get_parameters` 方法接口，然后需要建立ToolRegistry提供工具的注册、发现、执行等核心功能
ToolRegistry支持两种注册方式：

1. **Tool对象注册**：适合复杂工具，支持完整的参数定义和验证
2. **函数直接注册**：适合简单工具，快速集成现有函数
   还可以设计工具链、提供异步和并行支持

### Function Call

OpenAI 在2023年Function Call（函数调用）是让 GPT 模型**结构化输出外部函数调用指令**的能力，现在已经更新为更通用的tool。简要就是： JSON Schema 详细描述好模型可以调用的函数及其参数，当用户提问后，模型会判断是否需要调用函数。如果需要，它会返回一个包含函数名和调用参数的 JSON 对象，负责解析这个 JSON，并真正去执行对应的函数拿到结果后再发给大模型。

### MCP

[What is the Model Context Protocol (MCP)? - Model Context Protocol](https://modelcontextprotocol.io/docs/getting-started/intro)
[modelcontextprotocol/servers: Model Context Protocol Servers](https://github.com/modelcontextprotocol/servers)

MCP是一个Agent与Tool服务之间的通信协议，运行Tool的服务是MCP Server，AI Agent是MCP Client，两者可以通过本地标准输入输出或者HTTP连接。
MCP 可以类比为 **HTTP**（定义了通信的协议、格式、发现机制），那么 **Function Calling** 可以类比为 **RPC（远程过程调用）** ——它是模型发起具体功能调用的执行方式，是协议之上的一次性请求-响应操作。
**MCP Server** 可以提供：

- **Tools**：使大语言模型能够通过你的 Server 执行操作。
- **Resources**：将 Server 上的数据和内容开放给大语言模型。
- **Prompts**：创建可复用的提示词模板和工作流程。

![大模型MCP与Agent交互.webp](https://hanphone.top/gh/HanphoneJan/public-pictures/learn/%E5%A4%A7%E6%A8%A1%E5%9E%8BMCP%E4%B8%8EAgent%E4%BA%A4%E4%BA%92.webp)

![mcp示例图1.webp](https://hanphone.top/gh/HanphoneJan/public-pictures/agent/mcp%E7%A4%BA%E4%BE%8B%E5%9B%BE1.webp)

#### MCP的组成

MCP 由三个核心组件构成：Host（主机）、Client（客户端） 和 Server（服务器）。

假设你正在使用 Claude Desktop (Host) 询问："我桌面上有哪些文档？"

**（1）Host**：Claude Desktop 作为 Host，负责接收你的提问并与 Claude 模型交互。

**（2）Client**：当 Claude 模型决定需要访问你的文件系统时，Host 中内置的 MCP Client 会被激活。这个 Client 负责与适当的 MCP Server 建立连接。

**（3）Server**：在这个例子中，文件系统 MCP Server 会被调用。它负责执行实际的文件扫描操作，访问你的桌面目录，并返回找到的文档列表。

整个流程是这样的：你的问题 → Claude Desktop(Host) → Claude 模型 → 需要文件信息 → MCP Client 连接 → 文件系统 MCP Server → 执行操作 → 返回结果 → Claude 生成回答 → 显示在 Claude Desktop 上。

#### **MCP客户端与服务器的通信方式**

MCP 协议本身不依赖于特定的传输方式，可以在不同的通信通道上运行。

| 传输方式       | 适用场景             | 优点               | 缺点                       |
| -------------- | -------------------- | ------------------ | -------------------------- |
| Memory         | 单元测试、快速原型   | 最快、无网络开销   | 仅限同进程                 |
| Stdio          | 本地开发、命令行工具 | 简单、无需网络配置 | 仅限本地、可能有兼容性问题 |
| HTTP           | 生产环境、远程服务   | 通用、防火墙友好   | 无流式支持、延迟较高       |
| SSE            | 实时通信、流式响应   | 支持服务器推送     | 单向通信、需要HTTP服务器   |
| StreamableHTTP | 流式HTTP通信         | 双向流式、HTTP兼容 | 需要特定服务器支持         |

#### MCP 工具自动展开的工作原理

当你添加一个 MCP 工具到 Agent 时，它会自动将 MCP 服务器提供的所有工具展开为独立的工具，让 Agent 可以像调用普通工具一样调用它们。

```python
# 用户代码
fs_tool = MCPTool(name="fs", server_command=[...])
agent.add_tool(fs_tool)

# 内部发生的事情：
# 1. MCPTool连接到服务器，发现14个工具
# 2. 为每个工具创建包装器：
#    - fs_read_text_file (参数: path, tail, head)
#    - fs_write_file (参数: path, content)
#    - ...
# 3. 注册到Agent的工具注册表

# Agent调用
response = agent.run("读取README.md")

# Agent内部：
# 1. 识别需要调用 fs_read_text_file
# 2. 生成参数：path=README.md
# 3. 包装器转换为MCP格式：
#    {"action": "call_tool", "tool_name": "read_text_file", "arguments": {"path": "README.md"}}
# 4. 调用MCP服务器
# 5. 返回文件内容
```

### 联网搜索API

可以进行多源搜索，联网搜索API常接入 [SerpApi: Google Search API](https://serpapi.com/)（传统Google搜索）   [Tavily](https://www.tavily.com/)(专业AI搜索)

| 维度                                                  | Answer Box（答案摘要框）                          | Knowledge Graph（知识图谱）                    |
| ----------------------------------------------------- | ------------------------------------------------- | ---------------------------------------------- |
| **定位**                                        | 直接回答**问题**，提供 “一句话答案”       | 展示**实体**的**结构化属性与关系** |
| **数据类型**                                    | 短文本、纯摘要、问答式                            | 结构化 JSON：实体、属性、图片、链接、关系      |
| **触发场景**                                    | 问答类、事实类、指令类查询（“是什么 / 怎么做”） | 实体类查询（人名、地名、机构、景点、概念）     |
| **API 位置**                                    | 通常在 `answerBox` 或 `items[0]`              | 通常在顶层 `knowledgeGraph` 字段             |
| **信息深度**                                    | 浅：仅核心答案                                    | 深：完整实体属性、来源、关联实体               |
| **典型示例**                                    | “世界最高峰是珠穆朗玛峰”                        | 埃菲尔铁塔：高度、位置、建造时间、设计师、图片 |
| **使用场景**                                    | 快速问答、摘要生成、即时答案                      | 知识卡片、实体展示、百科类应用、语义关联       |
| 优先使用answer box和knowledge graph，然后才是搜索结果 |                                                   |                                                |

### Web Fecth

### Shell 接入

1、用 apply_patch 工具修改文件和代码，不要用终端，方便恢复与修改，也不容易编码错误
执行时间长

### 如何提升工具选择的准确率？

**结构化Prompt工程**

- 强制用户输入结构化需求（如JSON Schema、表单），减少歧义

```
请将用户需求解析为以下JSON格式，用于工具调用：
{
	"task": "任务名称（如rag_retrieve、sql_query）",
	"parameters": {
		"必填参数1": "值",
		"可选参数2": "值"
	}
}
用户需求：查询2025年10月的用户订单数据
```

同时启用LLM的**JSON模式**（如OpenAI的response_format="json_object"），强制输出JSON，避免格式错误
**Few-shot+思维链（CoT）**

- 提供工具调用的正例+反例，让LLM学习正确的解析方式

```
正确示例1：
用户需求：查询苹果的价格
解析结果：{"task":"product_price","parameters":{"product":"苹果"}}
错误示例1（工具选错）：
用户需求：查询苹果的价格
解析结果：{"task":"weather_query","parameters":{"city":"北京"}}
```

**意图分类微调**

- 构建工具意图分类数据集（需求→工具），微调LLM或轻量分类模型

| 用户需求       | 目标工具     |
| :------------- | :----------- |
| 查询订单数据   | sql_query    |
| 检索知识库文档 | rag_retrieve |
| 生成产品宣传图 | sd_generate  |

## Agent的记忆

### 记忆时间分层

| 记忆层级           | 定义                                                 | 存储方式                      | 调用策略                                                 | 适用场景                   |
| :----------------- | :--------------------------------------------------- | :---------------------------- | :------------------------------------------------------- | :------------------------- |
| **短期记忆** | 最近的交互记录（如当前对话轮次、正在执行的任务）     | 内存缓存（如共享上下文字典）  | 直接放入上下文窗口                                       | 实时交互、当前任务执行     |
| **长期记忆** | 历史关键信息（如用户偏好、任务结果、核心知识）       | 向量数据库 / 关系型数据库     | **检索调用**：仅当任务需要时，检索相关片段放入窗口 | 用户长期偏好、历史任务成果 |
| **临时记忆** | 一次性中间结果（如工具调用的临时数据、过期任务日志） | 本地文件 / 缓存（带过期时间） | 定期清理，不放入上下文                                   | 临时数据、非核心中间结果   |

### Memory Tool

专注于用户接口和参数处理

```python
def execute(self, action: str, **kwargs) -> str:
    """执行记忆操作

    支持的操作：
    - add: 添加记忆（支持4种类型: working/episodic/semantic/perceptual）
    - search: 搜索记忆
    - summary: 获取记忆摘要
    - stats: 获取统计信息
    - update: 更新记忆
    - remove: 删除记忆
    - forget: 遗忘记忆（多种策略）
    - consolidate: 整合记忆（短期→长期）
    - clear_all: 清空所有记忆
    """
```

#### add

add一般需要实现：**会话ID的自动管理（确保每个记忆都有明确的会话归属）、多模态数据的智能处理（自动推断文件类型并保存相关元数据）、以及上下文信息的自动补充（为每个记忆添加时间戳和会话信息）**。其中，`importance`参数（默认0.5）用于标记记忆的重要程度，取值范围0.0-1.0，这个机制模拟了人类大脑对不同信息重要性的评估。这种设计让Agent能够自动区分不同时间段的对话，并为后续的检索和管理提供丰富的上下文信息

```python
# 1. 工作记忆 - 临时信息，容量有限
memory_tool.execute("add",
    content="用户刚才问了关于Python函数的问题",
    memory_type="working",
    importance=0.6
)

# 2. 情景记忆 - 具体事件和经历
memory_tool.execute("add",
    content="2024年3月15日，用户张三完成了第一个Python项目",
    memory_type="episodic",
    importance=0.8,
    event_type="milestone",
    location="在线学习平台"
)

# 3. 语义记忆 - 抽象知识和概念
memory_tool.execute("add",
    content="Python是一种解释型、面向对象的编程语言",
    memory_type="semantic",
    importance=0.9,
    knowledge_type="factual"
)

# 4. 感知记忆 - 多模态信息
memory_tool.execute("add",
    content="用户上传了一张Python代码截图，包含函数定义",
    memory_type="perceptual",
    importance=0.7,
    modality="image",
    file_path="./uploads/code_screenshot.png"
)
```

#### search

```python
# 基础搜索
result = memory_tool.execute("search", query="Python编程", limit=5)

# 指定记忆类型搜索
result = memory_tool.execute("search",
    query="学习进度",
    memory_type="episodic",
    limit=3
)

# 多类型搜索
result = memory_tool.execute("search",
    query="函数定义",
    memory_types=["semantic", "episodic"],
    min_importance=0.5
)
```

#### forget

支持三种策略：基于重要性（删除不重要的记忆）、基于时间（删除过时的记忆）和基于容量（当存储接近上限时删除最不重要的记忆）。

#### consolidate

将短期记忆转化为长期记忆的过程。默认设置是将重要性超过0.7的工作记忆转换为情景记忆

### Memory Manager

MemoryManager则负责核心的记忆管理逻辑。MemoryTool在初始化时会创建一个MemoryManager实例，并根据配置启用不同类型的记忆模块。
![](https://hanphone.top/gh/HanphoneJan/public-pictures/agent/HelloAgents%E8%AE%B0%E5%BF%86%E7%B3%BB%E7%BB%9F%E7%9A%84%E5%AE%8C%E6%95%B4%E5%B7%A5%E4%BD%9C%E6%B5%81%E7%A8%8B.webp.webp)

#### 1. 工作记忆 (Working Memory)

- **存储**：纯内存 + TTL自动过期（默认60分钟）
- **容量**：默认50条，超出则移除低优先级项
- **检索**：混合策略（TF-IDF向量 + 关键词匹配），权重：向量0.7 + 关键词0.3
- **评分**：`(相似度×时间衰减) × (0.8 + 重要性×0.4)`
- **特点**：极快访问，会话结束即清空

#### 2. 情景记忆 (Episodic Memory)

- **存储**：SQLite（结构化） + Qdrant（向量），持久化
- **检索**：结构化预过滤（时间、重要性） → 向量语义检索 → 综合评分

```python
def retrieve(self, query: str, limit: int = 5, **kwargs) -> List[MemoryItem]:
	"""混合检索：结构化过滤 + 语义向量检索"""
	# 1. 结构化预过滤（时间范围、重要性等）
	candidate_ids = self._structured_filter(**kwargs)

	# 2. 向量语义检索
	hits = self._vector_search(query, limit * 5, kwargs.get("user_id"))

	# 3. 综合评分与排序
	results = []
	for hit in hits:
		if self._should_include(hit, candidate_ids, kwargs):
			score = self._calculate_episode_score(hit)
			memory_item = self._create_memory_item(hit)
			results.append((score, memory_item))

	results.sort(key=lambda x: x[0], reverse=True)
	return [item for _, item in results[:limit]]
```

- **评分**：`(向量相似度×0.8 + 时间近因性×0.2) × (0.8 + 重要性×0.4)`
- **特点**：保持事件完整性，支持时间序列/会话回溯

#### 3. 语义记忆 (Semantic Memory)

语义记忆是记忆系统中最复杂的部分，它负责存储抽象的概念、规则和知识。语义记忆的设计重点在于知识的结构化表示和智能推理能力。

```python
class SemanticMemory(BaseMemory):
    """语义记忆实现
  
    特点：
    - 使用HuggingFace中文预训练模型进行文本嵌入
    - 向量检索进行快速相似度匹配
    - 知识图谱存储实体和关系
    - 混合检索策略：向量+图+语义推理
    """
  
    def __init__(self, config: MemoryConfig, storage_backend=None):
        super().__init__(config, storage_backend)
    
        # 嵌入模型（统一提供）
        self.embedding_model = get_text_embedder()
    
        # 专业数据库存储
        self.vector_store = QdrantConnectionManager.get_instance(**qdrant_config)
        self.graph_store = Neo4jGraphStore(**neo4j_config)
    
        # 实体和关系缓存
        self.entities: Dict[str, Entity] = {}
        self.relations: List[Relation] = []
    
        # NLP处理器（支持中英文）
        self.nlp = self._init_nlp()
```

- **存储**：Neo4j（知识图谱） + Qdrant（向量），自动提取实体与关系

```python
def add(self, memory_item: MemoryItem) -> str:
    """添加语义记忆"""
    # 1. 生成文本嵌入
    embedding = self.embedding_model.encode(memory_item.content)
  
    # 2. 提取实体和关系
    entities = self._extract_entities(memory_item.content)
    relations = self._extract_relations(memory_item.content, entities)
  
    # 3. 存储到Neo4j图数据库
    for entity in entities:
        self._add_entity_to_graph(entity, memory_item)
  
    for relation in relations:
        self._add_relation_to_graph(relation, memory_item)
  
    # 4. 存储到Qdrant向量数据库
    metadata = {
        "memory_id": memory_item.id,
        "entities": [e.entity_id for e in entities],
        "entity_count": len(entities),
        "relation_count": len(relations)
    }
  
    self.vector_store.add_vectors(
        vectors=[embedding.tolist()],
        metadata=[metadata],
        ids=[memory_item.id]
    )
```

- **检索**：向量检索（语义） + 图检索（关系推理） → 混合排序
- **评分**：`(向量×0.7 + 图相似度×0.3) × (0.8 + 重要性×0.4)`
  **向量检索权重（0.7）**：语义相似度是主要因素，确保检索结果与查询语义相关
  **图检索权重（0.3）**：关系推理作为补充，发现概念间的隐含关联
  **重要性权重范围\[0.8, 1.2]**：避免重要性过度影响相似度排序，保持检索的准确性
- **特点**：构建知识体系，支持概念关联与推理

#### 4. 感知记忆 (Perceptual Memory)

- **存储**：按模态分离（文本/图像/音频），各自独立向量集合，避免了维度不匹配的问题

```python
class PerceptualMemory(BaseMemory):
    """感知记忆实现
  
    特点：
    - 支持多模态数据（文本、图像、音频等）
    - 跨模态相似性搜索
    - 感知数据的语义理解
    - 支持内容生成和检索
    """
  
    def __init__(self, config: MemoryConfig, storage_backend=None):
        super().__init__(config, storage_backend)
    
        # 多模态编码器
        self.text_embedder = get_text_embedder()
        self._clip_model = self._init_clip_model()  # 图像编码
        self._clap_model = self._init_clap_model()  # 音频编码
    
        # 按模态分离的向量存储
        self.vector_stores = {
            "text": QdrantConnectionManager.get_instance(
                collection_name="perceptual_text",
                vector_size=self.vector_dim
            ),
            "image": QdrantConnectionManager.get_instance(
                collection_name="perceptual_image", 
                vector_size=self._image_dim
            ),
            "audio": QdrantConnectionManager.get_instance(
                collection_name="perceptual_audio",
                vector_size=self._audio_dim
            )
        }
```

- **编码**：文本用通用嵌入，图像用CLIP，音频用CLAP
- **检索**：同模态或跨模态，同模态检索利用专业的编码器进行精确匹配，而跨模态检索则需要更复杂的语义对齐机制。
- **评分**：`(向量×0.8 + 时间近因性×0.2) × (0.8 + 重要性×0.4)`

## RAG

Retrieval-Augmented Generation，**检索**是指从知识库中查询相关内容；**增强**是将检索结果融入提示词，辅助模型生成；**生成**则输出兼具准确性与透明度的答案。

初级：**检索方式**：主要依赖传统的关键词匹配算法，如 `TF-IDF`或 `BM25`。这些方法计算词频和文档频率来评估相关性，对字面匹配效果好，但难以理解语义上的相似性。**生成模式/检索后处理**：将检索到的文档内容不加处理地直接拼接到提示词的上下文中，然后送给生成模型。

高级：**检索方式**：转向基于**稠密嵌入（Dense Embedding）**的语义检索。通过将文本转换为高维向量，模型能够理解和匹配语义上的相似性，而不仅仅是关键词。 **生成模式/检索后处理**：引入了很多优化技术，例如查询重写，文档分块，重排序等。

模块化：**检索方式**：如混合检索，多查询扩展，假设性文档嵌入等。**生成模式**：思维链推理，自我反思与修正等。

### RAG的系统设计

![](https://hanphone.top/gh/HanphoneJan/public-pictures/agent/hello-agentRAG%E7%B3%BB%E7%BB%9F%E7%9A%84%E6%A0%B8%E5%BF%83%E5%B7%A5%E4%BD%9C%E5%8E%9F%E7%90%86.webp)
**可以将RAG也设计为tool**

```plaintext
用户层：RAGTool统一接口
  ↓
应用层：智能问答、搜索、管理
  ↓  
处理层：文档解析、分块、向量化
  ↓
存储层：向量数据库、文档存储
  ↓
基础层：嵌入模型、LLM、数据库
```

### 文档载入

```
任意格式文档 → MarkItDown转换 → Markdown文本 → 智能分块 → 向量化 → 存储检索
```

MarkItDown是微软开源的通用文档转换工具，负责将任意格式的文档统一转换为结构化的Markdown文本。无论输入是PDF、Word、Excel、图片还是音频，最终都会转换为标准的Markdown格式

```
标准Markdown文本 → 标题层次解析 → 段落语义分割 → Token计算分块 → 重叠策略优化 → 向量化准备
       ↓                ↓              ↓            ↓           ↓            ↓
   统一格式          #/##/###        语义边界      大小控制     信息连续性    嵌入向量
   结构清晰          层次识别        完整性保证    检索优化     上下文保持    相似度匹配
```

### 如何切分文档？

### 检索策略

#### 多查询扩展（MQE）

多查询扩展（Multi-Query Expansion）是一种通过LLM生成语义等价的多样化查询来提高检索召回率的技术。

#### 假设文档嵌入（HyDE）

假设文档嵌入（Hypothetical Document Embeddings，HyDE）是的核心思想是"用答案找答案"。传统的检索方法是用问题去匹配文档，但问题和答案在语义空间中的分布往往存在差异——问题通常是疑问句，而文档内容是陈述句。HyDE通过让LLM先生成一个假设性的答案段落，然后用这个答案段落去检索真实文档。

### ANN算法

### GraphRAG

GraphRAG 即图检索增强生成，是一种进阶的 RAG 范式，核心是引入知识图谱对传统 RAG 的检索模块升级，通过结构化的图组织知识，以此提升复杂推理能力与答案逻辑性，解决传统 RAG 处理多跳问题时信息零散、关联性弱等缺陷。
将非结构化文本转化为知识图谱中 “实体（节点） - 关系（边）” 的结构化形式，再借助图的特性开展检索。比如从 “成都的大熊猫基地适合亲子游玩” 中，提取实体 “成都大熊猫基地”，关系 “适合”，实体 “亲子游玩” 构成图谱单元。这种结构化方式让知识关联清晰可查，不像传统 RAG 仅靠向量相似度模糊匹配文本片段。
GraphRAG通过反复询问让AI对原文提取知识图谱， GraphRAG会存储知识图谱以及知识图谱中节点与原文的关系（就像片段向量与原文片段），节点过多时，对于较密集的区域合并为一个子图，让AI对子图生成总结性信息。
localSearch与globalSearch两种检索方式，前者更适合细节性，后者适合全局。

## Context上下文工程

| 上下文类型               | 你控制的内容                                                | 瞬态或持久 |
| ------------------------ | ----------------------------------------------------------- | ---------- |
| **模型上下文**     | 模型调用中包含什么（指令、消息历史、工具、响应格式）        | 瞬态       |
| **工具上下文**     | 工具可以访问和产生什么（对状态、存储、运行时上下文的读/写） | 持久       |
| **生命周期上下文** | 模型和工具调用之间发生什么（摘要、防护栏、日志等）          | 持久       |

![](https://hanphone.top/gh/HanphoneJan/public-pictures/agent/Prompt%20engineering%20vs%20Context%20engineering.webp)
**上下文腐蚀（context rot）**——当窗口过大时，位于中间部分的信息容易被“忽视”，回忆准确率下降。因此 **上下文必须被视作一种有限资源，且具有边际收益递减**。
上下文工程是提示工程的自然演进。提示工程关注如何编写与组织 LLM 的指令以获得更优结果（例如系统提示的写法与结构化策略）；而上下文工程则是**在推理阶段，如何策划与维护“最优的信息集合（tokens）”**，其中不仅包含提示本身，还包含其他会进入上下文窗口的一切信息。

从“推理前一次性检索（embedding 检索）”逐步过渡到“**及时（Just-in-time, JIT）上下文**”。后者不再预先加载所有相关数据，而是维护**轻量化引用**（文件路径、存储查询、URL 等），在运行时通过工具动态加载所需数据。这样可让模型撰写针对性查询、缓存必要结果，并用诸如 `head`/`tail` 之类的命令分析大体量数据——无需把整块数据一次性塞入上下文。
除了存储效率，**引用的元数据**本身也能帮助精化行为：目录层级、命名约定、时间戳等都在隐含地传达“目的与时效”。例如，`tests/test_utils.py` 与 `src/core/test_utils.py` 的语义暗示就不同。

允许智能体自主导航与检索还能实现**渐进式披露（progressive disclosure）**：每一步交互都会产生新的上下文，反过来指导下一步决策——文件大小暗示复杂度、命名暗示用途、时间戳暗示相关性。智能体得以按层构建理解，只在工作记忆中保留“当前必要子集”，并用“记笔记”的方式做补充持久化，从而维持聚焦而非“被大而全拖垮”。

需要权衡的是：运行时探索往往比预计算检索更慢，并且需要有“主见”的工程设计来确保模型拥有正确的工具与启发式。如果缺少引导，智能体可能会误用工具、追逐死胡同或错过关键信息，造成上下文浪费。

在不少场景中，**混合策略**更有效：前置加载少量“高价值”上下文以保证速度，然后允许智能体按需继续自主探索。边界的选择取决于任务动态性与时效要求。在工程上，可以预先放入类似“项目约定说明（如 README/指南）”的文件，同时提供 `glob`、`grep` 等原语，让智能体即时检索具体文件，从而绕开过时索引与复杂语法树的沉没成本。

### LLM的上下文窗口究竟是什么？

**上下文窗口** 是 LLM 在单次推理中能接收的**输入总量上限**（通常以 token 数衡量），本质是**训练时使用的最大序列长度**。
Transformer 的核心自注意力计算复杂度为 **O(n²)**，硬件很难跟上。往往依赖 **稀疏注意力**、**硬件优化**、**分布式推理** 等工程手段突破单卡限制。
不同位置编码对长序列的泛化能力不同：**绝对位置编码**（如原始 Transformer 的三角函数编码）在训练长度内有效，超出后外推能力弱。**相对位置编码**（如 RoPE、ALiBi）能更好地外推到训练时未见过的更长序列

### 压缩整合（Compaction）

当对话接近上下文上限时，对其进行高保真总结，并用该摘要重启一个新的上下文窗口，以维持长程连贯性。关键在于让模型压缩并保留架构性决策、未解决缺陷、实现细节，丢弃重复的工具输出与噪声；新窗口携带压缩摘要 + 最近少量高相关工件（如“最近访问的若干文件”）。
调参建议：先优化**召回**（确保不遗漏关键信息），再优化**精确度**（剔除冗余内容）；一种安全的“轻触式”压缩是对“深历史中的工具调用与结果”进行清理。

#### 如何压缩上下文

### 结构化笔记NoteTool

NoteTool 是为"长时程任务"提供的结构化外部记忆组件。它以 Markdown 文件作为载体，头部使用 YAML 前置元数据记录关键信息，正文用于记录状态、结论、阻塞与行动项等内容。
MemoryTool 主要关注**对话式记忆**——短期工作记忆、情景记忆和语义记忆。**对于需要长期追踪、结构化管理的项目式任务，我们需要一种更轻量、更人类友好的记录方式。**

NoteTool 填补了这个gap，它提供了：

- **结构化记录**：使用 Markdown + YAML 格式，既适合机器解析，也方便人类阅读和编辑；文件即ID。
- **版本友好**：纯文本格式，天然支持 Git 等版本控制系统
- **低开销**：无需复杂的数据库操作，适合轻量级的状态追踪
- **灵活分类**：通过 `type` 和 `tags` 灵活组织笔记，支持多维度检索

````markdown
---
id: note_20250119_153000_0
title: 项目进展 - 第一阶段
type: task_state
tags: [refactoring, phase1, backend]
created_at: 2025-01-19T15:30:00
updated_at: 2025-01-19T15:30:00
---

# 项目进展 - 第一阶段

## 完成情况

已完成数据模型层的重构,主要改动包括:

1. 统一了实体类的命名规范
2. 引入了类型提示,提升代码可维护性
3. 优化了数据库查询性能

## 测试覆盖

- 单元测试覆盖率: 85%
- 集成测试覆盖率: 70%

## 下一步计划

1. 重构业务逻辑层
2. 解决依赖冲突问题
3. 提升集成测试覆盖率至85%
````

NoteTool 维护一个 `notes_index.json` 文件，用于快速检索和管理笔记

```json
{
  "note_20250119_153000_0": {
    "id": "note_20250119_153000_0",
    "title": "项目进展 - 第一阶段",
    "type": "task_state",
    "tags": ["refactoring", "phase1", "backend"],
    "created_at": "2025-01-19T15:30:00",
    "updated_at": "2025-01-19T15:30:00",
    "file_path": "./notes/note_20250119_153000_0.md"
  }
}

```

#### 笔记分类

- `task_state`：记录阶段性进展和状态
- `conclusion`：记录重要的结论和发现
- `blocker`：记录阻塞问题，优先级最高
- `action`：记录下一步行动计划
- `reference`：记录重要的参考资料

### Terminal Tool

即时(Just-in-time, JIT)上下文"理念的体现。
需要命令白名单、**工作目录限制(沙箱)**、**超时控制**和**输出大小限制**。

### 子代理架构（Sub-agent architectures）

由主代理负责高层规划与综合，多个专长子代理在“干净的上下文窗口”中各自深挖、调用工具并探索，最后仅回传**凝练摘要**（常见 1,000–2,000 tokens）。
好处：实现关注点分离。庞杂的搜索上下文留在子代理内部，主代理专注于整合与推理；适合需要并行探索的复杂研究/分析任务。该模式在复杂研究任务上相较单代理基线具有显著优势。

### ContextBuilder

设计原则：

1. **统一入口**：将"获取(Gather)- 选择(Select)- 结构化(Structure)- 压缩(Compress)"抽象为可复用流水线，减少在 Agent 实现中的重复模板代码。这种统一的接口设计让开发者无需在每个 Agent 中重复编写上下文管理逻辑。
2. **稳定形态**：输出固定骨架的上下文模板，便于调试、A/B 测试与评估。我们采用了分区组织的模板结构：
   - `[Role & Policies]`：明确 Agent 的角色定位和行为准则
   - `[Task]`：当前需要完成的具体任务
   - `[State]`：Agent 的当前状态和上下文信息
   - `[Evidence]`：从外部知识库检索的证据信息
   - `[Context]`：历史对话和相关记忆
   - `[Output]`：期望的输出格式和要求
3. **预算守护**：在 token 预算内尽量保留高价值信息，对超限上下文提供兜底压缩策略。
4. **最小规则**：不引入来源/优先级等分类维度，避免复杂度增长。实践表明，基于相关性和新近性的简单评分机制，在大多数场景下已经足够有效。
   候选信息包：用于封装各类候选信息，包括content: 信息内容 timestamp: 时间戳 token_count: Token 数量 relevance_score: 相关性分数(0.0-1.0) metadata: 可选的元数据。
   上下文构建配置：max_tokens: 最大 token 数量 reserve_ratio: 为系统指令预留的比例(0.0-1.0) min_relevance: 最低相关性阈值 enable_compression: 是否启用压缩 recency_weight: 新近性权重(0.0-1.0) relevance_weight: 相关性权重(0.0-1.0)。

#### GSSC流水线

Gather-Select-Structure-Compress流水线机制

##### Gather（汇集）

- 多源输入：系统指令、记忆检索、RAG 结果、对话历史、自定义包
- **容错机制**：每个外部数据源的调用都被 try-except 包裹，确保单个源的失败不会影响整体流程
- **优先级处理**：系统指令被标记为高优先级，确保始终被保留
- **历史限制**：对话历史只保留最近的几条，避免上下文窗口被历史信息占据

##### Select（选择）

**根据相关性和新近性对候选信息进行评分和选择。这是整个流水线的核心，直接决定了最终上下文的质量。**

- 分离系统指令与普通信息，系统指令优先占用预算
- 综合分数 = `relevance_weight × 相关性 + recency_weight × 新近性`
- **评分机制**：采用相关性和新近性的加权组合，权重可配置
- **贪心算法**：按分数从高到低填充直至达到 Token 预算，确保在有限预算内选择最有价值的信息
- **过滤机制**：通过 `min_relevance` 参数过滤低质量信息

##### Structure（结构化）

按类型分组（系统指令 / 证据 / 上下文）
输出固定分区模板：`[Role & Policies]`、`[Task]`、`[Evidence]`、`[Context]`、`[Output]`

##### Compress（压缩）

仅在超限时触发；按分区保留，优先保证每个分区的完整性；剩余预算不足时做截断，并添加 `[... 内容已压缩 ...]` 标记

## 向量数据库

| 特性维度                                                                                                              | **Milvus**                                                 | **Qdrant**                            | **Pgvector (PostgreSQL)**                        | **Elasticsearch**                                       |
| --------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- | ------------------------------------------- | ------------------------------------------------------ | ------------------------------------------------------------- |
| **核心类型**                                                                                                    | **专用向量数据库**                                         | **专用向量数据库**                    | **PostgreSQL的向量扩展**                         | **搜索与分析引擎**                                      |
| **核心优势**                                                                                                    | 大规模、高性能向量检索，功能最全（多向量、标量过滤、时间旅行等） | Rust编写，性能优异，API设计友好，云服务成熟 | **简单易用**，强事务支持，与现有PG生态无缝集成   | **成熟的全文检索**，支持混合查询（文本+向量），生态庞大 |
| **适用场景**                                                                                                    | 超大规模向量检索，AI应用（如推荐、AIGC）、需要复杂过滤           | 需要高性能和简洁API的生产环境，云原生部署   | 已有PostgreSQL，需要快速添加向量搜索，或要求强ACID事务 | 以文本搜索为主，结合向量进行语义增强或混合搜索                |
| **生态整合**                                                                                                    | 丰富的AI生态工具（Attu，周边库）                                 | HTTP/gRPC接口，客户端库丰富，云服务完善     | 完全兼容PostgreSQL所有工具和ORM                        | 庞大的ELK生态，工具链成熟                                     |
| **缺点**                                                                                                        | 架构相对复杂，运维成本较高                                       | 社区和生态相对较新、较小                    | 纯向量检索性能与专用数据库有差距                       | 纯向量检索性能非最优，资源消耗大                              |
| **FAISS 可单独用于离线 / 内存级向量检索，但无持久化、元数据管理能力，如果需要用于记忆管理，仍旧需要搭配数据库** |                                                                  |                                             |                                                        |                                                               |

#### Qdrant

[本地快速入门 - Qdrant 向量数据库](https://qdrant.org.cn/documentation/quickstart/)
![qdrant官方架构图.webp](https://hanphone.top/gh/HanphoneJan/public-pictures/agent/qdrant%E5%AE%98%E6%96%B9%E6%9E%B6%E6%9E%84%E5%9B%BE.webp)

```shell
# 创建命名卷（推荐！）
docker volume create qdrant_data

docker run -p 6333:6333 -p 6334:6334 -v qdrant_data:/qdrant/storage --name qdrant -d qdrant/qdrant:latest

-p 6333：REST API + Dashboard端口
-p 6334：gRPC端口（客户端推荐使用）
-v：数据持久化
--name：容器命名，方便管理
-d：后台运行
```

#### Milvus

#### Elasticsearch

未使用

### 向量数据库VS文件

## Agentic RL

## Agent安全边界

### Sandbox

### AskBeforeEdit如何实现

### 权限控制

## 智能体性能评估

## Agent应用的前端

```
┌─────────────────────────────────────────────────────────────────┐
│                         LLM 响应处理                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   SSE Stream ──→ JSON 解析 ──→ 类型判断                          │
│                                    │                            │
│                    ┌───────────────┼───────────────┐            │
│                    ▼               ▼               ▼            │
│              artifact: true    纯文本         混合内容           │
│                    │               │               │            │
│                    ▼               ▼               ▼            │
│            ArtifactRenderer   Markdown渲染   分段处理            │
│                    │                                            │
│         ┌─────────┼─────────┬─────────┐                        │
│         ▼         ▼         ▼         ▼                        │
│    MetricCard  ChartView  TableView  ReportCard                │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Artifact

[Generate Artifacts - Agent Communication Protocol](https://agentcommunicationprotocol.dev/how-to/generate-artifacts)
Artifacts 是 ACP 协议中**带命名的特殊消息组件**，用于表示文件、图片、结构化数据等输出内容。

```python
Artifact(
        name="image.png",  # 制品名称（带后缀，便于消费方识别）
        content=base64.b64encode(buffer.read()).decode("utf-8"),  # Base64编码为字符串
        content_encoding="base64",  # 声明编码方式，二进制设`base64`，文本默认`plain`
        content_type="image/png"    # 声明媒体类型
    )
```

### 常用渲染技术栈

- **Markdown解析库**： **marked.js**、**remark / unified** 、 **markdown-it** 
- **代码高亮**：**Prism.js**  、**highlight.js** 、**Shiki**
- **LaTeX 公式**：KaTeX 或 MathJax
- **代码块**：带复制按钮、语言标签
- **表格**：响应式表格组件
- **Mermaid 图表**：部分平台支持

### SSE流式渲染（Streaming）

ChatGPT 的打字机效果实现：

```javascript
// SSE (Server-Sent Events) 接收流式响应
const eventSource = new EventSource('/api/chat');
eventSource.onmessage = (event) => {
  const chunk = JSON.parse(event.data);
  // 增量追加到 Markdown 缓冲区
  markdownBuffer += chunk.content;
  // 实时渲染
  renderMarkdown(markdownBuffer);
};
```

### Block

## Multi Agent设计

### 两种agent交互模式

| 模式                                                                                                                                                                                                                                                                                   | 工作原理                                                                                                           | 控制流                                           | 使用场景                 |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------ | ------------------------ |
| **Tool Calling**                                                                                                                                                                                                                                                                 | **工具调用。**Supervisor Agent将其他Agent作为_工具_调用。"工具"Agent不直接与用户对话——它们只执行任务并返回结果。 | 集中式：所有路由都通过调用Agent。                | 任务编排、结构化工作流。 |
| **Handoffs**                                                                                                                                                                                                                                                                     | **任务转移。**当前的Agent决定将控制权转移给另一个Agent。活动Agent随之变更，用户可以继续与新的Agent直接交互。       | 去中心化：Agent可以改变当前由谁来担当活跃Agent。 | 跨领域对话、专家接管。   |
| Subagents 是 Tool Calling 模式（集中控制），用的比较多。                                                                                                                                                                                                                               |                                                                                                                    |                                                  |                          |
| Handoffs模式一般应用于专业顾问与复杂工作流，比如客户服务是Handoffs模式最经典的应用领域，因为用户需求往往在对话中动态变化（如咨询→退款→售后），需要不同专业智能体接力处理。最近也进一步发展出**Agent Teams（智能体团队）** 功能，也被称为 **Agent Swarm（智能体蜂群）** |                                                                                                                    |                                                  |                          |
| 无论哪种模式，**会话 ID + 共享存储**是最稳健的实现方式，它能让多个 Agent 解耦，同时保证上下文一致性。                                                                                                                                                                            |                                                                                                                    |                                                  |                          |

#### Tool Calling模式共享上下文

**显式传递上下文对象**：Supervisor 在调用工具 Agent 时，将当前会话的上下文（如对话历史、用户 ID、会话状态）打包成一个参数传递给工具 Agent。

**只传递必要片段**：为避免上下文过长，Supervisor 通常会裁剪上下文，只传递与当前工具调用相关的部分（例如只传递最近几轮对话或关键信息）。

**共享外部存储**：所有 Agent 共享同一个外部存储（如 Redis、数据库），通过会话 ID 访问统一的会话状态。Supervisor 只需传递会话 ID，工具 Agent 从存储中读取所需上下文。

**结果回写**：工具 Agent 返回的结果会由 Supervisor 合并到全局上下文中，作为后续调用的输入。

#### Handoffs模式共享上下文

**传递完整会话状态**：Handoff 发生时，当前 Agent 需要将完整的会话上下文（包括历史消息、用户偏好、中间结论）传递给下一个 Agent。

**采用“交接对象”模式**：设计一个 HandoffContext 对象，包含会话 ID、历史消息列表、用户元数据、以及需要延续的临时状态。交接时将此对象序列化后传递给新 Agent。

**外部存储统一会话**：同样可以使用共享存储。每个 Agent 在启动时通过会话 ID 加载最新状态，并在每次交互后更新存储。Handoff 只是改变“当前活跃 Agent”的标识，不重新传递数据。

**保留原始对话链**：所有消息（包括用户与不同 Agent 的交互）都追加到同一条会话链中，新 Agent 通过查看完整消息流来理解上下文。

### 三个智能体通信协议

| 维度     | MCP                           | A2A                    | ANP                        |
| -------- | ----------------------------- | ---------------------- | -------------------------- |
| 设计目标 | 智能体与工具/资源的标准化通信 | 智能体间的点对点通信   | 大规模智能体网络的服务发现 |
| 通信模式 | 客户端-服务器 (C/S)           | 对等网络 (P2P)         | 对等网络 (P2P)             |
| 核心理念 | 上下文共享                    | 对等协作               | 去中心化发现               |
| 适用场景 | 访问外部工具和数据源          | 智能体协作和任务委托   | 大规模智能体生态系统       |
| 扩展性   | 通过添加MCP服务器扩展         | 通过添加智能体节点扩展 | 支持动态扩展               |
| 实现状态 | 已有成熟实现 (FastMCP)        | 官方SDK可用            | 概念性框架                 |

### A2A

A2A 现有实现大部分为 `Sample Code`，并且即使有 Python 的实现也较为繁琐

## 如何设计一款Vibe Coding工具

![VibeCoding系统交互图.webp](https://hanphone.top/gh/HanphoneJan/public-pictures/learn/VibeCoding%E7%B3%BB%E7%BB%9F%E4%BA%A4%E4%BA%92%E5%9B%BE.webp)

## Agent应用分析

### ChatGPT

#### 对齐与约束

#### 弱记忆弱状态

### Claude Code

Claude Code 是 Anthropic 推出的官方 CLI 工具，代表了当前 AI 辅助编程工具的工程化巅峰。以下基于对其源代码的深入分析，总结其架构设计与核心范式。

#### 整体架构

```
┌─────────────────────────────────────────────────────────────────┐
│                        Claude Code 架构                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐      │
│  │   Command    │    │     Tool     │    │   Skill      │      │
│  │   系统       │◄──►│    系统      │◄──►│   系统       │      │
│  │  (用户指令)   │    │ (LLM调用)    │    │ (工作流封装)  │      │
│  └──────┬───────┘    └──────┬───────┘    └──────┬───────┘      │
│         │                   │                   │              │
│         └───────────────────┼───────────────────┘              │
│                             ▼                                  │
│                   ┌──────────────────┐                         │
│                   │   QueryEngine    │                         │
│                   │   (LLM 引擎)      │                         │
│                   └──────────────────┘                         │
│                             │                                  │
│                             ▼                                  │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐      │
│  │  Permission  │    │   Bridge     │    │     MCP      │      │
│  │   系统       │    │  (远程控制)   │    │  (外部工具)   │      │
│  └──────────────┘    └──────────────┘    └──────────────┘      │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

#### 核心设计范式

**1. 三层架构设计（Command/Tool/Skill）**

| 层级              | 触发方式              | 执行方式   | 使用场景     |
| ----------------- | --------------------- | ---------- | ------------ |
| **Command** | 用户输入 `/command` | 立即执行   | 用户明确意图 |
| **Tool**    | LLM 通过 XML 调用     | 按需执行   | AI 自主决策  |
| **Skill**   | 两者皆可              | 工作流封装 | 复用常用模式 |

这种设计实现了**用户控制与 AI 自主性的平衡**：用户可通过 `/` 命令主动触发工作流，AI 可自主决定使用哪些工具，Skill 提供可复用的工作流封装。

**2. 分层权限模型（Layered Permission）**

```
┌─────────────────────────────────────────────────────────────┐
│                    权限决策层次                              │
├─────────────────────────────────────────────────────────────┤
│  Layer 1: 规则检查 (Rules)                                   │
│    ├── deny 规则 → 立即拒绝                                  │
│    └── ask 规则 → 需要确认                                   │
│  Layer 2: 模式检查 (Mode)                                    │
│    ├── bypassPermissions → 绕过权限                          │
│    ├── acceptEdits → 自动接受编辑                            │
│    ├── auto → AI 分类器决策                                  │
│    └── plan → 计划模式                                       │
│  Layer 3: 工具自定义检查                                     │
│    └── tool.checkPermissions()                               │
│  Layer 4: 用户确认                                           │
│    └── 交互式权限对话框                                      │
└─────────────────────────────────────────────────────────────┘
```

六种权限模式：default（默认）、plan（计划模式）、acceptEdits（自动接受编辑）、bypassPermissions（绕过权限）、dontAsk（自动拒绝）、auto（AI 分类器自动决策）。

**3. Plan Mode（计划模式）**

Plan Mode 是**对齐优先**设计理念的体现：

```
用户输入需求 → 进入 Plan Mode（只读探索）→ AI 探索代码库 → 设计方案 → 呈现计划 → 用户批准 → 退出 Plan Mode → 执行代码修改
```

核心原则：**对齐优先**（开始编码前获得用户认可）、**只读保证**（Plan Mode 期间只允许探索）、**结构化工作流**（探索→设计→呈现→批准→实施）。

**4. 子 Agent 系统（Sub-agent Architecture）**

三种执行模式：

| 模式                 | 特点                        | 适用场景           |
| -------------------- | --------------------------- | ------------------ |
| **前台 Agent** | 阻塞主会话，实时显示进度    | 快速查询、简单任务 |
| **后台 Agent** | 非阻塞，通过通知报告完成    | 长时间运行任务     |
| **Fork Agent** | 隔离上下文，独立 token 预算 | 复杂、自包含的任务 |

**Coordinator 模式**（多 Agent 协调）：Coordinator 指导 Workers 进行研究、实现、验证，Workers 自主执行任务并通过 SendMessage 接收指令。工作流阶段：Research → Synthesis → Implementation → Verification。

Agent 间通信机制：内存邮箱（进程内）、文件邮箱（跨进程）、SendMessage 工具（显式消息）、结构化协议（类型安全）。

**5. 上下文管理（Context Management）**

采用**即时（Just-in-Time, JIT）上下文**策略：维护轻量化引用（文件路径、笔记），运行时通过 FileReadTool、GlobTool、GrepTool 按需加载。

**ContextBuilder 设计**（GSSC 流水线）：Gather（汇集多源输入）→ Select（基于相关性和新近性选择）→ Structure（分区结构化）→ Compress（超限时压缩）。

**NoteTool** - 结构化外部记忆：Markdown + YAML 格式，适合机器解析和人类阅读，支持 Git 版本控制。

**6. Hook 系统（事件驱动扩展）**

支持 25 种事件点：PreToolUse、PostToolUse、SessionStart、UserPromptSubmit、Stop、PreCompact 等。Hook 类型：command（Shell 命令）、prompt（LLM 提示词）、http（HTTP 请求）、agent（Agent 验证）。

**7. Bridge 系统（远程控制）**

实现本地执行 + Web UI 的完美结合：本地 CLI ←→ Bridge Transport ←→ Claude.ai Web。特性：跨平台会话连续性、权限回调（Web 界面批准，本地执行）、实时双向消息流、Token 自动刷新。

**8. MCP 集成（标准化工具接入）**

Model Context Protocol (MCP) 实现工具生态的标准化接入：MCP Server → MCP Client → Tool 自动展开（如 `mcp__github__create_issue`）。

**9. 工程化最佳实践**

| 实践          | 实现                                          | 效果           |
| ------------- | --------------------------------------------- | -------------- |
| 并行预取      | 启动时并行加载 MDM 设置、Keychain、API 预连接 | ~65ms 节省     |
| 延迟加载      | OpenTelemetry、gRPC 等大模块按需加载          | ~1100KB 节省   |
| 条件编译      | 使用 Bun 特性标志进行死代码消除               | 根据功能裁剪   |
| 懒加载 Schema | Tool Schema 使用 `lazySchema` 避免循环依赖  | 减少启动时间   |
| 智能缓存      | 文件读取状态、提示词前缀、向量检索结果缓存    | 提升响应速度   |
| 并发控制      | 只读工具并行执行，写入工具串行执行            | 安全与效率平衡 |

#### Agent 代理类型

Claude Code 内置多种专业化 Agent：

| Agent 类型                | 特点                                    | 用途           |
| ------------------------- | --------------------------------------- | -------------- |
| **general-purpose** | 标准 CLI 介绍，所有工具                 | 通用任务       |
| **Explore**         | 只读模式，禁止文件修改，使用 Haiku 模型 | 代码库探索     |
| **verification**    | 后台运行，对抗性测试                    | 验证实现正确性 |
| **worker**          | Coordinator 模式专用，自主执行          | 执行具体任务   |

**Agent 定义格式**（Markdown + YAML）：

```yaml
---
agentType: 'Explore'
whenToUse: 'Fast agent specialized for exploring codebases'
disallowedTools: ['FileEdit', 'FileWrite', 'Agent']
model: 'haiku'
omitClaudeMd: true
---
```

#### Agent代理

[Agent System Overview | Claude AI Dev](https://claudeai.dev/docs/mechanics/agents/overview/)
            + 权限治理




#### Agent代理

[Agent System Overview | Claude AI Dev](https://claudeai.dev/docs/mechanics/agents/overview/)

### Cursor

### OpenClaw

[OpenClaw - OpenClaw](https://docs.openclaw.ai/)

#### 主动执行

心跳自主循环

#### 记忆机制

#### 接口设计

#### 安全防护
