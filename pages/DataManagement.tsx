
import React, { useState } from 'react';
import { ArrowLeft, Download, Upload, Loader2, CheckCircle2, FileSpreadsheet, Table } from 'lucide-react';
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

  const handleExportExcel = async () => {
    if (!madrasah) return;
    setLoading(true);
    try {
      const { data: students } = await supabase.from('students').select('*, classes(class_name)').eq('madrasah_id', madrasah.id);
      if (!students) return;
      const excelData = students.map(s => ({ 'Class': (s as any).classes?.class_name, 'Roll': s.roll, 'Name': s.student_name, 'Phone': s.guardian_phone }));
      const ws = XLSX.utils.json_to_sheet(excelData);
      const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, "Students");
      XLSX.writeFile(wb, `${madrasah.name}_students.xlsx`);
      setStatus({ type: 'success', message: 'Downloaded Successfully' });
    } catch (err) { setStatus({ type: 'error', message: 'Failed' }); } finally { setLoading(false); }
  };

  return (
    <div className="space-y-8 animate-in slide-in-from-bottom-5 duration-500 pb-24">
      <div className="flex items-center gap-5 px-2">
        <button onClick={onBack} className="w-14 h-14 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center text-white active:scale-90 transition-all border border-white/20 shadow-xl">
          <ArrowLeft size={28} strokeWidth={3} />
        </button>
        <h1 className="text-2xl font-black text-white font-noto drop-shadow-md">ডাটা ম্যানেজমেন্ট</h1>
      </div>

      <div className="grid grid-cols-1 gap-8">
        <div className="bg-white/95 backdrop-blur-xl rounded-[3rem] border border-white p-10 shadow-2xl relative overflow-hidden group">
          <div className="flex items-center gap-6 mb-10">
            <div className="w-16 h-16 bg-[#8D30F4]/10 rounded-[1.5rem] flex items-center justify-center text-[#8D30F4] border border-[#8D30F4]/10 shadow-inner">
              <Download size={32} />
            </div>
            <div>
              <h3 className="text-2xl font-black text-[#2E0B5E] font-noto leading-tight">ডাটা এক্সপোর্ট</h3>
              <p className="text-[11px] font-black text-[#A179FF] uppercase tracking-widest mt-1.5">Download Student List</p>
            </div>
          </div>
          <button onClick={handleExportExcel} disabled={loading} className="w-full py-6 premium-btn text-white font-black rounded-[2rem] shadow-2xl active:scale-95 transition-all flex items-center justify-center gap-4 text-xl">
            {loading ? <Loader2 className="animate-spin" size={28} /> : <><FileSpreadsheet size={28} /> Excel Export</>}
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
          <div className="w-full py-16 bg-[#F2EBFF] border-4 border-dashed border-[#8D30F4]/20 rounded-[2.5rem] text-[#8D30F4] font-black text-sm flex flex-col items-center justify-center gap-5 active:scale-[0.98] transition-all">
            <FileSpreadsheet size={50} className="opacity-50" />
            <span className="font-noto text-lg">এক্সেল ফাইল সিলেক্ট করুন</span>
          </div>
        </div>
      </div>

      <div className="bg-white/90 p-8 rounded-[3rem] border border-white shadow-xl space-y-5">
        <div className="flex items-center gap-4 text-[#2E0B5E]">
          <Table size={24} />
          <h3 className="text-lg font-black font-noto">এক্সেল ফরম্যাট গাইড</h3>
        </div>
        <div className="grid grid-cols-2 gap-3">
           <div className="bg-[#F2EBFF] p-4 rounded-2xl text-center"><p className="text-[10px] font-black text-slate-400 uppercase mb-1">Column A</p><p className="font-black text-[#8D30F4]">শ্রেণি</p></div>
           <div className="bg-[#F2EBFF] p-4 rounded-2xl text-center"><p className="text-[10px] font-black text-slate-400 uppercase mb-1">Column B</p><p className="font-black text-[#8D30F4]">রোল</p></div>
           <div className="bg-[#F2EBFF] p-4 rounded-2xl text-center"><p className="text-[10px] font-black text-slate-400 uppercase mb-1">Column C</p><p className="font-black text-[#8D30F4]">ছাত্রের নাম</p></div>
           <div className="bg-[#F2EBFF] p-4 rounded-2xl text-center"><p className="text-[10px] font-black text-slate-400 uppercase mb-1">Column D</p><p className="font-black text-[#8D30F4]">মোবাইল</p></div>
        </div>
      </div>
    </div>
  );
};

export default DataManagement;
