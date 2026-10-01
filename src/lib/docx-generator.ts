import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  AlignmentType,
  BorderStyle,
  ImageRun,
} from 'docx';
import { DocumentFormData, DocumentTemplateType } from './types';

function base64ToUint8Array(base64: string): Uint8Array {
  const pureBase64 = base64.replace(/^data:image\/[a-zA-Z]+;base64,/, '');
  const binaryString = atob(pureBase64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

/**
 * Generates an editable Microsoft Word (.docx) document from structured form data and photo.
 */
export async function generateDocxDocument(
  data: DocumentFormData,
  templateType: DocumentTemplateType
): Promise<Blob> {
  const children: (Paragraph | Table)[] = [];

  let photoRun: ImageRun | undefined;
  if (data.photoUrl) {
    try {
      const photoBytes = base64ToUint8Array(data.photoUrl);
      photoRun = new ImageRun({
        data: photoBytes,
        transformation: {
          width: 140, // pixels
          height: 140,
        },
        type: 'png',
      });
    } catch (e) {
      console.error('Failed to parse photo for docx:', e);
    }
  }

  if (templateType === 'certificate') {
    // Certificate template
    children.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 600, after: 200 },
        children: [
          new TextRun({
            text: 'CERTIFICATE OF RECOGNITION',
            bold: true,
            size: 48,
            color: '1E3A8A',
            font: 'Georgia',
          }),
        ],
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 400 },
        children: [
          new TextRun({
            text: 'THIS CERTIFICATE IS PROUDLY PRESENTED TO',
            size: 22,
            font: 'Arial',
            color: '64748B',
          }),
        ],
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 400 },
        children: [
          new TextRun({
            text: data.fullName || 'RECIPIENT NAME',
            bold: true,
            size: 40,
            underline: {},
            font: 'Georgia',
            color: '0F172A',
          }),
        ],
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 600 },
        children: [
          new TextRun({
            text: `In recognition of outstanding dedication, excellence, and exemplary performance${
              data.positionOrTitle ? ` as ${data.positionOrTitle}` : ''
            }. Awarded on ${data.dateSigned || new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}.`,
            size: 24,
            font: 'Georgia',
            italics: true,
          }),
        ],
      })
    );
  } else if (templateType === 'resume') {
    // Resume Template
    children.push(
      new Paragraph({
        alignment: AlignmentType.LEFT,
        children: [
          new TextRun({
            text: (data.fullName || 'YOUR NAME').toUpperCase(),
            bold: true,
            size: 36,
            color: '1E3A8A',
          }),
        ],
      }),
      new Paragraph({
        spacing: { after: 200 },
        children: [
          new TextRun({
            text: `${data.positionOrTitle || 'Professional'} | ${data.contactNumber || ''} | ${data.email || ''}`,
            size: 20,
            color: '475569',
          }),
        ],
      }),
      new Paragraph({
        spacing: { after: 100 },
        children: [
          new TextRun({
            text: 'Address: ',
            bold: true,
            size: 20,
          }),
          new TextRun({
            text: data.address || '',
            size: 20,
          }),
        ],
      })
    );

    if (photoRun) {
      children.push(
        new Paragraph({
          alignment: AlignmentType.RIGHT,
          children: [photoRun],
        })
      );
    }

    // Education section
    children.push(
      new Paragraph({
        spacing: { before: 200, after: 100 },
        children: [
          new TextRun({
            text: 'EDUCATION',
            bold: true,
            size: 24,
            color: '1E3A8A',
          }),
        ],
      })
    );

    if (data.educationCollege) {
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: data.educationCollege,
              bold: true,
              size: 20,
            }),
            new TextRun({
              text: data.educationCourse ? ` — ${data.educationCourse}` : '',
              size: 20,
            }),
          ],
        })
      );
    }
    if (data.educationSecondary) {
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: `Secondary: ${data.educationSecondary}`,
              size: 20,
            }),
          ],
        })
      );
    }

    // Skills & experience
    if (data.skills) {
      children.push(
        new Paragraph({
          spacing: { before: 200, after: 100 },
          children: [
            new TextRun({
              text: 'SKILLS & QUALIFICATIONS',
              bold: true,
              size: 24,
              color: '1E3A8A',
            }),
          ],
        }),
        new Paragraph({
          children: [new TextRun({ text: data.skills, size: 20 })],
        })
      );
    }
  } else {
    // Default: Standard BIO-DATA format
    // Header Table with Title & 2x2 Photo Box
    const headerRowCells = [
      new TableCell({
        width: { size: 75, type: WidthType.PERCENTAGE },
        borders: {
          top: { style: BorderStyle.NONE },
          bottom: { style: BorderStyle.NONE },
          left: { style: BorderStyle.NONE },
          right: { style: BorderStyle.NONE },
        },
        children: [
          new Paragraph({
            children: [
              new TextRun({
                text: 'BIO-DATA',
                bold: true,
                size: 38,
                color: '0F172A',
              }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: 'PERSONAL DATA SHEET',
                size: 18,
                color: '64748B',
                bold: true,
              }),
            ],
          }),
        ],
      }),
      new TableCell({
        width: { size: 25, type: WidthType.PERCENTAGE },
        borders: {
          top: { style: BorderStyle.SINGLE, size: 1, color: '94A3B8' },
          bottom: { style: BorderStyle.SINGLE, size: 1, color: '94A3B8' },
          left: { style: BorderStyle.SINGLE, size: 1, color: '94A3B8' },
          right: { style: BorderStyle.SINGLE, size: 1, color: '94A3B8' },
        },
        children: [
          photoRun
            ? new Paragraph({ alignment: AlignmentType.CENTER, children: [photoRun] })
            : new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { before: 300, after: 300 },
                children: [
                  new TextRun({
                    text: 'PHOTO (2×2)',
                    size: 16,
                    color: '94A3B8',
                  }),
                ],
              }),
        ],
      }),
    ];

    children.push(
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [new TableRow({ children: headerRowCells })],
      })
    );

    // Personal details table
    const createDataRow = (label1: string, val1?: string, label2?: string, val2?: string) => {
      return new TableRow({
        children: [
          new TableCell({
            width: { size: 25, type: WidthType.PERCENTAGE },
            children: [new Paragraph({ children: [new TextRun({ text: label1, bold: true, size: 18 })] })],
          }),
          new TableCell({
            width: { size: 30, type: WidthType.PERCENTAGE },
            children: [new Paragraph({ children: [new TextRun({ text: val1 || '', size: 18 })] })],
          }),
          new TableCell({
            width: { size: 20, type: WidthType.PERCENTAGE },
            children: [new Paragraph({ children: [new TextRun({ text: label2 || '', bold: true, size: 18 })] })],
          }),
          new TableCell({
            width: { size: 25, type: WidthType.PERCENTAGE },
            children: [new Paragraph({ children: [new TextRun({ text: val2 || '', size: 18 })] })],
          }),
        ],
      });
    };

    children.push(
      new Paragraph({ spacing: { before: 200 } }),
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          createDataRow('Full Name:', data.fullName, 'Position:', data.positionOrTitle),
          createDataRow('Present Address:', data.address, 'Contact No.:', data.contactNumber),
          createDataRow('Date of Birth:', data.birthDate, 'Birth Place:', data.birthPlace),
          createDataRow('Gender / Sex:', data.gender, 'Civil Status:', data.civilStatus),
          createDataRow('Citizenship:', data.citizenship, 'Religion:', data.religion),
          createDataRow('Height:', data.height, 'Weight:', data.weight),
          createDataRow('Email Address:', data.email, 'Blood Type:', data.bloodType),
          createDataRow('SSS Number:', data.sssNumber, 'TIN / ID No:', data.tinOrIdNumber),
          createDataRow("Father's Name:", data.fatherName, "Mother's Name:", data.motherName),
        ],
      })
    );

    // Education
    children.push(
      new Paragraph({
        spacing: { before: 300, after: 100 },
        children: [
          new TextRun({
            text: 'EDUCATIONAL BACKGROUND',
            bold: true,
            size: 20,
            color: '0F172A',
          }),
        ],
      }),
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          new TableRow({
            children: [
              new TableCell({
                width: { size: 30, type: WidthType.PERCENTAGE },
                children: [new Paragraph({ children: [new TextRun({ text: 'Level', bold: true, size: 18 })] })],
              }),
              new TableCell({
                width: { size: 70, type: WidthType.PERCENTAGE },
                children: [new Paragraph({ children: [new TextRun({ text: 'School Name / Degree', bold: true, size: 18 })] })],
              }),
            ],
          }),
          new TableRow({
            children: [
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'College / University', size: 18 })] })] }),
              new TableCell({
                children: [
                  new Paragraph({
                    children: [
                      new TextRun({
                        text: `${data.educationCollege || ''} ${data.educationCourse ? `(${data.educationCourse})` : ''}`,
                        size: 18,
                      }),
                    ],
                  }),
                ],
              }),
            ],
          }),
          new TableRow({
            children: [
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'High School', size: 18 })] })] }),
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: data.educationSecondary || '', size: 18 })] })] }),
            ],
          }),
          new TableRow({
            children: [
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Elementary', size: 18 })] })] }),
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: data.educationElementary || '', size: 18 })] })] }),
            ],
          }),
        ],
      })
    );
  }

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 720, // 0.5 inch
              right: 720,
              bottom: 720,
              left: 720,
            },
          },
        },
        children,
      },
    ],
  });

  return await Packer.toBlob(doc);
}
