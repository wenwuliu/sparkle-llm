import React from 'react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize from 'rehype-sanitize';
import { Table, Image } from 'antd';

interface MarkdownContentProps {
  content: string;
}

const MarkdownContent: React.FC<MarkdownContentProps> = ({ content }) => {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      rehypePlugins={[rehypeRaw, rehypeSanitize]}
      components={{
        // 代码块高亮
        code({ node, inline, className, children, ...props }: any) {
          const match = /language-(\w+)/.exec(className || '');
          return !inline && match ? (
            <SyntaxHighlighter
              style={vscDarkPlus}
              language={match[1]}
              PreTag="div"
              {...props}
            >
              {String(children).replace(/\n$/, '')}
            </SyntaxHighlighter>
          ) : (
            <code className={className} {...props}>
              {children}
            </code>
          );
        },
        // 表格样式优化
        table({ node }: any) {
          // 从子元素中提取表头和表体数据
          const tableData: any[] = [];
          const columns: any[] = [];

          if (node && node.children) {
            // 处理表头
            const thead = node.children.find((child: any) => child.tagName === 'thead');
            if (thead && thead.children && thead.children.length > 0) {
              const headerRow = thead.children[0];
              if (headerRow.children) {
                headerRow.children.forEach((th: any, index: number) => {
                  if (th.children && th.children.length > 0) {
                    columns.push({
                      title: th.children[0].value,
                      dataIndex: `col${index}`,
                      key: `col${index}`,
                    });
                  }
                });
              }
            }

            // 处理表体
            const tbody = node.children.find((child: any) => child.tagName === 'tbody');
            if (tbody && tbody.children) {
              tbody.children.forEach((tr: any, rowIndex: number) => {
                const rowData: any = { key: rowIndex };
                if (tr.children) {
                  tr.children.forEach((td: any, colIndex: number) => {
                    if (td.children && td.children.length > 0) {
                      // 递归提取所有子节点的文本内容
                      const extractTextContent = (node: any): string => {
                        if (!node) return '';

                        // 如果节点有value属性，直接返回
                        if (node.value) return node.value;

                        // 如果节点有children，递归处理所有子节点
                        if (node.children && node.children.length > 0) {
                          return node.children.map(extractTextContent).join('');
                        }

                        return '';
                      };

                      // 提取单元格中所有内容
                      rowData[`col${colIndex}`] = td.children.map(extractTextContent).join('');
                    } else {
                      rowData[`col${colIndex}`] = '';
                    }
                  });
                }
                tableData.push(rowData);
              });
            }
          }

          return (
            <Table
              dataSource={tableData}
              columns={columns}
              pagination={false}
              size="small"
              bordered
              style={{ marginBottom: '16px' }}
            />
          );
        },
        // 其他元素样式优化
        h1: ({ node, ...props }: any) => <h1 style={{ borderBottom: '1px solid #eaecef', paddingBottom: '0.3em' }} {...props} />,
        h2: ({ node, ...props }: any) => <h2 style={{ borderBottom: '1px solid #eaecef', paddingBottom: '0.3em' }} {...props} />,
        h3: ({ node, ...props }: any) => <h3 style={{ paddingBottom: '0.3em' }} {...props} />,
        a: ({ node, ...props }: any) => <a style={{ color: '#1890ff' }} target="_blank" rel="noopener noreferrer" {...props} />,
        blockquote: ({ node, ...props }: any) => (
          <blockquote
            style={{
              borderLeft: '4px solid #dfe2e5',
              paddingLeft: '1em',
              color: '#6a737d',
              margin: '1em 0',
            }}
            {...props}
          />
        ),
        img: ({ node, ...props }: any) => (
          <Image
            style={{
              maxWidth: '100%',
              margin: '0.5em 0',
              height: 'auto', // 改为自适应高度
              maxHeight: '200px', // 设置最大高度
              objectFit: 'contain' // 保持图片比例
            }}
            {...props}
            alt={props.alt || 'image'}
            preview={{
              mask: '点击查看大图',
              maskClassName: 'image-preview-mask'
            }}
            loading="lazy" // 添加懒加载
            placeholder={
              <div style={{
                background: '#f0f0f0',
                height: '100px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <span>加载中...</span>
              </div>
            }
          />
        ),
      }}
    >
      {content}
    </ReactMarkdown>
  );
};

export default MarkdownContent;
