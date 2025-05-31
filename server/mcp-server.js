import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import electronPath from 'electron';
import JSONParse from './json-parse.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Launch the Electron feedback UI
 * @param {string} projectDirectory - The project directory path
 * @param {string} prompt - The combined summary and question for feedback
 * @param {string[]} quickFeedbackOptions - Optional array of quick feedback options
 * @returns {Promise<Object>} - The feedback result
 */
function launchFeedbackUI(projectDirectory, prompt, quickFeedbackOptions = []) {
  return new Promise((resolve, reject) => {
    const entryPoint = path.join(__dirname, '..', 'main.mjs');

    console.error('⏵ spawning Electron →', electronPath, projectDirectory, prompt);

    const env = { ...process.env };
    delete env.ELECTRON_RUN_AS_NODE;

    // spawn Electron, not node
    const electronArgs = [
      entryPoint,
      '--project-directory', projectDirectory,
      '--prompt', prompt
    ];

    if (quickFeedbackOptions && quickFeedbackOptions.length > 0) {
      electronArgs.push('--quick-feedback-options', JSON.stringify(quickFeedbackOptions));
    }

    const electronApp = spawn(
      electronPath,
      electronArgs,
      {
        cwd: path.join(__dirname, '..'),
        stdio: ['pipe', 'pipe', 'pipe'],
        env: {
          ...process.env,
          ELECTRON_RUN_AS_NODE: undefined
        }
      }
    );

    let outputData = '';
    let errorData = '';

    // Collect stdout data
    electronApp.stdout.on('data', (data) => {
      outputData += data.toString();
    });

    // Collect stderr for debugging
    electronApp.stderr.on('data', (data) => {
      errorData += data.toString();
      console.error('Electron stderr:', data.toString());
    });

    // Handle process events
    electronApp.on('error', (error) => {
      reject(new Error(`Failed to start Electron app: ${error.message}`));
    });

    electronApp.on('close', (code) => {
      // Parse output data
      if (outputData.trim()) {
        try {
          // First, try to parse the entire output as a single JSON using the robust parser
          try {
            const result = JSONParse(outputData.trim());
            console.log('Successfully parsed output as single JSON');
            resolve(result);
            return;
          } catch (singleJsonError) {
            console.error('Failed to parse as single JSON:', singleJsonError.message);
          }

          // Handle multiple JSON objects concatenated together
          // This approach splits the input at potential JSON boundaries
          const jsonObjects = splitJsonObjects(outputData);
          
          for (const jsonStr of jsonObjects) {
            try {
              const result = JSONParse(jsonStr);
              if (result && (result.feedback !== undefined || result.cancelled)) {
                console.log('Successfully parsed JSON object with feedback property');
                resolve(result);
                return;
              }
            } catch (err) {
              // Continue to next potential JSON object
            }
          }
          
          // If we couldn't parse any JSON objects, try to extract raw content
          // This is a more aggressive approach to handle malformed JSON
          const extractedContent = extractRawFeedback(outputData);
          
          if (extractedContent) {
            const result = {
              feedback: extractedContent,
              timestamp: new Date().toISOString(),
              projectDirectory
            };
            console.warn('Using raw content extraction approach');
            resolve(result);
            return;
          }
          
          // If all else fails, create a safe result with the raw output
          // This ensures we always return something useful
          console.warn('Using safe fallback approach');
          resolve({
            feedback: sanitizeOutput(outputData),
            timestamp: new Date().toISOString(),
            projectDirectory
          });
        } catch (error) {
          console.error('Failed to parse feedback result:', error);
          console.error('Raw output:', outputData);
          
          // Even if all parsing attempts fail, return something useful
          // rather than rejecting the promise
          resolve({
            feedback: sanitizeOutput(outputData),
            error: error.message,
            timestamp: new Date().toISOString(),
            projectDirectory
          });
        }
      } else {
        // If no output data, assume user cancelled
        resolve({
          feedback: '',
          cancelled: true,
          timestamp: new Date().toISOString(),
          projectDirectory
        });
      }
    });
  });
}

// Helper function to split concatenated JSON objects
function splitJsonObjects(input) {
  const result = [];
  let braceCount = 0;
  let currentObj = '';
  
  for (let i = 0; i < input.length; i++) {
    const char = input[i];
    currentObj += char;
    
    if (char === '{') {
      braceCount++;
    } else if (char === '}') {
      braceCount--;
      if (braceCount === 0) {
        result.push(currentObj);
        currentObj = '';
      }
    }
  }
  
  return result;
}

// Helper function to extract raw feedback content from malformed JSON
function extractRawFeedback(input) {
  // Try to extract content between feedback property and the next property
  const feedbackMatch = input.match(/"feedback"\s*:\s*([^,}]*)/m);
  if (feedbackMatch && feedbackMatch[1]) {
    let content = feedbackMatch[1].trim();
    // Remove surrounding quotes if present
    if (content.startsWith('"') && content.endsWith('"')) {
      content = content.substring(1, content.length - 1);
    }
    return content;
  }
  
  // Try to extract content between triple backticks if present
  if (input.includes('```')) {
    const codeBlockStart = input.indexOf('```');
    const codeBlockEnd = input.lastIndexOf('```');
    
    if (codeBlockStart !== -1 && codeBlockEnd !== -1 && codeBlockEnd > codeBlockStart) {
      return input.substring(codeBlockStart, codeBlockEnd + 3);
    }
  }
  
  return null;
}

// Helper function to sanitize output for safe return
function sanitizeOutput(input) {
  // Limit the length to prevent extremely large outputs
  const maxLength = 10000;
  let sanitized = input;
  
  if (sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength) + '... (truncated)';
  }
  
  // Escape any characters that might cause issues
  sanitized = sanitized
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, '\r')
    .replace(/\\t/g, '\t')
    .replace(/\\'/g, "'")
    .replace(/\\"/g, '"');
  
  return sanitized;
}

// MCP Server implementation
const server = {
  name: 'feedback-loop',
  version: '1.0.0',
  
  tools: [
    {
      name: 'feedback_loop',
      description: 'Request feedback loop for a given project directory and summary',
      inputSchema: {
        type: 'object',
        properties: {
          project_directory: {
            type: 'string',
            description: 'Full path to the project directory'
          },
          summary: {
            type: 'string',
            description: 'Short, one-line summary of the changes'
          },
          quickFeedbackOptions: {
            type: 'array',
            items: { type: 'string' },
            description: 'Optional array of predefined feedback strings (2-5 options recommended).'
          }
        },
        required: ['project_directory', 'summary']
      }
    }
  ],
  
  async callTool(name, args) {
    if (name === 'feedback_loop') {
      try {
        // log node version in json format
        console.error(JSON.stringify({
          node_version: process.version,
          node_platform: process.platform,
          node_arch: process.arch,
        }))
        const result = await launchFeedbackUI(args.project_directory, args.summary, args.quickFeedbackOptions);
        
        if (result.cancelled) {
          return {
            content: [{
              type: 'text',
              text: JSON.stringify({
                status: 'cancelled',
                message: 'Feedback collection was cancelled by the user.',
              }, null, 2)
            }]
          };
        }
        
        const feedbackData = {
          status: 'success',
          feedback: result.feedback || '',
          projectDirectory: result.projectDirectory || args.project_directory
        };
        
        return {
          content: [{
            type: 'text',
            text: JSON.stringify(feedbackData, null, 2)
          }]
        };
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              status: 'error',
              message: `Error launching feedback UI: ${error.message}`,
              timestamp: new Date().toISOString()
            }, null, 2)
          }]
        };
      }
    }
    
    throw new Error(`Unknown tool: ${name}`);
  }
};

// Export for use as a module
export {
  launchFeedbackUI,
  server
};

// If run directly, start the MCP server
if (import.meta.url === `file://${process.argv[1]}`) {
  const { Server } = await import('@modelcontextprotocol/sdk/server/index.js');
  const { StdioServerTransport } = await import('@modelcontextprotocol/sdk/server/stdio.js');
  const { ListToolsRequestSchema, CallToolRequestSchema, McpError, ErrorCode } = await import('@modelcontextprotocol/sdk/types.js');
  
  const mcpServer = new Server(
    {
      name: 'feedback-loop-mcp-server',
      version: '1.0.0',
      description: 'MCP Server for collecting user feedback via Electron UI'
    },
    {
      capabilities: {
        tools: {}
      }
    }
  );

  async function main() {
     // Keep the process alive from the start
     process.stdin.resume();

    // Register the feedback_loop tool
    mcpServer.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: 'feedback_loop',
            description: 'Request feedback loop for a given project directory and summary',
            inputSchema: {
              type: 'object',
              properties: {
                project_directory: {
                  type: 'string',
                  description: 'Full path to the project directory'
                },
                prompt: {
                  type: 'string',
                  description: 'Combined summary and question, describing what was done and asking for specific feedback'
                },
                quickFeedbackOptions: {
                  type: 'array',
                  items: {
                    type: 'string'
                  },
                  description: 'Optional array of predefined feedback strings to present as clickable options'
                }
              },
              required: ['project_directory', 'prompt']
            },
          },
        ],
      };
    });

    mcpServer.setRequestHandler(CallToolRequestSchema, async (request) => {
      if (request.params.name === 'feedback_loop') {
        const { project_directory, prompt, quickFeedbackOptions } = request.params.arguments;
        try {
          const result = await launchFeedbackUI(project_directory, prompt, quickFeedbackOptions);
          
          if (result.cancelled) {
            return {
              content: [{
                type: 'text',
                text: JSON.stringify({
                  status: 'cancelled',
                  message: 'Feedback collection was cancelled by the user.'
                }, null, 2)
              }]
            };
          }
          
          const feedbackData = {
            status: 'success',
            feedback: result.feedback || '',
            projectDirectory: result.projectDirectory || project_directory
          };
          
          return {
            content: [{
              type: 'text',
              text: JSON.stringify(feedbackData, null, 2)
            }]
          };
        } catch (error) {
          return {
            content: [{
              type: 'text',
              text: JSON.stringify({
                status: 'error',
                message: `Error launching feedback UI: ${error.message}`
              }, null, 2)
            }]
          };
        }
      } else {
        throw new McpError(
          ErrorCode.MethodNotFound,
          `Unknown tool: ${request.params.name}`
        );
      }
    });

    const transport = new StdioServerTransport();
    
    try {
       await mcpServer.connect(transport);
       
       // Keep the server running indefinitely
       await new Promise(() => {});
     } catch (error) {
      console.error('Failed to connect to transport:', error);
       throw error;
     }
   }
   
   main().catch((error) => {
     console.error('Failed to start MCP server:', error);
     process.exit(1);
   });
}
  