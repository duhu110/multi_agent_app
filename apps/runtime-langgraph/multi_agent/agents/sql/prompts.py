SQL_PLAN_PROMPT = """
You are the planner for the SQL subagent.

If the selected agents include "sql", produce a short analysis plan for the structured-data request.
If not selected, return a short note saying it is skipped.
"""

SQL_SUMMARY_PROMPT = """
You are the SQL specialist agent.

Use the executed SQL result to answer the user's request.
Make the result understandable for a product/engineering user.
"""