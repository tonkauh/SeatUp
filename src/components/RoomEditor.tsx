'use client'
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import dynamic from 'next/dynamic';

const ClassroomCanvas = dynamic(() => import('@/components/ClassroomCanvas'), { ssr: false });

export default function RoomEditor({ room, onDataChange }: { room: any, onDataChange: () => Promise<void> }) {
  const [bookings, setBookings] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'editor'>('dashboard');
  
  // แปลงเวลา ISO เป็น Format สำหรับ input datetime-local
  const getLocalDatetime = (isoString?: string) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  };
  const [startTime, setStartTime] = useState<string>(getLocalDatetime(room.start_time));

  // 1. ฟังก์ชันดึงข้อมูลผู้จอง
  const fetchBookings = async () => {
    const { data } = await supabase
      .from('bookings')
      .select('*')
      .eq('room_id', room.id)
      .order('created_at', { ascending: false });
    if (data) setBookings(data);
  };

  useEffect(() => {
    fetchBookings();
  }, [room.id]);

  // แก้ไขตรงนี้: ปรับ parameter ให้เป็น any หรือ any[] เพื่อรับค่าจาก Canvas
  const handleSave = async (updatedData: any) => {
    try {
      // ในโหมด Editor ค่าที่ส่งกลับมาควรเป็น Array ของโต๊ะ (Layout)
      const { error } = await supabase
        .from('rooms')
        .update({ layout_config: updatedData })
        .eq('id', room.id);

      if (error) throw error;
      alert('💾 บันทึกแผนผังห้องเรียนเรียบร้อยแล้ว!');
      await onDataChange(); // แจ้งให้ Parent component ดึงข้อมูลใหม่
    } catch (error: any) {
      alert('เกิดข้อผิดพลาด: ' + error.message);
    }
  };

  // ฟังก์ชันบันทึกเวลาเปิดจอง
  const handleSaveTime = async () => {
    try {
      const { error } = await supabase
        .from('rooms')
        .update({ start_time: startTime ? new Date(startTime).toISOString() : null })
        .eq('id', room.id);
      if (error) throw error;
      alert('⏱️ บันทึกเวลาเปิดจองสำเร็จ!');
      await onDataChange();
    } catch (error: any) {
      alert('เกิดข้อผิดพลาด: ' + error.message + '\n\n(อย่าลืมเพิ่มคอลัมน์ start_time ชนิด timestamptz ใน Supabase ด้วยนะครับ)');
    }
  };

  // 2. ฟังก์ชันยกเลิกการจองโดย Admin
  const handleDeleteBooking = async (bookingId: string) => {
    if (!confirm('ยืนยันที่จะยกเลิกการจองของโต๊ะนี้ใช่หรือไม่?')) return;
    
    const { error } = await supabase.from('bookings').delete().eq('id', bookingId);
    if (error) {
      alert('ลบไม่สำเร็จ: ' + error.message);
    } else {
      fetchBookings(); // อัปเดตตารางใหม่
    }
  };

  return (
    <div className="space-y-6">
      {/* เมนูสลับหน้า Dashboard / Editor */}
      <div className="flex p-1.5 bg-slate-200/60 backdrop-blur-md rounded-full w-fit mx-auto md:mx-0 border border-slate-200/50 shadow-inner">
        <button 
          onClick={() => setActiveTab('dashboard')} 
          className={`px-6 md:px-8 py-2.5 rounded-full font-bold transition-all duration-300 text-sm md:text-base ${activeTab === 'dashboard' ? 'bg-white text-indigo-700 shadow-md shadow-slate-300/50 scale-100' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-200/50'}`}
        >
          📊 Dashboard ผู้จอง
        </button>
        <button 
          onClick={() => setActiveTab('editor')} 
          className={`px-6 md:px-8 py-2.5 rounded-full font-bold transition-all duration-300 text-sm md:text-base ${activeTab === 'editor' ? 'bg-white text-indigo-700 shadow-md shadow-slate-300/50 scale-100' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-200/50'}`}
        >
          🛠️ จัดแผนผังโต๊ะ
        </button>
      </div>

      {activeTab === 'editor' ? (
        /* ส่วนที่ 1: Editor จัดวางโต๊ะ */
        <div className="bg-white md:p-8 rounded-none md:rounded-[2.5rem] shadow-none md:shadow-xl border-0 md:border border-indigo-100 animate-in fade-in duration-300 -mx-4 md:mx-0 flex flex-col h-[75vh] md:h-auto">
          <div className="flex justify-between items-center mb-4 md:mb-6 px-4 md:px-0 pt-4 md:pt-0">
            <h3 className="text-lg font-bold text-slate-800 uppercase tracking-widest">
              โหมดจัดวางโต๊ะเรียน
            </h3>
            <div className="text-xs bg-amber-100 text-amber-700 px-3 py-1 rounded-full font-bold">
              EDITOR MODE
            </div>
          </div>
  
          {/* กล่องตั้งเวลาเปิดจอง */}
          <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 mb-6 flex flex-col md:flex-row items-center gap-4 justify-between">
            <div className="flex-1 text-center md:text-left">
              <h4 className="font-bold text-slate-900 uppercase tracking-wide">⏱️ ตั้งเวลาเปิดจอง</h4>
              <p className="text-xs text-slate-500 mt-1">ตั้งเวลาเพื่อบังคับให้ระบบล็อกแผนผังจนกว่าจะถึงเวลาที่กำหนด</p>
            </div>
            <div className="flex w-full md:w-auto items-center gap-2">
              <input
                type="datetime-local"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="flex-1 p-2.5 rounded-lg border border-slate-300 text-sm outline-none focus:border-red-600 bg-white font-medium"
              />
              <button onClick={handleSaveTime} className="bg-slate-900 hover:bg-slate-800 text-white px-4 py-2.5 rounded-lg font-bold text-sm transition-colors uppercase tracking-wide">Save</button>
            </div>
          </div>

          <ClassroomCanvas 
            initialLayout={room.layout_config} 
            bookings={bookings} // ส่ง bookings ไปให้ Admin เห็นชื่อคนจองบนแผนผังด้วย
            onSave={handleSave} 
            isReadOnly={false}  
          />
          
          <div className="mt-2 md:mt-6 text-center text-slate-400 text-xs md:text-sm pb-4 md:pb-0">
            * ลากวางโต๊ะเพื่อจัดตำแหน่งตามต้องการ (กดบันทึกโดยใช้ปุ่มบนแผนผังหากมี) *
          </div>
        </div>
      ) : (
        /* ส่วนที่ 2: Dashboard แสดงรายชื่อผู้จอง */
        <div className="space-y-4 md:space-y-6">
          <div className="bg-white md:p-6 rounded-none md:rounded-2xl border-0 md:border border-slate-200 animate-in fade-in duration-300 -mx-4 md:mx-0 h-[50vh] md:h-auto flex flex-col">
            <h3 className="text-lg font-black text-slate-900 uppercase tracking-wide mb-4 px-4 md:px-0 pt-4 md:pt-0">ภาพรวมแผนผัง</h3>
            <ClassroomCanvas 
              initialLayout={room.layout_config} 
              bookings={bookings}
              onSave={() => {}} // Read-only, no action on save
              isReadOnly={true}  
            />
          </div>
          <div className="bg-white p-4 md:p-6 rounded-2xl border border-slate-200 animate-in fade-in duration-300">
            <div className="flex justify-between items-center mb-4 md:mb-6">
              <div>
                <h3 className="text-lg font-black text-slate-900 uppercase tracking-wide mb-1">รายชื่อผู้จอง</h3>
                <p className="text-sm text-slate-500">ที่นั่งถูกจองแล้ว {bookings.length} / {room.layout_config?.length || 0} โต๊ะ</p>
              </div>
              <button onClick={fetchBookings} className="text-sm bg-white text-slate-700 px-4 py-2 rounded-lg font-bold hover:bg-slate-50 transition-colors border border-slate-200 shadow-sm uppercase">
                🔄 รีเฟรชข้อมูล
              </button>
            </div>
    
            {bookings.length === 0 ? (
              <div className="bg-slate-50 rounded-2xl p-10 text-center text-slate-400 font-bold">ยังไม่มีผู้จองที่นั่งในขณะนี้</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b-2 border-slate-100 text-slate-400 text-sm uppercase tracking-wider">
                      <th className="p-4 font-bold">เวลาที่จอง</th>
                      <th className="p-4 font-bold">หมายเลขโต๊ะ</th>
                      <th className="p-4 font-bold">ชื่อ-นามสกุล</th>
                      <th className="p-4 font-bold text-right">จัดการ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bookings.map((b) => (
                      <tr key={b.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors group">
                        <td className="p-4 text-sm text-slate-500">{new Date(b.created_at).toLocaleString('th-TH')}</td>
                        <td className="p-4 font-bold text-slate-900">{b.desk_id}</td>
                        <td className="p-4 font-medium text-slate-700">{b.user_name}</td>
                        <td className="p-4 text-right">
                          <button 
                            onClick={() => handleDeleteBooking(b.id)} 
                            className="text-slate-400 hover:text-red-600 hover:bg-red-50 px-3 py-1.5 rounded-md text-xs font-bold uppercase tracking-wider transition-all opacity-100 md:opacity-0 md:group-hover:opacity-100"
                          >
                            ยกเลิก
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}