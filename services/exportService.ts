import { jsPDF } from 'jspdf';
import JSZip from 'jszip';
import { Message, ChatSession } from '../types';

export interface ExportChatOptions {
  includeTimestamps?: boolean;
  includeSystemInfo?: boolean;
  includeCodeBlocks?: boolean;
}

/**
 * Builds clean Markdown text for a chat session.
 */
export const generateChatMarkdownString = (
  session: { title: string; messages: Message[]; updatedAt?: number },
  modelName: string = 'Gemini'
): string => {
  const dateStr = new Date(session.updatedAt || Date.now()).toLocaleString();

  let md = `# ${session.title || 'Chat Conversation'}\n\n`;
  md += `> **Exported:** ${dateStr}  \n`;
  md += `> **Model:** ${modelName}  \n`;
  md += `> **Total Messages:** ${session.messages.length}  \n\n`;
  md += `---\n\n`;

  session.messages.forEach((msg) => {
    const roleLabel = msg.role === 'user' ? 'User' : msg.role === 'model' ? `Assistant (${modelName})` : 'System';
    const time = new Date(msg.timestamp).toLocaleTimeString();
    
    md += `### ${roleLabel} \`${time}\`\n\n`;
    
    // Display attachment info if any
    if (msg.attachment) {
      md += `*Attachment: [${msg.attachment.mimeType}]*\n\n`;
    }

    // Display archive attachment info if any
    if (msg.archiveAttachment) {
      md += `*Archive: [${msg.archiveAttachment.name} - ${msg.archiveAttachment.format.toUpperCase()} (${msg.archiveAttachment.totalFiles} files, ${(msg.archiveAttachment.totalSize / 1024).toFixed(1)} KB)]*\n`;
      if (msg.archiveAttachment.files.length > 0) {
        md += `  - Included files: ${msg.archiveAttachment.files.slice(0, 5).map(f => f.name).join(', ')}${msg.archiveAttachment.files.length > 5 ? '...' : ''}\n\n`;
      }
    }

    // Display generated image if any
    if (msg.generatedImage) {
      md += `*Generated Image Prompt: "${msg.generatedImage.prompt}"*\n\n`;
    }

    // Main content
    const content = (msg.versions && msg.currentVersionIndex !== undefined)
      ? msg.versions[msg.currentVersionIndex]
      : msg.content;
      
    md += `${content.trim()}\n\n`;

    // Grounding sources if any
    if (msg.groundingMetadata?.webSources && msg.groundingMetadata.webSources.length > 0) {
      md += `**Sources:**\n`;
      msg.groundingMetadata.webSources.forEach((src) => {
        md += `- [${src.title || src.domain || 'Source'}](${src.uri})\n`;
      });
      md += `\n`;
    }

    md += `---\n\n`;
  });

  return md;
};

/**
 * Generates a clean Markdown export of a chat session and triggers file download.
 */
export const exportChatAsMarkdown = (
  session: { title: string; messages: Message[]; updatedAt?: number },
  modelName: string = 'Gemini'
): void => {
  const safeFilename = (session.title || 'Conversation')
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .substring(0, 50);

  const md = generateChatMarkdownString(session, modelName);
  const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${safeFilename}.md`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

/**
 * Generates a jsPDF instance for a chat session.
 */
export const createChatPdfDocument = (
  session: { title: string; messages: Message[]; updatedAt?: number },
  modelName: string = 'Gemini'
): jsPDF => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'pt',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 40;
  const contentWidth = pageWidth - margin * 2;

  let y = margin;

  const checkPageBreak = (neededHeight: number) => {
    if (y + neededHeight > pageHeight - margin) {
      doc.addPage();
      y = margin;
      drawHeaderFooter();
    }
  };

  const drawHeaderFooter = () => {
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(140, 140, 150);
      doc.text(`Conversation Export: ${(session.title || 'Chat').substring(0, 40)}`, margin, 25);
      doc.text(`Page ${i} of ${pageCount}`, pageWidth - margin - 50, pageHeight - 15);
      doc.setDrawColor(220, 220, 230);
      doc.line(margin, 28, pageWidth - margin, 28);
    }
  };

  // Header Banner
  doc.setFillColor(15, 23, 42); // slate-900
  doc.roundedRect(margin, y, contentWidth, 54, 6, 6, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(255, 255, 255);
  doc.text(session.title || 'Chat Conversation', margin + 14, y + 24);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(148, 163, 184); // slate-400
  const exportDate = new Date(session.updatedAt || Date.now()).toLocaleString();
  doc.text(`Model: ${modelName}  •  Exported: ${exportDate}  •  ${session.messages.length} messages`, margin + 14, y + 42);

  y += 72;

  // Render messages
  session.messages.forEach((msg) => {
    const isUser = msg.role === 'user';
    const senderName = isUser ? 'User' : `Assistant (${modelName})`;
    const timeStr = new Date(msg.timestamp).toLocaleTimeString();

    checkPageBreak(50);

    // Sender Label Badge
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    if (isUser) {
      doc.setTextColor(2, 132, 199); // Sky blue
    } else {
      doc.setTextColor(124, 58, 237); // Purple / Violet
    }
    doc.text(`${senderName}   `, margin, y);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(156, 163, 175);
    const labelWidth = doc.getTextWidth(`${senderName}   `);
    doc.text(timeStr, margin + labelWidth, y);
    y += 14;

    const rawContent = (msg.versions && msg.currentVersionIndex !== undefined)
      ? msg.versions[msg.currentVersionIndex]
      : msg.content;

    // Clean markdown headings / syntax for clean text rendering in PDF
    const cleanedText = rawContent
      .replace(/^#{1,6}\s+/gm, '') // strip hash headings
      .replace(/\*\*(.*?)\*\*/g, '$1') // strip bold markdown
      .replace(/\*(.*?)\*/g, '$1') // strip italic markdown
      .replace(/`([^`]+)`/g, '$1'); // strip inline code backticks

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor(51, 65, 85); // Slate-700

    const splitLines = doc.splitTextToSize(cleanedText, contentWidth - 16);
    const boxHeight = splitLines.length * 13 + 12;

    checkPageBreak(boxHeight + 10);

    // Background container for message
    if (isUser) {
      doc.setFillColor(240, 249, 255); // Sky-50
      doc.setDrawColor(186, 230, 253); // Sky-200
    } else {
      doc.setFillColor(248, 250, 252); // Slate-50
      doc.setDrawColor(226, 232, 240); // Slate-200
    }
    doc.roundedRect(margin, y - 4, contentWidth, boxHeight, 4, 4, 'FD');

    // Text content inside container
    doc.text(splitLines, margin + 8, y + 10);
    y += boxHeight + 12;

    // Sources listing if available
    if (msg.groundingMetadata?.webSources && msg.groundingMetadata.webSources.length > 0) {
      checkPageBreak(24);
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.text('Referenced Sources:', margin + 8, y);
      y += 10;
      msg.groundingMetadata.webSources.slice(0, 4).forEach(src => {
        checkPageBreak(12);
        doc.text(`• ${src.title || src.uri}`, margin + 14, y);
        y += 11;
      });
      y += 6;
    }
  });

  drawHeaderFooter();
  return doc;
};

/**
 * Generates a clean, beautifully formatted PDF of a chat session and triggers file download.
 */
export const exportChatAsPdf = (
  session: { title: string; messages: Message[]; updatedAt?: number },
  modelName: string = 'Gemini'
): void => {
  const doc = createChatPdfDocument(session, modelName);
  const safeFilename = (session.title || 'Conversation')
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .substring(0, 50);

  doc.save(`${safeFilename}.pdf`);
};

/**
 * Batch exports multiple chat sessions into a single structured ZIP file
 * containing both formatted PDF and Markdown (.md) files for each conversation.
 */
export const exportBatchChatsAsZip = async (
  sessions: ChatSession[],
  modelMap: Record<string, string> = {},
  onProgress?: (completed: number, total: number, currentTitle: string) => void
): Promise<Blob> => {
  if (sessions.length === 0) {
    throw new Error('No sessions selected for batch export');
  }

  const zip = new JSZip();
  const dateStamp = new Date().toISOString().slice(0, 10);
  const rootFolder = zip.folder(`Nexus_Chats_Export_${dateStamp}`) || zip;

  let manifestText = `# Nexus AI Architect — Batch Chat Export Manifest\n`;
  manifestText += `Export Date: ${new Date().toLocaleString()}\n`;
  manifestText += `Total Sessions Exported: ${sessions.length}\n\n`;
  manifestText += `## Exported Sessions:\n`;

  for (let i = 0; i < sessions.length; i++) {
    const session = sessions[i];
    const indexStr = String(i + 1).padStart(2, '0');
    const safeTitle = (session.title || `Chat_${session.id.slice(0, 6)}`)
      .replace(/[^a-zA-Z0-9_\- ]/g, '')
      .trim()
      .replace(/\s+/g, '_')
      .substring(0, 45) || `Session_${indexStr}`;

    const modelName = modelMap[session.modelId] || 'Gemini 3.8 Flash';

    if (onProgress) {
      onProgress(i + 1, sessions.length, session.title || safeTitle);
    }

    // 1. Generate Markdown
    const markdownContent = generateChatMarkdownString(session, modelName);
    
    // 2. Generate PDF
    const pdfDoc = createChatPdfDocument(session, modelName);
    const pdfArrayBuffer = pdfDoc.output('arraybuffer');

    // Create session folder inside zip with both files
    const sessionFolderName = `${indexStr}_${safeTitle}`;
    const sessionFolder = rootFolder.folder(sessionFolderName);

    if (sessionFolder) {
      sessionFolder.file(`${safeTitle}.md`, markdownContent);
      sessionFolder.file(`${safeTitle}.pdf`, pdfArrayBuffer);
    } else {
      rootFolder.file(`${sessionFolderName}.md`, markdownContent);
      rootFolder.file(`${sessionFolderName}.pdf`, pdfArrayBuffer);
    }

    manifestText += `${i + 1}. **${session.title || safeTitle}**\n`;
    manifestText += `   - Messages: ${session.messages.length}\n`;
    manifestText += `   - Model: ${modelName}\n`;
    manifestText += `   - Updated: ${new Date(session.updatedAt || Date.now()).toLocaleString()}\n`;
    manifestText += `   - Files: \`${sessionFolderName}/${safeTitle}.md\` & \`${sessionFolderName}/${safeTitle}.pdf\`\n\n`;
  }

  rootFolder.file('README_MANIFEST.txt', manifestText);

  // Generate zip file
  const zipBlob = await zip.generateAsync({
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  });

  // Trigger download
  const downloadUrl = URL.createObjectURL(zipBlob);
  const a = document.createElement('a');
  a.href = downloadUrl;
  a.download = `Nexus_Chats_Export_${dateStamp}_(${sessions.length}_chats).zip`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(downloadUrl);

  return zipBlob;
};
