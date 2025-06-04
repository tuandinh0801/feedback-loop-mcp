// Test file for markdown rendering feature
// This file demonstrates various markdown content scenarios

const testCases = [
  {
    name: "Basic Markdown",
    content: `# Welcome to Feedback Loop
This is a **bold** statement and this is *italic*.

## Features
- Item 1
- Item 2
- Item 3

### Code Example
Here's some \`inline code\` and a code block:

\`\`\`javascript
function hello() {
  console.log("Hello World!");
}
\`\`\`
`
  },
  {
    name: "Long Content with Overflow",
    content: `# Very Long Content Test

${Array(20).fill(0).map((_, i) => `
## Section ${i + 1}
This is paragraph ${i + 1} with some content to test scrolling behavior.
- List item A
- List item B
- List item C
`).join('\n')}
`
  },
  {
    name: "Complex Markdown",
    content: `# Complete Markdown Test

## Headers
### H3 Header
#### H4 Header
##### H5 Header
###### H6 Header

## Text Formatting
**Bold text**, *italic text*, ***bold and italic***, ~~strikethrough~~

## Lists
### Unordered List
- First item
  - Nested item 1
  - Nested item 2
- Second item
- Third item

### Ordered List
1. First step
2. Second step
   1. Sub-step A
   2. Sub-step B
3. Third step

## Links and Images
[Visit GitHub](https://github.com)

## Blockquotes
> This is a blockquote
> with multiple lines
>> And nested quotes

## Code
Inline \`code\` and blocks:

\`\`\`python
def factorial(n):
    if n <= 1:
        return 1
    return n * factorial(n - 1)
\`\`\`

## Tables
| Header 1 | Header 2 | Header 3 |
|----------|----------|----------|
| Cell 1   | Cell 2   | Cell 3   |
| Cell 4   | Cell 5   | Cell 6   |

## Horizontal Rule
---

## Mixed Content
This paragraph contains **bold**, *italic*, and \`code\` mixed together.
It also has a [link](https://example.com) and continues with more text.
`
  },
  {
    name: "Malformed Markdown (Should Degrade Gracefully)",
    content: `# Test <script>alert('XSS')</script>

This has some <img src=x onerror=alert('XSS')> malicious content.

**Unclosed bold
*Unclosed italic

\`\`\`
Unclosed code block
`
  },
  {
    name: "Edge Case - Empty Content",
    content: ""
  },
  {
    name: "Edge Case - Plain Text",
    content: "This is just plain text without any markdown formatting."
  }
];

// Export for use in testing
if (typeof module !== 'undefined' && module.exports) {
  module.exports = testCases;
}