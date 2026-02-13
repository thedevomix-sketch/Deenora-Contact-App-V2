
import React, { useState } from 'react';
import { ArrowLeft, Download, Upload, Loader2, Database, AlertCircle, CheckCircle2, FileJson, FileSpreadsheet, Info } from 'lucide-react';
import { supabase } from '../supabase';
import { Madrasah, Language } from '../types';
import * as XLSX from 'xlsx';

interface DataManagementProps {
  lang: Language;
  madrasah: Madrasah | null;
  onBack: () => void;
  triggerRefresh: () => void;
}

const DataManagement: React.FC<DataManagementProps> = ({ lang, madrasah, onBack, triggerRefresh }) => {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error' | 'idle', message: string }>({ type: 'idle', message: '' });
  const [importPreview, setImportPreview] = useState<{ classes: any[], students: any[] } | null>(null);

  const handleExportExcel = async () => {
    if (!madrasah) return;
    setLoading(true);
    setStatus({ type: 'idle', message: '' });

    try {
      const { data: students } = await supabase
        .from('students')
        .select('*, classes(class_name)')
        .eq('madrasah_id', madrasah.id)
        .order('class_id')
        .order('roll', { ascending: true });

      if (!students || students.length === 0) {
        throw new Error(lang === 'bn' ? 'কোনো ছাত্রের ডাটা পাওয়া যায়নি' : 'No student data found');
      }

      const excelData = students.map(s => ({
        'Class': (s as any).classes?.class_name || '',
        'Roll': s.roll || '',
        'Student Name': s.student_name || '',
        'Guardian Name': s.guardian_name || '',
        'Guardian Phone': s.guardian_phone || '',
        'Guardian Phone 2': s.guardian_phone_2 || ''
      }));

      const worksheet = XLSX.utils.json_to_sheet(excelData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Students");
      XLSX.writeFile(workbook, `${madrasah.name}_students_${new Date().toISOString().split('T')[0]}.xlsx`);

      setStatus({ type: 'success', message: lang === 'bn' ? 'এক্সেল ফাইল ডাউনলোড শুরু হয়েছে' : 'Excel file download started' });
    } catch (err: any) {
      setStatus({ type: 'error', message: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    try {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const data = new Uint8Array(event.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          const rows = XLSX.utils.sheet_to_json(worksheet) as any[];

          if (rows.length === 0) throw new Error('File is empty');

          const classesMap = new Map();
          const processedStudents: any[] = [];
          const localFingerprints = new Set(); // Internal file duplicate check

          rows.forEach((row, idx) => {
            const className = (row['Class'] || row['class'] || row['শ্রেণি'] || 'General').toString().trim();
            let roll = parseInt(row['Roll'] || row['roll'] || row['রোল'] || '0');
            if (isNaN(roll)) roll = 0;
            
            const studentName = (row['Student Name'] || row['Name'] || row['ছাত্রের নাম'] || row['name'] || '').toString().trim();
            const phone = (row['Guardian Phone'] || row['Phone'] || row['মোবাইল'] || row['phone'] || '').toString().trim();
            
            if (!studentName || !phone) return; // Skip empty rows

            // Local duplicate check within the file (Class + Roll OR Class + Name + Phone)
            const fingerprint = `${className}_${roll}_${studentName}_${phone}`;
            if (localFingerprints.has(fingerprint)) return;
            localFingerprints.add(fingerprint);

            if (!classesMap.has(className)) {
              classesMap.set(className, { id: `temp_cls_${className}`, class_name: className });
            }

            processedStudents.push({
              id: `temp_std_${idx}`,
              student_name: studentName,
              guardian_name: (row['Guardian Name'] || row['Father'] || row['অভিভাবক'] || '').toString().trim(),
              roll: roll || null,
              guardian_phone: phone,
              guardian_phone_2: (row['Guardian Phone 2'] || row['Phone 2'] || '').toString().trim(),
              class_id: classesMap.get(className).id
            });
          });

          setImportPreview({
            classes: Array.from(classesMap.values()),
            students: processedStudents
          });
        } catch (err: any) {
          setStatus({ type: 'error', message: lang === 'bn' ? 'ফাইলটি পড়া সম্ভব হয়নি: ' + err.message : 'Error reading file: ' + err.message });
        } finally {
          setLoading(false);
        }
      };
      reader.readAsArrayBuffer(file);
    } catch (err) {
      setLoading(false);
      setStatus({ type: 'error', message: 'File processing error' });
    }
  };

  const handleImport = async () => {
    if (!madrasah || !importPreview) return;
    setLoading(true);
    setStatus({ type: 'idle', message: '' });

    try {
      // Step 0: Get existing students to prevent duplication
      const { data: existingStudents } = await supabase
        .from('students')
        .select('class_id, student_name, guardian_phone, roll')
        .eq('madrasah_id', madrasah.id);

      const existingFingerprints = new Set(
        existingStudents?.map(s => `${s.class_id}:${s.student_name.toLowerCase()}:${s.guardian_phone}`) || []
      );
      const existingRolls = new Set(
        existingStudents?.map(s => `${s.class_id}:${s.roll}`) || []
      );

      const classIdMap: Record<string, string> = {};
      
      // Step 1: Sync Classes
      for (const cls of importPreview.classes) {
        const { data: existing } = await supabase
          .from('classes')
          .select('id')
          .eq('madrasah_id', madrasah.id)
          .eq('class_name', cls.class_name)
          .maybeSingle();

        if (existing) {
          classIdMap[cls.id] = existing.id;
        } else {
          const { data: newCls, error: insertError } = await supabase
            .from('classes')
            .insert({ class_name: cls.class_name, madrasah_id: madrasah.id })
            .select().single();
          if (insertError) throw insertError;
          classIdMap[cls.id] = newCls.id;
        }
      }

      // Step 2: Sync Students with Duplicate Detection
      let importedCount = 0;
      let skippedCount = 0;

      for (const s of importPreview.students) {
        const actualClassId = classIdMap[s.class_id];
        if (!actualClassId) continue;

        // CHECK 1: Same Name + Same Phone in Same Class
        const studentFingerprint = `${actualClassId}:${s.student_name.toLowerCase()}:${s.guardian_phone}`;
        // CHECK 2: Same Roll in Same Class
        const rollFingerprint = s.roll ? `${actualClassId}:${s.roll}` : null;

        if (existingFingerprints.has(studentFingerprint) || (rollFingerprint && existingRolls.has(rollFingerprint))) {
          skippedCount++;
          continue;
        }

        const { error: studentError } = await supabase.from('students').insert({
          student_name: s.student_name,
          guardian_name: s.guardian_name,
          roll: s.roll,
          guardian_phone: s.guardian_phone,
          guardian_phone_2: s.guardian_phone_2 || null,
          class_id: actualClassId,
          madrasah_id: madrasah.id
        });

        if (studentError) {
          if (studentError.code === '23505') { // DB Level Unique Constraint
            skippedCount++;
            continue;
          }
          throw studentError;
        }
        importedCount++;
      }

      setStatus({ 
        type: 'success', 
        message: lang === 'bn' 
          ? `সম্পন্ন হয়েছে! ${importedCount} জন নতুন ছাত্র যোগ করা হয়েছে। (${skippedCount} জন আগে থেকেই ছিল)` 
          : `Done! ${importedCount} new students added. (${skippedCount} duplicates skipped)` 
      });
      setImportPreview(null);
      triggerRefresh();
    } catch (err: any) {
      setStatus({ type: 'error', message: 'Import failed: ' + err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleExportJSON = async () => {
    if (!madrasah) return;
    setLoading(true);
    try {
      const { data: classes } = await supabase.from('classes').select('*').eq('madrasah_id', madrasah.id);
      const { data: students } = await supabase.from('students').select('*').eq('madrasah_id', madrasah.id);
      const backupData = {
        madrasah_name: madrasah.name,
        export_date: new Date().toISOString(),
        data: { classes: classes || [], students: students || [] }
      };
      const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `madrasah_backup_${new Date().toISOString().split('T')[0]}.json`;
      link.click();
      setStatus({ type: 'success', message: lang === 'bn' ? 'JSON ব্যাকআপ তৈরি হয়েছে' : 'JSON Backup created' });
    } catch (err) {
      setStatus({ type: 'error', message: 'Export failed' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500 pb-20">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="p-2.5 bg-white/10 rounded-xl text-white active:scale-90 transition-all border border-white/20 backdrop-blur-md">
          <ArrowLeft size={22} strokeWidth={2.5} />
        </button>
        <h1 className="text-xl font-black text-white font-noto">
          {lang === 'bn' ? 'ডাটা ম্যানেজমেন্ট' : 'Data Management'}
        </h1>
      </div>

      <div className="grid grid-cols-1 gap-6">
        <div className="bg-white/15 backdrop-blur-2xl rounded-[2.5rem] border border-white/20 p-8 shadow-xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
            <Download size={80} strokeWidth={1} />
          </div>
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center text-white">
              <Download size={24} />
            </div>
            <div className="text-left">
              <h3 className="text-lg font-black text-white">{lang === 'bn' ? 'ডাটা এক্সপোর্ট' : 'Export Data'}</h3>
              <p className="text-[10px] font-bold text-white/50 uppercase tracking-widest">{lang === 'bn' ? 'ফাইল ডাউনলোড করুন' : 'Download students file'}</p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button onClick={handleExportExcel} disabled={loading} className="flex-1 py-4 bg-white text-[#d35132] font-black rounded-2xl shadow-xl active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50">
              {loading ? <Loader2 className="animate-spin" size={20} /> : <><FileSpreadsheet size={20} /> Excel Export</>}
            </button>
            <button onClick={handleExportJSON} disabled={loading} className="flex-1 py-4 bg-white/10 border border-white/20 text-white font-black rounded-2xl shadow-xl active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50">
              JSON Backup
            </button>
          </div>
        </div>

        <div className="bg-white/15 backdrop-blur-2xl rounded-[2.5rem] border border-white/20 p-8 shadow-xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
            <Upload size={80} strokeWidth={1} />
          </div>
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center text-white">
              <Upload size={24} />
            </div>
            <div className="text-left">
              <h3 className="text-lg font-black text-white">{lang === 'bn' ? 'ডাটা আপলোড' : 'Upload Data'}</h3>
              <p className="text-[10px] font-bold text-white/50 uppercase tracking-widest">{lang === 'bn' ? 'এক্সেল ফাইল সিলেক্ট করুন' : 'Select Excel File'}</p>
            </div>
          </div>
          
          {!importPreview ? (
            <div className="relative">
              <input type="file" accept=".xlsx, .xls, .csv" onChange={handleFileSelect} className="absolute inset-0 opacity-0 cursor-pointer z-10" />
              <div className="w-full py-10 bg-white/10 border-2 border-dashed border-white/30 rounded-2xl text-white/60 font-black text-xs flex flex-col items-center justify-center gap-3">
                <FileSpreadsheet size={32} />
                <span>{lang === 'bn' ? 'এক্সেল ফাইল (.xlsx) ড্রপ করুন' : 'Drop Excel (.xlsx) file'}</span>
              </div>
            </div>
          ) : (
            <div className="space-y-4 animate-in zoom-in-95">
              <div className="bg-white/5 p-4 rounded-2xl border border-white/10 text-center">
                 <p className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-1">Preview</p>
                 <div className="flex justify-center gap-6">
                    <div>
                      <span className="text-xl font-black text-white">{importPreview.classes.length}</span>
                      <p className="text-[9px] font-bold text-white/40 uppercase tracking-widest">Classes</p>
                    </div>
                    <div className="w-px h-8 bg-white/10 self-center"></div>
                    <div>
                      <span className="text-xl font-black text-white">{importPreview.students.length}</span>
                      <p className="text-[9px] font-bold text-white/40 uppercase tracking-widest">Students</p>
                    </div>
                 </div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setImportPreview(null)} className="flex-1 py-4 bg-white/10 text-white font-black rounded-2xl text-xs uppercase">বাতিল</button>
                <button onClick={handleImport} disabled={loading} className="flex-[2] py-4 bg-green-500 text-white font-black rounded-2xl shadow-xl active:scale-95 transition-all flex items-center justify-center gap-2">
                  {loading ? <Loader2 className="animate-spin" size={18} /> : <><CheckCircle2 size={18} /> ইমপোর্ট শুরু করুন</>}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {status.type !== 'idle' && (
        <div className={`p-5 rounded-3xl border animate-in slide-in-from-top-4 flex items-center gap-4 ${status.type === 'success' ? 'bg-green-500/20 border-green-500/30 text-green-400' : 'bg-red-500/20 border-red-500/30 text-red-400'}`}>
          {status.type === 'success' ? <CheckCircle2 size={24} /> : <AlertCircle size={24} />}
          <p className="text-sm font-black">{status.message}</p>
        </div>
      )}

      <div className="bg-white/5 rounded-3xl p-6 border border-white/10 space-y-4">
        <div className="flex items-center gap-3">
          <Info className="text-yellow-400/60 shrink-0" size={20} />
          <h4 className="text-[10px] font-black text-white/60 uppercase tracking-widest">কিভাবে ডুপ্লিকেট রোধ হয়?</h4>
        </div>
        <p className="text-[10px] text-white/40 font-medium leading-relaxed italic">
          সিস্টেম স্বয়ংক্রিয়ভাবে চেক করে যে একই ক্লাসে একই নামের এবং ফোন নম্বরের কোনো ছাত্র আগে থেকেই আছে কি না। এছাড়া একই রোল নম্বর থাকলেও সিস্টেম ডুপ্লিকেট হিসেবে চিহ্নিত করে তা বাদ দেয়। এতে আপনার ডাটাবেজ পরিষ্কার থাকে।
        </p>
      </div>
    </div>
  );
};

export default DataManagement;
