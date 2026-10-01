import JSZip from 'jszip';
import { DocumentFormData } from './types';

export interface DocxParseResult {
  data: Partial<DocumentFormData>;
  rawText: string;
  extractedPhoto?: string; // base64 Data URL
  extractedImageCount: number;
}

/**
 * 100% Non-AI OpenXML Word (.docx) Parser
 * Extracts text, key-value fields (Name, Birthdate, Address, etc.), tables,
 * and extracts any portrait photos embedded in word/media/.
 */
export async function parseDocxFile(file: File | ArrayBuffer): Promise<DocxParseResult> {
  const zip = new JSZip();
  const zipContent = await zip.loadAsync(file);

  // 1. Extract embedded images from word/media/
  let extractedPhoto: string | undefined;
  let extractedImageCount = 0;
  const mediaFiles = Object.keys(zipContent.files).filter((path) =>
    path.startsWith('word/media/') && !zipContent.files[path].dir
  );

  extractedImageCount = mediaFiles.length;

  if (mediaFiles.length > 0) {
    // Prefer portrait aspect ratio or largest image
    for (const imagePath of mediaFiles) {
      const fileEntry = zipContent.files[imagePath];
      const ext = imagePath.split('.').pop()?.toLowerCase() || 'png';
      const mime = ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : 'image/png';
      const base64Data = await fileEntry.async('base64');
      extractedPhoto = `data:${mime};base64,${base64Data}`;
      // Break on first valid image or prioritize
      break;
    }
  }

  // 2. Extract text from word/document.xml
  const docXmlEntry = zipContent.files['word/document.xml'];
  if (!docXmlEntry) {
    return {
      data: {},
      rawText: '',
      extractedPhoto,
      extractedImageCount,
    };
  }

  const xmlText = await docXmlEntry.async('string');
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xmlText, 'application/xml');

  // Extract paragraphs and table cells
  const lines: string[] = [];
  const paragraphs = xmlDoc.getElementsByTagName('w:p');

  for (let i = 0; i < paragraphs.length; i++) {
    const p = paragraphs[i];
    const textNodes = p.getElementsByTagName('w:t');
    let line = '';
    for (let j = 0; j < textNodes.length; j++) {
      line += textNodes[j].textContent || '';
    }
    const trimmed = line.trim();
    if (trimmed) {
      lines.push(trimmed);
    }
  }

  const fullText = lines.join('\n');

  // 3. Rule-based Key-Value regex extraction
  const extractedData: Partial<DocumentFormData> = {};

  function findField(patterns: RegExp[]): string | undefined {
    for (const pattern of patterns) {
      for (const line of lines) {
        const match = line.match(pattern);
        if (match && match[1] && match[1].trim()) {
          return match[1].trim().replace(/^[:\-\t ]+/, '');
        }
      }
    }
    return undefined;
  }

  // Common print shop document label patterns
  extractedData.fullName = findField([
    /(?:Full\s*Name|Name\s*of\s*Applicant|Applicant\s*Name|Name)\s*[:\-\t]\s*(.+)/i,
    /(?:Pangalan)\s*[:\-\t]\s*(.+)/i,
  ]);

  extractedData.positionOrTitle = findField([
    /(?:Position\s*Desired|Job\s*Title|Position|Title|Course)\s*[:\-\t]\s*(.+)/i,
  ]);

  extractedData.birthDate = findField([
    /(?:Date\s*of\s*Birth|Birth\s*Date|DOB|Kapanganakan)\s*[:\-\t]\s*(.+)/i,
  ]);

  extractedData.birthPlace = findField([
    /(?:Place\s*of\s*Birth|Birth\s*Place)\s*[:\-\t]\s*(.+)/i,
  ]);

  extractedData.gender = findField([
    /(?:Sex|Gender|Kasarian)\s*[:\-\t]\s*(.+)/i,
  ]);

  extractedData.civilStatus = findField([
    /(?:Civil\s*Status|Marital\s*Status|Status)\s*[:\-\t]\s*(.+)/i,
  ]);

  extractedData.citizenship = findField([
    /(?:Citizenship|Nationality)\s*[:\-\t]\s*(.+)/i,
  ]);

  extractedData.religion = findField([
    /(?:Religion|Relihiyon)\s*[:\-\t]\s*(.+)/i,
  ]);

  extractedData.height = findField([
    /(?:Height|Taas)\s*[:\-\t]\s*(.+)/i,
  ]);

  extractedData.weight = findField([
    /(?:Weight|Timbang)\s*[:\-\t]\s*(.+)/i,
  ]);

  extractedData.bloodType = findField([
    /(?:Blood\s*Type)\s*[:\-\t]\s*(.+)/i,
  ]);

  extractedData.contactNumber = findField([
    /(?:Contact\s*No\.?|Phone\s*No\.?|Mobile\s*No\.?|Cell\s*No\.?|Tel\s*No\.?)\s*[:\-\t]\s*(.+)/i,
  ]);

  extractedData.email = findField([
    /(?:Email\s*Address|Email|E-mail)\s*[:\-\t]\s*(.+)/i,
  ]);

  extractedData.address = findField([
    /(?:Present\s*Address|Permanent\s*Address|Home\s*Address|Residential\s*Address|Address)\s*[:\-\t]\s*(.+)/i,
  ]);

  extractedData.tinOrIdNumber = findField([
    /(?:TIN|T\.I\.N\.|ID\s*No\.?|Tax\s*Identification)\s*[:\-\t]\s*(.+)/i,
  ]);

  extractedData.sssNumber = findField([
    /(?:SSS\s*No\.?|S\.S\.S\.)\s*[:\-\t]\s*(.+)/i,
  ]);

  extractedData.spouseName = findField([
    /(?:Name\s*of\s*Spouse|Spouse)\s*[:\-\t]\s*(.+)/i,
  ]);

  extractedData.fatherName = findField([
    /(?:Father'?s\s*Name|Father)\s*[:\-\t]\s*(.+)/i,
  ]);

  extractedData.motherName = findField([
    /(?:Mother'?s\s*Name|Mother)\s*[:\-\t]\s*(.+)/i,
  ]);

  extractedData.educationElementary = findField([
    /(?:Elementary|Primary\s*School)\s*[:\-\t]\s*(.+)/i,
  ]);

  extractedData.educationSecondary = findField([
    /(?:High\s*School|Secondary)\s*[:\-\t]\s*(.+)/i,
  ]);

  extractedData.educationCollege = findField([
    /(?:College|University|Tertiary)\s*[:\-\t]\s*(.+)/i,
  ]);

  extractedData.educationCourse = findField([
    /(?:Degree|Course|Major)\s*[:\-\t]\s*(.+)/i,
  ]);

  if (extractedPhoto) {
    extractedData.photoUrl = extractedPhoto;
  }

  return {
    data: extractedData,
    rawText: fullText,
    extractedPhoto,
    extractedImageCount,
  };
}
