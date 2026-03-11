from langchain_core.messages import HumanMessage

from multi_agent.agent import agent


def test_graph_smoke():
    result = agent.invoke(
        {
            "user_id": "u1",
            "thread_id": "t1",
            "messages": [
                HumanMessage(content="请结合知识库和SQL说明企业多agent系统的推荐结构")
            ],
        },
        config={"configurable": {"thread_id": "t1"}},
    )

    assert "final_answer" in result
    assert isinstance(result["final_answer"], str)
    assert len(result["final_answer"]) > 0
