import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle,
  AlignmentType,
} from 'docx';
import pptxgen from 'pptxgenjs';

export interface DocSection {
  heading?: string;
  level?: 1 | 2 | 3;
  paragraphs?: string[];
  bullets?: string[];
  callout?: string;
  tableData?: string[][]; // row 0 is header
}

export interface WordDocPayload {
  title: string;
  subtitle?: string;
  author?: string;
  date?: string;
  sections: DocSection[];
}

export interface SlideData {
  title: string;
  subtitle?: string;
  layout?: 'title' | 'bullet' | 'twocolumn' | 'quote' | 'stats' | 'conclusion';
  bullets?: string[];
  leftColumn?: string[];
  rightColumn?: string[];
  quoteText?: string;
  quoteAuthor?: string;
  statValue?: string;
  statLabel?: string;
  notes?: string;
}

export interface PptxPayload {
  title: string;
  subtitle?: string;
  presenter?: string;
  theme?: 'modern-dark' | 'clean-light' | 'cyan-tech' | 'executive-navy';
  slides: SlideData[];
}

/**
 * Creates and downloads a professional Microsoft Word document (.docx)
 */
export const generateWordDocument = async (payload: WordDocPayload): Promise<Blob> => {
  const docChildren: any[] = [];

  // Title
  docChildren.push(
    new Paragraph({
      text: payload.title,
      heading: HeadingLevel.TITLE,
      alignment: AlignmentType.CENTER,
      spacing: { before: 200, after: 120 },
    })
  );

  // Subtitle
  if (payload.subtitle) {
    docChildren.push(
      new Paragraph({
        children: [
          new TextRun({
            text: payload.subtitle,
            italics: true,
            color: '64748B',
            size: 24, // 12pt
          }),
        ],
        alignment: AlignmentType.CENTER,
        spacing: { after: 200 },
      })
    );
  }

  // Metadata block (Author, Date)
  const metaRuns: TextRun[] = [];
  if (payload.author) {
    metaRuns.push(new TextRun({ text: `Author: ${payload.author}   `, bold: true, size: 20 }));
  }
  metaRuns.push(
    new TextRun({
      text: `Generated: ${payload.date || new Date().toLocaleDateString()}`,
      color: '888888',
      size: 20,
    })
  );

  docChildren.push(
    new Paragraph({
      children: metaRuns,
      alignment: AlignmentType.CENTER,
      spacing: { after: 360 },
    })
  );

  // Sections
  payload.sections.forEach((section) => {
    if (section.heading) {
      const headingLvl =
        section.level === 3
          ? HeadingLevel.HEADING_3
          : section.level === 2
          ? HeadingLevel.HEADING_2
          : HeadingLevel.HEADING_1;

      docChildren.push(
        new Paragraph({
          text: section.heading,
          heading: headingLvl,
          spacing: { before: 280, after: 120 },
        })
      );
    }

    if (section.callout) {
      docChildren.push(
        new Paragraph({
          children: [
            new TextRun({
              text: `NOTE: ${section.callout}`,
              italics: true,
              color: '1E3A8A',
            }),
          ],
          spacing: { before: 100, after: 120 },
        })
      );
    }

    if (section.paragraphs) {
      section.paragraphs.forEach((p) => {
        docChildren.push(
          new Paragraph({
            children: [new TextRun({ text: p, size: 22 })], // 11pt
            spacing: { after: 140 },
          })
        );
      });
    }

    if (section.bullets) {
      section.bullets.forEach((bullet) => {
        docChildren.push(
          new Paragraph({
            text: `• ${bullet}`,
            bullet: { level: 0 },
            spacing: { after: 80 },
          })
        );
      });
    }

    if (section.tableData && section.tableData.length > 0) {
      const rows = section.tableData.map((rowArr, rowIndex) => {
        const isHeader = rowIndex === 0;
        return new TableRow({
          children: rowArr.map(
            (cellText) =>
              new TableCell({
                width: { size: 100 / rowArr.length, type: WidthType.PERCENTAGE },
                children: [
                  new Paragraph({
                    children: [
                      new TextRun({
                        text: cellText,
                        bold: isHeader,
                        color: isHeader ? 'FFFFFF' : '1F2937',
                        size: 20,
                      }),
                    ],
                  }),
                ],
                shading: {
                  fill: isHeader ? '0F172A' : rowIndex % 2 === 0 ? 'F8FAFC' : 'FFFFFF',
                },
              })
          ),
        });
      });

      docChildren.push(
        new Table({
          rows,
          width: { size: 100, type: WidthType.PERCENTAGE },
          spacing: { after: 240 },
        })
      );
    }
  });

  const doc = new Document({
    sections: [
      {
        properties: {},
        children: docChildren,
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  return blob;
};

/**
 * Triggers download of generated docx
 */
export const downloadWordDoc = async (payload: WordDocPayload): Promise<void> => {
  const blob = await generateWordDocument(payload);
  const safeFilename = (payload.title || 'Document')
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .substring(0, 50);

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${safeFilename}.docx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

/**
 * Creates and downloads a PowerPoint presentation (.pptx)
 */
export const downloadPowerPointPresentation = async (payload: PptxPayload): Promise<void> => {
  const pres = new pptxgen();
  pres.layout = 'LAYOUT_16x9';
  pres.title = payload.title;

  const isDark = payload.theme === 'modern-dark' || payload.theme === 'cyan-tech';
  const bgColor =
    payload.theme === 'modern-dark'
      ? '0F172A'
      : payload.theme === 'cyan-tech'
      ? '0A0E17'
      : payload.theme === 'executive-navy'
      ? '1E293B'
      : 'F8FAFC';

  const titleColor = isDark || payload.theme === 'executive-navy' ? 'F8FAFC' : '0F172A';
  const bodyColor = isDark || payload.theme === 'executive-navy' ? '94A3B8' : '334155';
  const accentColor =
    payload.theme === 'cyan-tech'
      ? '06B6D4'
      : payload.theme === 'modern-dark'
      ? '38BDF8'
      : '2563EB';

  payload.slides.forEach((slideData, idx) => {
    const slide = pres.addSlide();
    slide.background = { color: bgColor };

    if (slideData.layout === 'title' || idx === 0) {
      // Main Title Slide
      slide.addText(slideData.title || payload.title, {
        x: 0.8,
        y: 2.2,
        w: 11.5,
        h: 1.4,
        fontSize: 40,
        bold: true,
        color: titleColor,
        fontFace: 'Arial',
        align: 'left',
      });

      if (slideData.subtitle || payload.subtitle) {
        slide.addText(slideData.subtitle || payload.subtitle || '', {
          x: 0.8,
          y: 3.7,
          w: 11.5,
          h: 0.8,
          fontSize: 20,
          color: accentColor,
          fontFace: 'Arial',
          align: 'left',
        });
      }

      if (payload.presenter) {
        slide.addText(`Presented by: ${payload.presenter}  •  ${new Date().toLocaleDateString()}`, {
          x: 0.8,
          y: 5.6,
          w: 10,
          h: 0.5,
          fontSize: 13,
          color: bodyColor,
          fontFace: 'Arial',
        });
      }
    } else if (slideData.layout === 'quote') {
      // Quote Slide
      slide.addText(`“${slideData.quoteText || slideData.title}”`, {
        x: 1.2,
        y: 2.0,
        w: 10.8,
        h: 2.5,
        fontSize: 32,
        italic: true,
        color: titleColor,
        align: 'center',
      });

      if (slideData.quoteAuthor) {
        slide.addText(`— ${slideData.quoteAuthor}`, {
          x: 1.2,
          y: 4.8,
          w: 10.8,
          h: 0.6,
          fontSize: 18,
          bold: true,
          color: accentColor,
          align: 'center',
        });
      }
    } else if (slideData.layout === 'twocolumn') {
      // Two Column Slide
      slide.addText(slideData.title, {
        x: 0.8,
        y: 0.6,
        w: 11.5,
        h: 0.8,
        fontSize: 26,
        bold: true,
        color: titleColor,
      });

      if (slideData.subtitle) {
        slide.addText(slideData.subtitle, {
          x: 0.8,
          y: 1.3,
          w: 11.5,
          h: 0.4,
          fontSize: 13,
          color: accentColor,
        });
      }

      const leftBullets = (slideData.leftColumn || []).map((b) => ({ text: b, options: { bullet: true, breakLine: true } }));
      slide.addText(leftBullets.length > 0 ? leftBullets : 'Left details', {
        x: 0.8,
        y: 1.9,
        w: 5.4,
        h: 4.5,
        fontSize: 15,
        color: bodyColor,
      });

      const rightBullets = (slideData.rightColumn || []).map((b) => ({ text: b, options: { bullet: true, breakLine: true } }));
      slide.addText(rightBullets.length > 0 ? rightBullets : 'Right details', {
        x: 6.8,
        y: 1.9,
        w: 5.4,
        h: 4.5,
        fontSize: 15,
        color: bodyColor,
      });
    } else {
      // Standard Bullet Point / Content Slide
      slide.addText(slideData.title, {
        x: 0.8,
        y: 0.7,
        w: 11.5,
        h: 0.8,
        fontSize: 28,
        bold: true,
        color: titleColor,
        fontFace: 'Arial',
      });

      if (slideData.subtitle) {
        slide.addText(slideData.subtitle, {
          x: 0.8,
          y: 1.4,
          w: 11.5,
          h: 0.4,
          fontSize: 14,
          color: accentColor,
          fontFace: 'Arial',
        });
      }

      if (slideData.bullets && slideData.bullets.length > 0) {
        const bulletObjects = slideData.bullets.map((b) => ({
          text: b,
          options: {
            bullet: true,
            breakLine: true,
            fontSize: 16,
            color: bodyColor,
            spaceAfter: 12,
          },
        }));

        slide.addText(bulletObjects, {
          x: 0.8,
          y: 2.0,
          w: 11.5,
          h: 4.6,
          fontFace: 'Arial',
          align: 'left',
          valign: 'top',
        });
      }
    }

    // Slide footer
    slide.addText(`Slide ${idx + 1}  •  ${payload.title}`, {
      x: 0.8,
      y: 6.8,
      w: 11.5,
      h: 0.3,
      fontSize: 9,
      color: '64748B',
    });

    if (slideData.notes) {
      slide.addNotes(slideData.notes);
    }
  });

  const safeFilename = (payload.title || 'Presentation')
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .substring(0, 50);

  await pres.writeFile({ fileName: `${safeFilename}.pptx` });
};

/**
 * Converts markdown or natural text into structured Word Doc payload
 */
export const convertTextToWordDocPayload = (title: string, markdownText: string): WordDocPayload => {
  const lines = markdownText.split('\n');
  const sections: DocSection[] = [];
  let currentSection: DocSection = { heading: 'Overview', paragraphs: [], bullets: [] };

  lines.forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed) return;

    if (trimmed.startsWith('# ')) {
      // Top title handled separately
      return;
    }

    if (trimmed.startsWith('## ')) {
      if (currentSection.paragraphs?.length || currentSection.bullets?.length) {
        sections.push(currentSection);
      }
      currentSection = { heading: trimmed.replace(/^##\s+/, ''), level: 1, paragraphs: [], bullets: [] };
    } else if (trimmed.startsWith('### ')) {
      if (currentSection.paragraphs?.length || currentSection.bullets?.length) {
        sections.push(currentSection);
      }
      currentSection = { heading: trimmed.replace(/^###\s+/, ''), level: 2, paragraphs: [], bullets: [] };
    } else if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      currentSection.bullets = currentSection.bullets || [];
      currentSection.bullets.push(trimmed.replace(/^[-*]\s+/, ''));
    } else {
      currentSection.paragraphs = currentSection.paragraphs || [];
      currentSection.paragraphs.push(trimmed);
    }
  });

  if (currentSection.paragraphs?.length || currentSection.bullets?.length) {
    sections.push(currentSection);
  }

  return {
    title,
    subtitle: 'Generated with AI Assistant',
    date: new Date().toLocaleDateString(),
    sections: sections.length > 0 ? sections : [{ heading: 'Content', paragraphs: [markdownText] }],
  };
};

/**
 * Converts text / bullet outline into structured PowerPoint payload
 */
export const convertTextToPptxPayload = (title: string, text: string): PptxPayload => {
  const lines = text.split('\n');
  const slides: SlideData[] = [];

  // Title Slide
  slides.push({
    title: title,
    subtitle: 'Executive Presentation',
    layout: 'title',
  });

  let currentSlide: SlideData | null = null;

  lines.forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed) return;

    if (trimmed.startsWith('# ') || trimmed.startsWith('## ') || trimmed.startsWith('Slide:')) {
      if (currentSlide) {
        slides.push(currentSlide);
      }
      currentSlide = {
        title: trimmed.replace(/^(#+|Slide:)\s*/, ''),
        bullets: [],
        layout: 'bullet',
      };
    } else if (trimmed.startsWith('- ') || trimmed.startsWith('* ') || /^\d+\.\s/.test(trimmed)) {
      if (!currentSlide) {
        currentSlide = { title: 'Key Insights', bullets: [], layout: 'bullet' };
      }
      currentSlide.bullets = currentSlide.bullets || [];
      currentSlide.bullets.push(trimmed.replace(/^([-*]|\d+\.)\s+/, ''));
    } else if (currentSlide) {
      currentSlide.bullets = currentSlide.bullets || [];
      currentSlide.bullets.push(trimmed);
    }
  });

  if (currentSlide) {
    slides.push(currentSlide);
  }

  // If no structured slides could be parsed, build a default 3-slide deck
  if (slides.length <= 1) {
    slides.push({
      title: 'Key Highlights',
      bullets: [
        'Detailed analysis and core findings',
        'Structured strategic overview',
        'Immediate execution milestones',
      ],
      layout: 'bullet',
    });
    slides.push({
      title: 'Conclusion & Next Steps',
      bullets: [
        'Final recommendations',
        'Actionable roadmap',
        'Open discussion and Q&A',
      ],
      layout: 'conclusion',
    });
  }

  return {
    title,
    subtitle: 'Executive Presentation',
    presenter: 'AI Assistant',
    theme: 'modern-dark',
    slides,
  };
};

/**
 * Direct 1-click Word document download from Markdown text
 */
export const downloadWordFromMarkdown = async (
  title: string,
  markdown: string,
  fileName?: string
): Promise<void> => {
  const payload = convertMarkdownToWordPayload(title, markdown);
  const blob = await generateWordDocument(payload);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName || `${title.toLowerCase().replace(/[^a-z0-9_-]+/g, '_').slice(0, 40) || 'document'}.docx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

/**
 * Direct 1-click PowerPoint presentation download from text / outline
 */
export const downloadPptxFromMarkdown = async (
  title: string,
  text: string,
  fileName?: string
): Promise<void> => {
  const payload = convertTextToPptxPayload(title, text);
  const defaultName = `${title.toLowerCase().replace(/[^a-z0-9_-]+/g, '_').slice(0, 40) || 'presentation'}.pptx`;
  await downloadPowerPointPresentation(payload, fileName || defaultName);
};

