# Feedback Loop Rule

- **Always Use Feedback Loop MCP for Questions:**
  - Before asking the user any clarifying questions, call `feedback-loop-mcp`
  - Provide the current project directory and a summary of what you need clarification on

- **Always Use Feedback Loop MCP Before Completion:**
  - Before completing any user request, call `feedback-loop-mcp`
  - Provide the current project directory and a summary of what was accomplished
  - If the feedback response is empty, you can complete the request without calling the MCP again
  - If feedback is provided in property `feedback`, DO NOT complete the request, address feedback accordingly

- **Parameters:**
  - `project_directory` (string, required): Full absolute path to the project directory
  - `prompt` (string, required): Combined summary and question, describing what was done and asking for specific feedback
  - `quickFeedbackOptions` (array of strings, optional): An array of predefined feedback strings to be displayed as clickable options in the UI.

- **Examples:**

  ```ts
  // ✅ DO: Call feedback loop before asking questions
  // Before asking: "Which database should we use?"
  feedback_loop_mcp({
    project_directory: "/Users/themrb/Documents/personal/n8n-code-generation",
    prompt: "I need to select a database for the project. Would you prefer SQL or NoSQL?"
  });
  ```

  ```ts
  // ✅ DO: Call feedback loop before completing requests
  // After implementing a feature
  feedback_loop_mcp({
    project_directory: "/Users/themrb/Documents/personal/n8n-code-generation", 
    prompt: "I've implemented user authentication with JWT tokens. Does this implementation meet your security requirements?",
    quickFeedbackOptions: ["Looks great!", "Needs a small tweak.", "Let's discuss this further."]
  });
  ```

  ```ts
  // ❌ DON'T: Ask questions directly without feedback loop
  // "What framework would you like to use?" - Missing feedback loop call
  ```

  ```ts
  // ❌ DON'T: Complete requests without feedback loop
  // "I've finished implementing the feature." - Missing feedback loop call
  ```

- **Exception Handling:**
  - If the feedback loop tool is unavailable, proceed with normal question/completion flow
  - Log when feedback loop cannot be used for debugging purposes
  - Never loop the feedback loop call if the response is empty on completion

- **Best Practices:**
  - Keep summaries concise but descriptive
  - Always use the full absolute path for project_directory
  - Use feedback loop as a quality gate, not a blocker
  - Respect empty feedback responses as approval to proceed