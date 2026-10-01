'use client';

import React, { useRef, useState } from 'react';
import {
  Upload,
  FileText,
  Sparkles,
  User,
  Trash2,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  FileCode,
} from 'lucide-react';
import { DocumentFormData } from '@/lib/types';
import { parseDocxFile } from '@/lib/docx-parser';

interface DocumentFormProps {
  formData: DocumentFormData;
  onChange: (updated: DocumentFormData) => void;
  onClear: () => void;
  geminiApiKey?: string;
}

const SAMPLE_DATA: DocumentFormData = {
  fullName: 'MARIA LOURDES SANTOS',
  positionOrTitle: 'Administrative Assistant',
  birthDate: '1998-08-15',
  birthPlace: 'Quezon City',
  gender: 'Female',
  civilStatus: 'Single',
  citizenship: 'Filipino',
  religion: 'Roman Catholic',
  height: '5\'4"',
  weight: '52 kg',
  bloodType: 'O+',
  contactNumber: '0917-555-0192',
  email: 'maria.santos@example.com',
  address: '142 Rizal Ave, Brgy. Central, Quezon City',
  tinOrIdNumber: '402-819-204-000',
  sssNumber: '34-8291048-2',
  fatherName: 'Roberto Santos',
  motherName: 'Elena Cruz Santos',
  educationCollege: 'Polytechnic University of the Philippines',
  educationCourse: 'BS Office Administration',
  educationSecondary: 'Quezon City High School',
  educationElementary: 'Central Elementary School',
  skills: 'MS Office Specialist (Word, Excel), Records Management, Fast Typing (65 WPM)',
};

export default function DocumentForm({
  formData,
  onChange,
  onClear,
  geminiApiKey,
}: DocumentFormProps) {
  const [isParsingDocx, setIsParsingDocx] = useState(false);
  const [isAiExtracting, setIsAiExtracting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{
    type: 'success' | 'error' | 'info';
    text: string;
  } | null>(null);

  const [uploadedScanImage, setUploadedScanImage] = useState<string | null>(null);

  const docInputRef = useRef<HTMLInputElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);

  const handleFieldChange = (field: keyof DocumentFormData, value: string) => {
    onChange({
      ...formData,
      [field]: value,
    });
  };

  // Handle Document / File Import
  const handleFileDrop = async (file: File) => {
    setStatusMessage(null);
    const fileName = file.name.toLowerCase();

    if (fileName.endsWith('.docx')) {
      // 100% Non-AI OpenXML Parser
      setIsParsingDocx(true);
      try {
        const result = await parseDocxFile(file);
        const merged = { ...formData, ...result.data };
        if (result.extractedPhoto) {
          merged.photoUrl = result.extractedPhoto;
        }
        onChange(merged);
        setStatusMessage({
          type: 'success',
          text: `Extracted ${Object.keys(result.data).length} fields ${
            result.extractedPhoto ? 'and 1 embedded photo' : ''
          } directly from Word file without AI!`,
        });
      } catch (err: any) {
        console.error('Docx parse error:', err);
        setStatusMessage({
          type: 'error',
          text: 'Could not read .docx file structure. Ensure it is a valid Word document.',
        });
      } finally {
        setIsParsingDocx(false);
      }
    } else if (file.type.startsWith('image/')) {
      // Image import: manual by default
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        setUploadedScanImage(result);
        setStatusMessage({
          type: 'info',
          text: 'Image loaded into preview. Click "Auto-Extract with AI" if you want AI to parse fields.',
        });
      };
      reader.readAsDataURL(file);
    } else {
      setStatusMessage({
        type: 'error',
        text: 'Unsupported file format. Please upload a .docx Word file or an image (JPEG, PNG).',
      });
    }
  };

  // Optional AI Extraction button
  const handleAiExtract = async () => {
    if (!uploadedScanImage && !formData.photoUrl) {
      setStatusMessage({
        type: 'error',
        text: 'Please upload an image of a document or ID first to extract details with AI.',
      });
      return;
    }

    const targetImage = uploadedScanImage || formData.photoUrl;
    setIsAiExtracting(true);
    setStatusMessage(null);

    try {
      const storedKey = typeof window !== 'undefined' ? localStorage.getItem('gemini_api_key') : null;
      const keyToUse = geminiApiKey || storedKey || '';

      const res = await fetch('/api/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: targetImage,
          userApiKey: keyToUse,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to extract document information.');
      }

      const extracted = json.data;
      onChange({
        ...formData,
        ...extracted,
        photoUrl: formData.photoUrl || uploadedScanImage || undefined,
      });

      setStatusMessage({
        type: 'success',
        text: 'AI successfully extracted document details into form!',
      });
    } catch (err: any) {
      console.error('AI extract failed:', err);
      setStatusMessage({
        type: 'error',
        text: err.message || 'AI extraction failed. Please check your Gemini API key in Settings.',
      });
    } finally {
      setIsAiExtracting(false);
    }
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      onChange({
        ...formData,
        photoUrl: result,
      });
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="flex flex-col gap-5">
      {/* 1. Fast Document Intake Zone */}
      <div className="bg-slate-50 border-2 border-dashed border-slate-300 rounded-2xl p-4 text-center hover:border-blue-400 transition">
        <input
          ref={docInputRef}
          type="file"
          accept=".docx,image/*"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFileDrop(file);
          }}
          className="hidden"
        />

        <div className="flex flex-col items-center justify-center">
          <div className="flex items-center gap-2 mb-2">
            <span className="p-2 rounded-xl bg-blue-100 text-blue-700">
              <FileText className="w-5 h-5" />
            </span>
            <span className="text-xs font-bold text-slate-700">
              Drop Word (.docx) or Image / ID Scan
            </span>
          </div>

          <p className="text-[11px] text-slate-500 max-w-sm mb-3">
            <strong>Word (.docx):</strong> Automatically extracts fields & photos with 100% Non-AI parser.
            <br />
            <strong>Image / ID:</strong> Loads manually, with optional 1-click AI scan.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-2">
            <button
              onClick={() => docInputRef.current?.click()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-700 bg-white border border-blue-200 rounded-lg hover:bg-blue-50 shadow-xs transition"
            >
              <Upload className="w-3.5 h-3.5" />
              Choose File
            </button>

            {/* Optional AI Button */}
            {uploadedScanImage && (
              <button
                onClick={handleAiExtract}
                disabled={isAiExtracting}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-purple-600 hover:bg-purple-700 rounded-lg shadow-xs transition disabled:opacity-50"
              >
                <Sparkles className="w-3.5 h-3.5" />
                {isAiExtracting ? 'AI Extracting...' : 'Auto-Extract with AI'}
              </button>
            )}

            <button
              onClick={() => onChange(SAMPLE_DATA)}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-600 bg-slate-200/70 hover:bg-slate-200 rounded-lg transition"
            >
              <RefreshCw className="w-3 h-3" />
              Load Sample Bio-data
            </button>
          </div>
        </div>

        {/* Status Toast */}
        {statusMessage && (
          <div
            className={`mt-3 p-2.5 rounded-lg text-xs flex items-center gap-2 text-left ${
              statusMessage.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                : statusMessage.type === 'info'
                ? 'bg-blue-50 text-blue-800 border border-blue-200'
                : 'bg-red-50 text-red-800 border border-red-200'
            }`}
          >
            {statusMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            ) : statusMessage.type === 'info' ? (
              <Sparkles className="w-4 h-4 shrink-0 text-blue-600" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
            )}
            <span>{statusMessage.text}</span>
          </div>
        )}
      </div>

      {/* 2. Photo & Primary Bio Info */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
        <div className="flex items-start gap-4 mb-4 pb-4 border-b border-slate-100">
          {/* Portrait Photo Box */}
          <div className="flex flex-col items-center">
            <div
              onClick={() => photoInputRef.current?.click()}
              className="w-24 h-24 rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 flex items-center justify-center overflow-hidden cursor-pointer hover:border-blue-400 group relative"
            >
              {formData.photoUrl ? (
                <>
                  <img
                    src={formData.photoUrl}
                    alt="Customer photo"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white text-[10px] font-bold">
                    Change
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center text-slate-400 p-2 text-center">
                  <User className="w-6 h-6 mb-1" />
                  <span className="text-[9px] font-semibold">Attach 2×2</span>
                </div>
              )}
            </div>
            <input
              ref={photoInputRef}
              type="file"
              accept="image/*"
              onChange={handlePhotoUpload}
              className="hidden"
            />
            {formData.photoUrl && (
              <button
                onClick={() => onChange({ ...formData, photoUrl: undefined })}
                className="text-[10px] text-red-500 hover:underline mt-1"
              >
                Remove
              </button>
            )}
          </div>

          {/* Full Name & Position */}
          <div className="flex-1 space-y-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Full Name *
              </label>
              <input
                type="text"
                value={formData.fullName || ''}
                onChange={(e) => handleFieldChange('fullName', e.target.value)}
                placeholder="e.g. JUAN D. DELA CRUZ"
                className="w-full px-3 py-1.5 text-xs font-semibold uppercase border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Position / Job Title / Course
              </label>
              <input
                type="text"
                value={formData.positionOrTitle || ''}
                onChange={(e) => handleFieldChange('positionOrTitle', e.target.value)}
                placeholder="e.g. Sales Associate / Student"
                className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              />
            </div>
          </div>
        </div>

        {/* Personal Details Grid */}
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">
              Date of Birth
            </label>
            <input
              type="text"
              value={formData.birthDate || ''}
              onChange={(e) => handleFieldChange('birthDate', e.target.value)}
              placeholder="YYYY-MM-DD"
              className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">
              Birth Place
            </label>
            <input
              type="text"
              value={formData.birthPlace || ''}
              onChange={(e) => handleFieldChange('birthPlace', e.target.value)}
              placeholder="City, Province"
              className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">
              Gender / Sex
            </label>
            <input
              type="text"
              value={formData.gender || ''}
              onChange={(e) => handleFieldChange('gender', e.target.value)}
              placeholder="Male / Female"
              className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">
              Civil Status
            </label>
            <input
              type="text"
              value={formData.civilStatus || ''}
              onChange={(e) => handleFieldChange('civilStatus', e.target.value)}
              placeholder="Single / Married"
              className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">
              Contact Number
            </label>
            <input
              type="text"
              value={formData.contactNumber || ''}
              onChange={(e) => handleFieldChange('contactNumber', e.target.value)}
              placeholder="09XX-XXX-XXXX"
              className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">
              Email Address
            </label>
            <input
              type="email"
              value={formData.email || ''}
              onChange={(e) => handleFieldChange('email', e.target.value)}
              placeholder="customer@email.com"
              className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
            />
          </div>
        </div>

        <div>
          <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">
            Full Address
          </label>
          <input
            type="text"
            value={formData.address || ''}
            onChange={(e) => handleFieldChange('address', e.target.value)}
            placeholder="House/Unit No., Street, Barangay, City, Province"
            className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
          />
        </div>

        {/* Education Fields */}
        <div className="border-t border-slate-100 pt-3 mt-3">
          <span className="text-[11px] font-bold text-slate-700 block mb-2">
            Educational Background
          </span>
          <div className="space-y-2">
            <div>
              <label className="block text-[10px] text-slate-500">College & Course</label>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  value={formData.educationCollege || ''}
                  onChange={(e) => handleFieldChange('educationCollege', e.target.value)}
                  placeholder="University / College"
                  className="w-full px-2 py-1 text-xs border border-slate-300 rounded-md focus:ring-1 focus:ring-blue-500 focus:outline-hidden"
                />
                <input
                  type="text"
                  value={formData.educationCourse || ''}
                  onChange={(e) => handleFieldChange('educationCourse', e.target.value)}
                  placeholder="Degree / Major"
                  className="w-full px-2 py-1 text-xs border border-slate-300 rounded-md focus:ring-1 focus:ring-blue-500 focus:outline-hidden"
                />
              </div>
            </div>
            <div>
              <label className="block text-[10px] text-slate-500">High School</label>
              <input
                type="text"
                value={formData.educationSecondary || ''}
                onChange={(e) => handleFieldChange('educationSecondary', e.target.value)}
                placeholder="Secondary School Name"
                className="w-full px-2 py-1 text-xs border border-slate-300 rounded-md focus:ring-1 focus:ring-blue-500 focus:outline-hidden"
              />
            </div>
          </div>
        </div>

        {/* Clear Form */}
        <div className="flex justify-end pt-3 mt-3 border-t border-slate-100">
          <button
            onClick={onClear}
            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs text-red-600 hover:bg-red-50 rounded-lg transition"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Clear Form
          </button>
        </div>
      </div>
    </div>
  );
}
