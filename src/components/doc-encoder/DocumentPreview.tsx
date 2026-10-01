'use client';

import React from 'react';
import { DocumentFormData, DocumentTemplateType } from '@/lib/types';
import { User } from 'lucide-react';

interface DocumentPreviewProps {
  data: DocumentFormData;
  templateType: DocumentTemplateType;
}

export default function DocumentPreview({ data, templateType }: DocumentPreviewProps) {
  if (templateType === 'certificate') {
    return (
      <div className="w-full bg-white border-8 border-double border-amber-700/80 p-8 sm:p-12 shadow-lg rounded-sm text-center flex flex-col justify-between min-h-[580px]">
        <div className="flex flex-col items-center">
          <div className="w-16 h-1 bg-amber-600 mb-4" />
          <h1 className="text-2xl sm:text-3xl font-serif font-black tracking-widest text-slate-900 uppercase">
            Certificate of Recognition
          </h1>
          <p className="text-xs font-serif italic text-amber-800 tracking-wider mt-1 uppercase">
            This Certificate is Proudly Presented To
          </p>

          <div className="my-8">
            <h2 className="text-2xl sm:text-4xl font-serif font-bold text-blue-950 underline decoration-amber-600 underline-offset-8">
              {data.fullName || 'Recipient Name'}
            </h2>
            {data.positionOrTitle && (
              <p className="text-sm font-semibold text-slate-600 mt-2">
                {data.positionOrTitle}
              </p>
            )}
          </div>

          <p className="text-xs sm:text-sm font-serif text-slate-700 max-w-lg leading-relaxed">
            In recognition of outstanding dedication, excellence, and exemplary performance. Given this{' '}
            <span className="font-semibold">
              {data.dateSigned ||
                new Date().toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
            </span>
            .
          </p>
        </div>

        <div className="grid grid-cols-2 gap-8 pt-10 mt-8 border-t border-slate-200">
          <div className="flex flex-col items-center">
            <div className="w-40 border-b border-slate-800 mb-1" />
            <span className="text-[11px] font-bold text-slate-800">Authorized Signature</span>
            <span className="text-[10px] text-slate-500">Program Director</span>
          </div>
          <div className="flex flex-col items-center">
            <div className="w-40 border-b border-slate-800 mb-1" />
            <span className="text-[11px] font-bold text-slate-800">Executive Signature</span>
            <span className="text-[10px] text-slate-500">Authorized Signatory</span>
          </div>
        </div>
      </div>
    );
  }

  if (templateType === 'resume') {
    return (
      <div className="w-full bg-white border border-slate-200 p-8 shadow-lg rounded-sm text-slate-900 text-xs min-h-[580px]">
        {/* Header */}
        <div className="flex items-start justify-between border-b-2 border-blue-900 pb-4 mb-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-blue-950 uppercase">
              {data.fullName || 'Full Name'}
            </h1>
            <p className="text-sm font-semibold text-blue-800 mt-0.5">
              {data.positionOrTitle || 'Desired Position / Title'}
            </p>
            <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-slate-600 mt-2">
              {data.contactNumber && <span>📞 {data.contactNumber}</span>}
              {data.email && <span>✉️ {data.email}</span>}
              {data.address && <span>📍 {data.address}</span>}
            </div>
          </div>

          {/* Photo */}
          <div className="w-24 h-24 border border-slate-300 rounded-sm overflow-hidden bg-slate-50 shrink-0">
            {data.photoUrl ? (
              <img src={data.photoUrl} alt="Portrait" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-slate-400">
                <User className="w-8 h-8" />
                <span className="text-[9px]">Photo Box</span>
              </div>
            )}
          </div>
        </div>

        {/* Education */}
        <div className="mb-4">
          <h2 className="text-xs font-bold text-blue-950 uppercase tracking-wider border-b border-slate-200 pb-1 mb-2">
            Educational Background
          </h2>
          <div className="space-y-1.5 text-[11px]">
            {data.educationCollege && (
              <div className="flex justify-between">
                <div>
                  <span className="font-bold text-slate-800">{data.educationCollege}</span>
                  {data.educationCourse && (
                    <span className="text-slate-600 ml-1">— {data.educationCourse}</span>
                  )}
                </div>
                <span className="text-slate-500 font-mono">College</span>
              </div>
            )}
            {data.educationSecondary && (
              <div className="flex justify-between">
                <span className="text-slate-800 font-medium">{data.educationSecondary}</span>
                <span className="text-slate-500 font-mono">High School</span>
              </div>
            )}
            {data.educationElementary && (
              <div className="flex justify-between">
                <span className="text-slate-800 font-medium">{data.educationElementary}</span>
                <span className="text-slate-500 font-mono">Elementary</span>
              </div>
            )}
          </div>
        </div>

        {/* Personal Data */}
        <div className="mb-4">
          <h2 className="text-xs font-bold text-blue-950 uppercase tracking-wider border-b border-slate-200 pb-1 mb-2">
            Personal Details
          </h2>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[11px]">
            {data.birthDate && (
              <div>
                <span className="font-semibold text-slate-600">Date of Birth:</span>{' '}
                <span className="text-slate-900">{data.birthDate}</span>
              </div>
            )}
            {data.civilStatus && (
              <div>
                <span className="font-semibold text-slate-600">Civil Status:</span>{' '}
                <span className="text-slate-900">{data.civilStatus}</span>
              </div>
            )}
            {data.citizenship && (
              <div>
                <span className="font-semibold text-slate-600">Citizenship:</span>{' '}
                <span className="text-slate-900">{data.citizenship}</span>
              </div>
            )}
            {data.religion && (
              <div>
                <span className="font-semibold text-slate-600">Religion:</span>{' '}
                <span className="text-slate-900">{data.religion}</span>
              </div>
            )}
          </div>
        </div>

        {/* Skills */}
        {data.skills && (
          <div>
            <h2 className="text-xs font-bold text-blue-950 uppercase tracking-wider border-b border-slate-200 pb-1 mb-2">
              Skills & Qualifications
            </h2>
            <p className="text-[11px] text-slate-700 leading-relaxed">{data.skills}</p>
          </div>
        )}
      </div>
    );
  }

  if (templateType === 'id_badge') {
    return (
      <div className="w-full flex justify-center py-4">
        {/* Standard PVC ID Card Size: 85.6 x 54 mm scaled up */}
        <div className="w-[320px] bg-gradient-to-b from-blue-700 to-blue-950 text-white p-5 rounded-2xl shadow-xl flex flex-col items-center text-center">
          <div className="w-full flex items-center justify-between border-b border-white/20 pb-2 mb-3">
            <span className="text-[11px] font-black tracking-widest uppercase">PRINT SHOP ID</span>
            <span className="text-[10px] bg-white/20 px-1.5 py-0.5 rounded font-mono">STAFF / MEMBER</span>
          </div>

          <div className="w-28 h-28 rounded-full border-4 border-white overflow-hidden bg-white/10 shadow-md my-2">
            {data.photoUrl ? (
              <img src={data.photoUrl} alt="ID Photo" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-white/50">
                <User className="w-12 h-12" />
              </div>
            )}
          </div>

          <h2 className="text-base font-bold tracking-tight text-white uppercase mt-2">
            {data.fullName || 'CUSTOMER NAME'}
          </h2>
          <p className="text-xs text-blue-200 font-medium">
            {data.positionOrTitle || 'ID Holder'}
          </p>

          <div className="w-full bg-white/10 rounded-lg p-2.5 mt-4 text-[10px] text-left space-y-1">
            <div className="flex justify-between">
              <span className="text-white/60">ID Number:</span>
              <span className="font-mono font-bold">{data.tinOrIdNumber || 'ID-2026-0042'}</span>
            </div>
            {data.contactNumber && (
              <div className="flex justify-between">
                <span className="text-white/60">Contact:</span>
                <span>{data.contactNumber}</span>
              </div>
            )}
            {data.birthDate && (
              <div className="flex justify-between">
                <span className="text-white/60">Birth Date:</span>
                <span>{data.birthDate}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Default: BIO-DATA / Personal Data Sheet
  return (
    <div className="w-full bg-white border border-slate-300 p-6 sm:p-8 shadow-lg rounded-sm text-slate-900 text-xs min-h-[580px]">
      {/* Title & Photo Header */}
      <div className="flex items-start justify-between border-b-2 border-slate-900 pb-4 mb-4">
        <div>
          <h1 className="text-2xl font-black tracking-wider text-slate-900 uppercase">
            BIO-DATA
          </h1>
          <p className="text-[11px] font-bold text-slate-600 tracking-wide">
            PERSONAL DATA SHEET
          </p>
        </div>

        {/* 2x2 Photo Box */}
        <div className="w-24 h-24 border-2 border-slate-400 bg-slate-50 flex flex-col items-center justify-center overflow-hidden shrink-0">
          {data.photoUrl ? (
            <img src={data.photoUrl} alt="Photo" className="w-full h-full object-cover" />
          ) : (
            <div className="text-center p-1 text-slate-400">
              <User className="w-6 h-6 mx-auto mb-0.5" />
              <span className="text-[8px] font-bold uppercase block">PHOTO 2×2</span>
            </div>
          )}
        </div>
      </div>

      {/* Personal Info Grid */}
      <div className="mb-4">
        <h2 className="text-[11px] font-bold bg-slate-200 px-2 py-1 text-slate-900 uppercase tracking-wide mb-2">
          Personal Information
        </h2>
        <table className="w-full border-collapse text-[11px]">
          <tbody>
            <tr className="border-b border-slate-200">
              <td className="py-1 font-bold text-slate-700 w-1/4">Full Name:</td>
              <td className="py-1 text-slate-900 font-semibold w-1/4 uppercase">
                {data.fullName || '—'}
              </td>
              <td className="py-1 font-bold text-slate-700 w-1/4">Position Desired:</td>
              <td className="py-1 text-slate-900 w-1/4">{data.positionOrTitle || '—'}</td>
            </tr>
            <tr className="border-b border-slate-200">
              <td className="py-1 font-bold text-slate-700">Present Address:</td>
              <td className="py-1 text-slate-900" colSpan={3}>
                {data.address || '—'}
              </td>
            </tr>
            <tr className="border-b border-slate-200">
              <td className="py-1 font-bold text-slate-700">Date of Birth:</td>
              <td className="py-1 text-slate-900">{data.birthDate || '—'}</td>
              <td className="py-1 font-bold text-slate-700">Place of Birth:</td>
              <td className="py-1 text-slate-900">{data.birthPlace || '—'}</td>
            </tr>
            <tr className="border-b border-slate-200">
              <td className="py-1 font-bold text-slate-700">Gender / Sex:</td>
              <td className="py-1 text-slate-900">{data.gender || '—'}</td>
              <td className="py-1 font-bold text-slate-700">Civil Status:</td>
              <td className="py-1 text-slate-900">{data.civilStatus || '—'}</td>
            </tr>
            <tr className="border-b border-slate-200">
              <td className="py-1 font-bold text-slate-700">Citizenship:</td>
              <td className="py-1 text-slate-900">{data.citizenship || '—'}</td>
              <td className="py-1 font-bold text-slate-700">Religion:</td>
              <td className="py-1 text-slate-900">{data.religion || '—'}</td>
            </tr>
            <tr className="border-b border-slate-200">
              <td className="py-1 font-bold text-slate-700">Contact Number:</td>
              <td className="py-1 text-slate-900">{data.contactNumber || '—'}</td>
              <td className="py-1 font-bold text-slate-700">Email:</td>
              <td className="py-1 text-slate-900">{data.email || '—'}</td>
            </tr>
            <tr className="border-b border-slate-200">
              <td className="py-1 font-bold text-slate-700">TIN / ID No.:</td>
              <td className="py-1 text-slate-900">{data.tinOrIdNumber || '—'}</td>
              <td className="py-1 font-bold text-slate-700">SSS Number:</td>
              <td className="py-1 text-slate-900">{data.sssNumber || '—'}</td>
            </tr>
            <tr>
              <td className="py-1 font-bold text-slate-700">Father's Name:</td>
              <td className="py-1 text-slate-900">{data.fatherName || '—'}</td>
              <td className="py-1 font-bold text-slate-700">Mother's Name:</td>
              <td className="py-1 text-slate-900">{data.motherName || '—'}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Educational Background */}
      <div>
        <h2 className="text-[11px] font-bold bg-slate-200 px-2 py-1 text-slate-900 uppercase tracking-wide mb-2">
          Educational Background
        </h2>
        <table className="w-full border-collapse border border-slate-300 text-[11px]">
          <thead>
            <tr className="bg-slate-100 border-b border-slate-300 text-left">
              <th className="p-1.5 border-r border-slate-300 w-1/3">Level</th>
              <th className="p-1.5">Name of School & Degree</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-slate-200">
              <td className="p-1.5 font-semibold text-slate-700 border-r border-slate-300">
                College / Tertiary
              </td>
              <td className="p-1.5 text-slate-900">
                {data.educationCollege || '—'}{' '}
                {data.educationCourse ? `(${data.educationCourse})` : ''}
              </td>
            </tr>
            <tr className="border-b border-slate-200">
              <td className="p-1.5 font-semibold text-slate-700 border-r border-slate-300">
                Secondary / High School
              </td>
              <td className="p-1.5 text-slate-900">{data.educationSecondary || '—'}</td>
            </tr>
            <tr>
              <td className="p-1.5 font-semibold text-slate-700 border-r border-slate-300">
                Elementary
              </td>
              <td className="p-1.5 text-slate-900">{data.educationElementary || '—'}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Signature line */}
      <div className="flex justify-end pt-8 mt-6">
        <div className="text-center w-52">
          <div className="border-b border-slate-800 mb-1" />
          <span className="text-[10px] font-bold text-slate-800 uppercase block">
            {data.fullName || "Applicant's Signature"}
          </span>
        </div>
      </div>
    </div>
  );
}
