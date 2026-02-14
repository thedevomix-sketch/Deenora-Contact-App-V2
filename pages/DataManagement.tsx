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
      throw new Error(lang === 'bn'
        ? "কোনো ছাত্রের তথ্য পাওয়া যায়নি"
        : "No student data found");
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

    const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const fileName = `${madrasah.name.replace(/\s+/g, '_')}_students.xlsx`;

    const blob = new Blob([excelBuffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });

    // Upload to Supabase Storage
    const filePath = `exports/${Date.now()}_${fileName}`;

    const { data, error } = await supabase.storage
      .from('exports')
      .upload(filePath, blob, {
        contentType:
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });

    if (error) throw error;

    // Get Public URL
    const { data: publicUrlData } = supabase
      .storage
      .from('exports')
      .getPublicUrl(data.path);

    // 🔥 THIS IS THE KEY LINE (Android will detect)
    window.location.href = publicUrlData.publicUrl;

    setStatus({
      type: 'success',
      message: lang === 'bn'
        ? 'সফলভাবে ডাউনলোড হচ্ছে'
        : 'Download started'
    });

  } catch (err: any) {
    setStatus({ type: 'error', message: err.message });
  } finally {
    setLoading(false);
    setTimeout(() =>
      setStatus({ type: 'idle', message: '' }), 4000);
  }
};
