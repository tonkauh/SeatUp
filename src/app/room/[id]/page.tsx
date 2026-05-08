'use client'
import { useEffect, useState, use } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import dynamic from 'next/dynamic';

const ClassroomCanvas = dynamic(() => import('@/components/ClassroomCanvas'), { 
  ssr: false,
  loading: () => <div className="h-full w-full flex items-center justify-center bg-slate-800 text-slate-500">Loading Map...</div>
});

export default function BookingPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const roomId = resolvedParams.id;
  const searchParams = useSearchParams();
  const nameFromQuery = searchParams.get('name');

  const [room, setRoom] = useState<any>(null);
  const [bookings, setBookings] = useState<any[]>([]);
  const [studentName, setStudentName] = useState(nameFromQuery || '');
  const [selectedSeat, setSelectedSeat] = useState<string | null>(null); // เก็บโต๊ะที่คลิกเลือกอยู่
  const [loading, setLoading] = useState(true);
  
  const [showOverlay, setShowOverlay] = useState(false);
  const [isFadingOut, setIsFadingOut] = useState(false);
  const [timeLeft, setTimeLeft] = useState<{d: number, h: number, m: number, s: number} | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      const { data: roomData } = await supabase.from('rooms').select('*').or(`id.eq.${roomId},join_code.eq.${roomId.toUpperCase()}`).maybeSingle();
      if (roomData) {
        setRoom(roomData);
        const { data: bookingData } = await supabase.from('bookings').select('desk_id, user_name').eq('room_id', roomData.id);
        if (bookingData) setBookings(bookingData);
      }
      setLoading(false);
    };
    fetchData();
  }, [roomId]);

  // ระบบนับถอยหลัง
  useEffect(() => {
    if (!room?.start_time) return;
    const target = new Date(room.start_time).getTime();

    const updateTimer = () => {
      const now = new Date().getTime();
      const distance = target - now;

      if (distance <= 0) {
        if (showOverlay) {
          setIsFadingOut(true);
          setTimeout(() => setShowOverlay(false), 500); // รอ Fade Out 500ms
        }
        return true;
      } else {
        setShowOverlay(true);
        setTimeLeft({
          d: Math.floor(distance / (1000 * 60 * 60 * 24)),
          h: Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
          m: Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60)),
          s: Math.floor((distance % (1000 * 60)) / 1000),
        });
        return false;
      }
    };

    const isFinished = updateTimer();
    if (isFinished) return;

    const interval = setInterval(() => {
      if (updateTimer()) clearInterval(interval);
    }, 1000);
    return () => clearInterval(interval);
  }, [room?.start_time, showOverlay]);

  const handleSeatClick = (deskLabel: string) => {
    const isBooked = bookings.some(b => b.desk_id === deskLabel);
    if (isBooked) return; // ถ้าจองแล้วกดไม่ได้
    setSelectedSeat(deskLabel); // เก็บค่าโต๊ะที่เลือก
  };

  const confirmBooking = async () => {
    if (!studentName.trim()) return alert('กรุณากรอกชื่อ-นามสกุลก่อนยืนยัน');
    if (!selectedSeat) return alert('กรุณาเลือกที่นั่งบนแผนผัง');

    // เช็คว่าชื่อนี้เคยจองไปแล้วหรือยัง (จำกัดสิทธิ์ 1 คน 1 โต๊ะ)
    const hasBooked = bookings.some(b => b.user_name.trim().toLowerCase() === studentName.trim().toLowerCase());
    if (hasBooked) {
      return alert('ขออภัยครับ 1 ท่านสามารถจองได้เพียง 1 ที่นั่งเท่านั้น');
    }

    const { error } = await supabase.from('bookings').insert([{
      room_id: room.id,
      desk_id: selectedSeat,
      user_name: studentName,
    }]);

    if (error) alert('Error: ' + error.message);
    else {
      alert('จองที่นั่งสำเร็จ!');
      window.location.reload();
    }
  };

  if (loading) return <div className="min-h-screen bg-black text-white flex items-center justify-center">LOADING...</div>;

  return (
    <div className="h-[100dvh] bg-slate-50 text-slate-900 flex flex-col md:flex-row overflow-hidden font-sans">
      
      {/* 1. ส่วนแผนผัง (ซ้าย) */}
      <div className="flex-1 relative p-0 md:p-10 flex flex-col items-center justify-center w-full">
        <div className="w-full max-w-4xl flex flex-col items-center mb-2 md:mb-12 mt-4 md:mt-0 px-4">
           <div className="w-full h-2 bg-slate-300 rounded-full mb-2" />
           <span className="text-xs md:text-sm font-bold tracking-widest text-slate-400">หน้าชั้นเรียน (กระดาน)</span>
        </div>

        {/* สถานะที่นั่งด้านบน */}
        <div className="flex gap-4 md:gap-6 text-xs md:text-sm font-bold mb-2 md:mb-6 px-4">
           <div className="flex items-center gap-2"><div className="w-5 h-5 bg-[#DEFF9A] border-2 border-[#4ade80] rounded-md" /> โต๊ะว่าง</div>
           <div className="flex items-center gap-2"><div className="w-5 h-5 bg-[#F1F5F9] border-2 border-[#CBD5E1] rounded-md" /> มีผู้จองแล้ว</div>
        </div>

        <div className="w-full max-w-[1000px] flex flex-col flex-1 md:bg-white md:p-6 md:rounded-2xl md:border border-slate-200">
          <ClassroomCanvas 
            initialLayout={room.layout_config} 
            bookings={bookings} 
            onSave={handleSeatClick} // ส่งฟังก์ชันคลิกเลือกไป
            isReadOnly={true} 
          />
        </div>
      </div>

      {/* 2. เมนูรายละเอียดการจอง (ขวา) */}
      <div className="w-full md:w-[380px] shrink-0 bg-white text-slate-900 flex flex-col z-20 border-t md:border-t-0 md:border-l border-slate-200">
        <div className="bg-slate-900 text-white p-5 md:p-6 text-lg font-black tracking-widest uppercase flex items-center gap-3 relative overflow-hidden">
           <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
           <svg className="w-6 h-6 text-red-500 relative z-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
           <span className="relative z-10">BOOKING SUMMARY</span>
        </div>

        <div className="p-5 md:p-6 flex-grow flex flex-col">
           <div className="space-y-3 md:space-y-4 text-sm border-t border-b border-slate-100 py-4 md:py-6 mb-4 md:mb-8">
              <div className="hidden md:flex justify-between border-b pb-2">
                 <span className="text-slate-400">ห้องเรียน</span>
                 <span className="font-bold text-slate-900">{room?.name || 'กำลังโหลด...'}</span>
              </div>
              <div className="flex justify-between items-center md:border-b md:pb-2">
                 <span className="text-slate-500 md:text-slate-400 font-bold">โต๊ะที่เลือก</span>
                 <span className="text-red-600 font-black text-xl">{selectedSeat || '-'}</span>
              </div>
              <div className="flex justify-between items-center pt-2">
                 <span className="text-slate-500 md:text-slate-400 font-bold">ชื่อผู้จอง</span>
                 <span className="font-bold text-slate-900">{studentName || '-'}</span>
              </div>
           </div>

           <button 
             onClick={confirmBooking}
             disabled={showOverlay}
             className="w-full bg-red-600 hover:bg-red-700 disabled:bg-slate-400 text-white py-4 rounded-lg font-bold text-lg uppercase tracking-wide shadow-md shadow-red-600/20 transition-all hover:shadow-lg hover:-translate-y-0.5 disabled:shadow-none disabled:translate-y-0"
           >
             {showOverlay ? 'ยังไม่เปิดให้จอง' : 'ยืนยันการจอง'}
           </button>
           
           <button onClick={() => window.location.href = '/'} className="mt-4 text-slate-400 text-xs font-bold uppercase tracking-widest hover:text-slate-900 transition-colors flex items-center justify-center gap-2 w-full">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
              กลับหน้าหลัก
           </button>
        </div>
      </div>

      {/* Overlay นับถอยหลังรอจอง */}
      {showOverlay && (
        <div className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/85 backdrop-blur-md transition-opacity duration-500 ${isFadingOut ? 'opacity-0' : 'animate-in fade-in'}`}>
          <div className="text-center flex flex-col items-center z-10 px-4">
            <h2 className="text-2xl md:text-4xl font-black text-white uppercase tracking-widest mb-2 md:mb-4 drop-shadow-lg">ยังไม่ถึงเวลาเปิดจอง</h2>
            <p className="text-slate-300 mb-6 md:mb-8 text-sm md:text-lg drop-shadow-md">ระบบจะเปิดให้เข้าจองที่นั่งได้ในอีก</p>

            {timeLeft && (
              <div className="flex gap-2 md:gap-4 text-white text-6xl md:text-8xl font-mono font-bold drop-shadow-[0_10px_20px_rgba(0,0,0,0.5)]">
                {timeLeft.h > 0 && (
                  <>
                    <span>{timeLeft.h.toString().padStart(2, '0')}</span>
                    <span className="text-slate-500/80 -mt-1">:</span>
                  </>
                )}
                <span>{timeLeft.m.toString().padStart(2, '0')}</span>
                <span className="text-slate-500/80 -mt-1">:</span>
                <span className="text-red-500 drop-shadow-[0_0_20px_rgba(220,38,38,0.5)]">{timeLeft.s.toString().padStart(2, '0')}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}