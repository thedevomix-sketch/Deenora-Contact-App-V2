import React, { useState, useRef } from 'react';
import { ArrowLeft, Download, Upload, Loader2, CheckCircle2, FileSpreadsheet, Table, X, AlertTriangle, FileUp, Share2 } from 'lucide-react';
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
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<{ type: 'success' | 'error' | 'idle', message: string }>({ type: 'idle', message: '' });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExportExcel = async () => {
    if (!madrasah) return;
    setLoading(true);
    setStatus({ type: 'idle', message: '' });
    
    try {
      const { data: students, error: fetchError } = await supabase
        .from('students')
        .select('*, classes(class_name)')
        .eq('madrasah_id', madrasah.id);
        
      if (fetchError) throw fetchError;
      if (!students || students.length === 0) {
        throw new Error(lang === 'bn' ? "কোনো ছাত্রের তথ্য পাওয়া যায়নি" : "No student data found");
      }
      
      const excelData = students.map(s => ({ 
        'Class': (s as any).classes?.class_name || 'N/A', 
        'Roll': s.roll || '', 
        'Student Name': s.student_name, 
        'Guardian Name': s.guardian_name || '',
        'Guardian Phone': s.guardian_phone,
        'Guardian Phone 2': s.guardian_phone_2 || ''
      }));
      
      const ws = XLSX.utils.json_to_sheet(excelData);
      const wb = XLSX.utils.book_new(); 
      XLSX.utils.book_append_sheet(wb, ws, "Students");
      
      // Generate Excel as binary array
      const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      const fileName = `${madrasah.name.replace(/\s+/g, '_')}_students.xlsx`;
      const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

      // MOBILE FIX: Check if Web Share API is available for better Android Support
      const file = new File([blob], fileName, { type: blob.type });
      
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({
            files: [file],
            title: lang === 'bn' ? 'ছাত্র তালিকা' : 'Student List',
            text: lang === 'bn' ? `${madrasah.name} এর ছাত্র তালিকা` : `Student list of ${madrasah.name}`
          });
          setStatus({ type: 'success', message: lang === 'bn' ? 'সফলভাবে শেয়ার করা হয়েছে' : 'Shared Successfully' });
        } catch (shareError: any) {
          // If user cancels sharing, we don't necessarily treat it as an error
          if (shareError.name !== 'AbortError') {
            throw shareError;
          }
        }
      } else {
        // Fallback for Desktop or browsers that don't support file sharing
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        setStatus({ type: 'success', message: lang === 'bn' ? 'সফলভাবে ডাউনলোড হয়েছে' : 'Downloaded Successfully' });
      }
    } catch (err: any) { 
      setStatus({ type: 'error', message: err.message }); 
    } finally { 
      setLoading(false); 
      setTimeout(() => setStatus({ type: 'idle', message: '' }), 4000);
    }
  };

  const handleImportExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !madrasah) return;

    setLoading(true);
    setStatus({ type: 'idle', message: '' });
    setProgress(0);

    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const data = event.target?.result;
          const workbook = XLSX.read(data, { type: 'binary' });
          const sheetName = workbook.SheetNames[0];
          const sheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 'A' }) as any[];

          const rows = jsonData.slice(1);
          if (rows.length === 0) throw new Error("File is empty");

          let successCount = 0;
          let total = rows.length;

          for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            const className = String(row.A || '').trim();
            const roll = parseInt(row.B) || null;
            const studentName = String(row.C || '').trim();
            const guardianName = String(row.D || '').trim();
            const phone = String(row.E || '').trim();
            const phone2 = String(row.F || '').trim();

            if (!studentName || !phone || !className) continue;

            let classId = '';
            const { data: existingClass } = await supabase
              .from('classes')
              .select('id')
              .eq('madrasah_id', madrasah.id)
              .eq('class_name', className)
              .maybeSingle();

            if (existingClass) {
              classId = existingClass.id;
            } else {
              const { data: newClass, error: classError } = await supabase
                .from('classes')
                .insert({ madrasah_id: madrasah.id, class_name: className })
                .select('id')
                .single();
              if (classError) continue;
              classId = newClass.id;
            }

            const { error: studentError } = await supabase
              .from('students')
              .insert({
                madrasah_id: madrasah.id,
                class_id: classId,
                student_name: studentName,
                roll: roll,
                guardian_name: guardianName || null,
                guardian_phone: phone,
                guardian_phone_2: phone2 || null
              });

            if (!studentError) successCount++;
            setProgress(Math.round(((i + 1) / total) * 100));
          }

          setStatus({ 
            type: 'success', 
            message: lang === 'bn' ? `${successCount} জন ছাত্র সফলভাবে আপলোড হয়েছে` : `${successCount} students imported successfully` 
          });
          triggerRefresh();
        } catch (err: any) {
          setStatus({ type: 'error', message: err.message });
        } finally {
          setLoading(false);
          if (fileInputRef.current) fileInputRef.current.value = '';
        }
      };
      reader.readAsBinaryString(file);
    } catch (err: any) {
      setLoading(false);
      setStatus({ type: 'error', message: err.message });
    }
  };

  return (
    <div className="space-y-8 animate-in slide-in-from-bottom-5 duration-500 pb-24">
      <div className="flex items-center gap-5 px-2">
        <button onClick={onBack} className="w-14 h-14 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center text-white active:scale-90 transition-all border border-white/20 shadow-xl">
          <ArrowLeft size={28} strokeWidth={3} />
        </button>
        <h1 className="text-2xl font-black text-white font-noto drop-shadow-md">ডাটা ম্যানেজমেন্ট</h1>
      </div>

      {status.message && (
        <div className={`p-6 rounded-3xl border-2 flex items-center gap-4 animate-in slide-in-from-top-4 ${status.type === 'success' ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700'}`}>
           {status.type === 'success' ? <CheckCircle2 size={30} /> : <AlertTriangle size={30} />}
           <p className="font-black text-sm">{status.message}</p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-8">
        <div className="bg-white/95 backdrop-blur-xl rounded-[3rem] border border-white p-10 shadow-2xl relative overflow-hidden group">
          <div className="flex items-center gap-6 mb-10">
            <div className="w-16 h-16 bg-[#8D30F4]/10 rounded-[1.5rem] flex items-center justify-center text-[#8D30F4] border border-[#8D30F4]/10 shadow-inner">
              <Download size={32} />
            </div>
            <div>
              <h3 className="text-2xl font-black text-[#2E0B5E] font-noto leading-tight">ডাটা এক্সপোর্ট</h3>
              <p className="text-[11px] font-black text-[#A179FF] uppercase tracking-widest mt-1.5">Save Student List</p>
            </div>
          </div>
          <button onClick={handleExportExcel} disabled={loading} className="w-full py-6 premium-btn text-white font-black rounded-[2rem] shadow-2xl active:scale-95 transition-all flex items-center justify-center gap-4 text-xl disabled:opacity-50">
            {loading ? <Loader2 className="animate-spin" size={28} /> : (
              <><Share2 size={28} /> {lang === 'bn' ? 'এক্সেল এক্সপোর্ট' : 'Excel Export'}</>
            )}
          </button>
        </div>

        <div className="bg-white/95 backdrop-blur-xl rounded-[3rem] border border-white p-10 shadow-2xl relative overflow-hidden group">
          <div className="flex items-center gap-6 mb-8">
            <div className="w-16 h-16 bg-[#8D30F4]/10 rounded-[1.5rem] flex items-center justify-center text-[#8D30F4] border border-[#8D30F4]/10 shadow-inner">
              <Upload size={32} />
            </div>
            <div>
              <h3 className="text-2xl font-black text-[#2E0B5E] font-noto leading-tight">ডাটা আপলোড</h3>
              <p className="text-[11px] font-black text-[#A179FF] uppercase tracking-widest mt-1.5">Select Excel File</p>
            </div>
          </div>
          
          <input type="file" ref={fileInputRef} className="hidden" accept=".xlsx, .xls, .csv" onChange={handleImportExcel} />
          
          <div 
            onClick={() => !loading && fileInputRef.current?.click()} 
            className={`w-full py-12 bg-[#F2EBFF] border-4 border-dashed rounded-[2.5rem] text-[#8D30F4] font-black text-sm flex flex-col items-center justify-center gap-5 transition-all cursor-pointer ${loading ? 'opacity-70 cursor-wait border-[#8D30F4]/40' : 'border-[#8D30F4]/20 active:scale-[0.98] hover:bg-[#8D30F4]/5'}`}
          >
            {loading ? (
              <>
                <div className="relative w-20 h-20">
                   <Loader2 size={80} className="animate-spin absolute inset-0 opacity-20" />
                   <div className="absolute inset-0 flex items-center justify-center text-xl font-black">{progress}%</div>
                </div>
                <span className="font-noto text-lg">আপলোড হচ্ছে, দয়া করে অপেক্ষা করুন...</span>
              </>
            ) : (
              <>
                <FileUp size={60} className="opacity-50" />
                <span className="font-noto text-lg">এক্সেল ফাইল সিলেক্ট করুন</span>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white/90 p-8 rounded-[3rem] border border-white shadow-xl space-y-5">
        <div className="flex items-center gap-4 text-[#2E0B5E]">
          <Table size={24} />
          <h3 className="text-lg font-black font-noto">এক্সেল ফরম্যাট গাইড</h3>
        </div>
        <p className="text-xs font-bold text-slate-400 leading-relaxed px-1">আপনার এক্সেল ফাইলটি নিচের ৬টি কলামের ফরম্যাটে হতে হবে:</p>
        <div className="grid grid-cols-2 gap-3">
           <div className="bg-[#F2EBFF] p-4 rounded-2xl text-center"><p className="text-[10px] font-black text-slate-400 uppercase mb-1">Col A</p><p className="font-black text-[#8D30F4]">Class</p></div>
           <div className="bg-[#F2EBFF] p-4 rounded-2xl text-center"><p className="text-[10px] font-black text-slate-400 uppercase mb-1">Col B</p><p className="font-black text-[#8D30F4]">Roll</p></div>
           <div className="bg-[#F2EBFF] p-4 rounded-2xl text-center"><p className="text-[10px] font-black text-slate-400 uppercase mb-1">Col C</p><p className="font-black text-[#8D30F4]">Student Name</p></div>
           <div className="bg-[#F2EBFF] p-4 rounded-2xl text-center"><p className="text-[10px] font-black text-slate-400 uppercase mb-1">Col D</p><p className="font-black text-[#8D30F4]">Guardian Name</p></div>
           <div className="bg-[#F2EBFF] p-4 rounded-2xl text-center"><p className="text-[10px] font-black text-slate-400 uppercase mb-1">Col E</p><p className="font-black text-[#8D30F4]">Phone 1</p></div>
           <div className="bg-[#F2EBFF] p-4 rounded-2xl text-center"><p className="text-[10px] font-black text-slate-400 uppercase mb-1">Col F</p><p className="font-black text-[#8D30F4]">Phone 2</p></div>
        </div>
      </div>
    </div>
  );
};

export default DataManagement;
