import React, { useMemo } from 'react';
import katex from 'katex';

interface LatexMathProps {
  math: string;
  block?: boolean;
  className?: string;
}

export const LatexMath: React.FC<LatexMathProps> = ({ math, block = false, className = '' }) => {
  const html = useMemo(() => {
    if (!math) return '';
    try {
      return katex.renderToString(math.trim(), {
        displayMode: block,
        throwOnError: false,
        output: 'htmlAndMathml',
      });
    } catch (e: any) {
      console.warn('KaTeX rendering error:', e);
      return `<span class="text-rose-400 font-mono text-xs">${math}</span>`;
    }
  }, [math, block]);

  if (block) {
    return (
      <div 
        className={`my-3 overflow-x-auto py-2 px-3 rounded-lg bg-neutral-900/60 border border-neutral-800/80 text-center ${className}`}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    );
  }

  return (
    <span 
      className={`inline-block mx-1 ${className}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
};

// Parser to turn markdown-like text containing $...$ or $$...$$ into rendered LaTeX nodes
export const renderLatexInText = (text: string): React.ReactNode => {
  if (!text) return text;

  // Split by $$...$$ (block math) and $...$ (inline math)
  const tokens: React.ReactNode[] = [];
  const regex = /(\$\$[\s\S]*?\$\$|\$[^\$\n]+?\$)/g;

  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      tokens.push(text.substring(lastIndex, match.index));
    }

    const raw = match[0];
    if (raw.startsWith('$$') && raw.endsWith('$$')) {
      const formula = raw.slice(2, -2);
      tokens.push(<LatexMath key={match.index} math={formula} block={true} />);
    } else if (raw.startsWith('$') && raw.endsWith('$')) {
      const formula = raw.slice(1, -1);
      tokens.push(<LatexMath key={match.index} math={formula} block={false} />);
    }

    lastIndex = regex.lastIndex;
  }

  if (lastIndex < text.length) {
    tokens.push(text.substring(lastIndex));
  }

  return tokens.length > 0 ? tokens : text;
};
