'use client';

import React, { useState } from 'react';
import {
  FileText,
  Printer,
  Download,
  Award,
  CreditCard,
  Briefcase,
  FileCheck,
  Check,
} from 'lucide-react';
import { DocumentFormData, DocumentTemplateType } from '@/lib/types';
import DocumentForm from './DocumentForm';
import DocumentPreview from './DocumentPreview';
import { generateDocxDocument } from '@/lib/docx-generator';

const TEMPLATES: {
  id: DocumentTemplateType;
  name: string;
  description: string;
  icon: React.ElementType;
}[] = [
  {
    id: 'biodata',
    name: 'Bio-data / Personal Sheet',
    description: 'Standard 2x2 photo box, personal info, education',
    icon: FileText,
  },
  {
    id: 'resume',
    name: 'Modern Resume / CV',
    description: 'Header, photo, qualifications, education',
    icon: Briefcase,
  },
  {
    id: 'certificate',
    name: 'Certificate of Recognition',
    description: 'Formal award, recipient name, citations',
    icon: Award,
  },
  {
    id: 'id_badge',
    name: 'ID Card / Badge',
    description: 'Compact badge format with photo and ID number',
    icon: CreditCard,
  },
];

const EMPTY_FORM: DocumentFormData = {
  fullName: '',
  positionOrTitle: '',
  birthDate: '',
  birthPlace: '',
  gender: '',
  civilStatus: '',
  citizenship: '',
  religion: '',
  height: '',
  weight: '',
  bloodType: '',
  contactNumber: '',
  email: '',
  address: '',
  tinOrIdNumber: '',
  sssNumber: '',
  fatherName: '',
  motherName: '',
  educationElementary: '',
  educationSecondary: '',
  educationCollege: '',
  educationCourse: '',
  skills: '',
};

export default function DocEncoderView({ initialFile }: { initialFile?: File }) {
  const [selectedTemplate, setSelectedTemplate] = useState<DocumentTemplateType>('biodata');
  const [formData, setFormData] = useState<DocumentFormData>(EMPTY_FORM);
  const [isGeneratingDocx, setIsGeneratingDocx] = useState(false);

  // Download Word Document (.docx)
  const handleDownloadDocx = async () => {
    if (!formData.fullName && !confirm('Full Name is empty. Proceed with download?')) {
      return;
    }

    setIsGeneratingDocx(true);
    try {
      const blob = await generateDocxDocument(formData, selectedTemplate);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const cleanName = (formData.fullName || 'Document').replace(/[^a-zA-Z0-9]/g, '_');
      a.download = `${cleanName}_${selectedTemplate}.docx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to generate docx:', err);
      alert('Error generating Word document. Check console.');
    } finally {
      setIsGeneratingDocx(false);
    }
  };

  // Direct Browser Print
  const handleDirectPrint = () => {
    window.print();
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Top Template Selector Strip */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-800">
            Document Template & Auto-Encoder
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Select a template, drop a Word file or scan to auto-fill, and generate printable documents.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {/* Download Word Document (.docx) */}
          <button
            onClick={handleDownloadDocx}
            disabled={isGeneratingDocx}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 disabled:opacity-50 rounded-lg shadow-xs transition"
          >
            <Download className="w-3.5 h-3.5 text-blue-600" />
            {isGeneratingDocx ? 'Building .docx...' : 'Download Word (.docx)'}
          </button>

          {/* Print Button */}
          <button
            onClick={handleDirectPrint}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs transition"
          >
            <Printer className="w-3.5 h-3.5" />
            Print Document (A4)
          </button>
        </div>
      </div>

      {/* Template Selector Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {TEMPLATES.map((tmpl) => {
          const Icon = tmpl.icon;
          const isSelected = selectedTemplate === tmpl.id;
          return (
            <button
              key={tmpl.id}
              onClick={() => setSelectedTemplate(tmpl.id)}
              className={`p-3 rounded-xl border text-left transition flex items-start gap-2.5 ${
                isSelected
                  ? 'border-blue-600 bg-blue-50/70 shadow-xs ring-1 ring-blue-600'
                  : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              <div
                className={`p-2 rounded-lg ${
                  isSelected ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'
                }`}
              >
                <Icon className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-slate-800 truncate">{tmpl.name}</p>
                <p className="text-[10px] text-slate-500 line-clamp-1 mt-0.5">
                  {tmpl.description}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Two-Column Workspace: Form & Live Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Form & Intake (5 cols) */}
        <div className="lg:col-span-5">
          <DocumentForm
            initialFile={initialFile}
            formData={formData}
            onChange={setFormData}
            onClear={() => setFormData(EMPTY_FORM)}
          />
        </div>

        {/* Right Column: Live Printable Document Preview (7 cols) */}
        <div className="lg:col-span-7 flex flex-col items-center">
          <div className="w-full bg-slate-100/70 p-4 sm:p-6 rounded-2xl border border-slate-200 flex justify-center">
            <div className="w-full max-w-xl">
              <DocumentPreview data={formData} templateType={selectedTemplate} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
