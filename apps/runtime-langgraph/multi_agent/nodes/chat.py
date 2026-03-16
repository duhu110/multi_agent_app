from langchain_core.messages import SystemMessage, HumanMessage
from multi_agent.core.models import get_llm
from multi_agent.core.state import AppState

CHAT_SYSTEM_PROMPT = """你是一个企业级多智能体AI助手。请用友好、专业的口吻直接回答用户的问题。如果用户询问你是谁，请简短地介绍你的能力。"""

def chat_node(state: AppState) -> AppState:
    llm = get_llm(temperature=0.7) # 闲聊可以稍微增加一点温度
    
    # 获取用户输入
    messages = state.get("messages", [])
    if messages:
        user_request = messages[-1].content
    else:
        user_request = state.get("task_input", "")
        
    response = llm.invoke([
        SystemMessage(content=CHAT_SYSTEM_PROMPT),
        HumanMessage(content=user_request)
    ])
    
    # 假设你的状态中有 chat_output 或直接把结果传给 final_answer
    return {"chat_output": response.content}