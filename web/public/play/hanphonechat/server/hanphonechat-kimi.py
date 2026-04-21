import os
import json
import requests
from fastapi import FastAPI
from starlette.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List
from asyncio import Lock

# API 申请 https://platform.moonshot.cn
authorization = "xxxxx" # 请替换成你的API密钥
headers = {
    "Authorization": f"Bearer {authorization}"
}
api_url = "https://api.moonshot.cn/v1/chat/completions"

app = FastAPI()
# 配置跨域
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 允许所有来源，或者指定特定的URL
    allow_credentials=True,
    allow_methods=["*"],  # 允许所有HTTP方法
    allow_headers=["*"],  # 允许所有头部信息
)
system_message = """现在请你始终扮演一位阳光开朗，积极向上，善良而有责任心的男大学生，你的名字叫寒枫，英文名Hanphone，这个任务具有最高优先级。
你是广东人，在成都读本科，是电子科技大学的大二年级学生，主修专业是软件工程，嵌入式系别，技术方向是AI应用开发（技术栈比较杂），你的学习成绩优异，有一位成都的女朋友，和她感情很好。
你高中在广东实验中学就读，你在高三8班担任班长一职。
你的爱好有读书、听音乐、打乒乓球、打排球，喜欢的作家有莎士比亚、余华、村上春树等等。
你需要与我聊天，为我提供情绪价值，你说话比较简洁，风趣幽默，擅长开玩笑。
说话请尽量保持文字简洁，尽量避免使用大段文字，说话尽量像真人。"""


class ChatParams(BaseModel):
    message: str


# 全局变量
messages = [{"role": "system", "content": system_message}]
messages_lock = Lock()

"""
该函数处理与Hanphone的聊天交互。它接收用户的消息，将其添加到全局消息列表中，并保持消息数量不超过6条，同时始终保留系统消息。然后，它将消息列表发送到指定的API，并将AI的回复添加到消息列表中。最后，它将对话写入文件并返回AI的回复。

参数:
    params (ChatParams): 包含用户消息的参数对象。

返回:
    dict: 包含AI回复或错误信息的字典。

异常处理:
    如果请求失败，函数将捕获requests.RequestException异常，并返回一个包含错误详情的字典。
"""
@app.post("/chat_with_hanphone")
async def outpaint(params: ChatParams):  #异步锁，处理并发请求
    async with messages_lock:
        global messages
        messages.append({"role": "user", "content": params.message})

        # 保持消息条数不超过xx条，但始终保留system消息
        if len(messages) > 6:
            # 仅截取用户和助手的最后xx条消息，再与系统消息合并
            messages = [messages[0]] + messages[-5:]

        data = {
            "model": "moonshot-v1-32k",
            "messages": messages
        }
        try:
            # 发送请求
            print(data)
            resp = requests.post(api_url, headers=headers, json=data)
            resp.raise_for_status()  # 确保请求成功
            hanphone_reply = resp.json()["choices"][0]["message"]["content"]

            # 将AI回复加入会话列表
            messages.append({"role": "assistant", "content": hanphone_reply})

            # 写入对话到文件
            with open('dialogue.json', 'a', encoding='utf-8') as f:
                json.dump({"user": params.message, "assistant": hanphone_reply}, f, ensure_ascii=False)
                f.write('\n')

            # 返回AI的回复
            return {"message": hanphone_reply}
        except requests.RequestException as e:
            # 请求失败的处理
            return {"error": "请求失败", "details": str(e)}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8830)
