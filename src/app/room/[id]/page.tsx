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
    if (!studentName.trim()) return alert('⚠️ กรุณากรอกชื่อ-นามสกุลก่อนยืนยัน');
    if (!selectedSeat) return alert('⚠️ กรุณาเลือกที่นั่งบนแผนผัง');

    const { error } = await supabase.from('bookings').insert([{
      room_id: room.id,
      desk_id: selectedSeat,
      user_name: studentName,
    }]);

    if (error) alert('Error: ' + error.message);
    else {
      alert('✅ จองที่นั่งสำเร็จ!');
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
        <div className="bg-slate-900 text-white p-5 md:p-6 text-lg font-bold tracking-widest uppercase">
           BOOKING SUMMARY
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
             className="w-full bg-red-600 hover:bg-red-700 disabled:bg-slate-400 text-white py-4 rounded-lg font-bold text-lg uppercase tracking-wide transition-colors"
           >
             {showOverlay ? 'ยังไม่เปิดให้จอง' : 'ยืนยันการจอง'}
           </button>
           
           <button onClick={() => window.location.href = '/'} className="mt-4 text-slate-400 text-xs font-bold uppercase tracking-widest hover:text-slate-900 transition-colors">
              ← กลับหน้าหลัก
           </button>
        </div>
      </div>

      {/* Overlay นับถอยหลังรอจอง */}
      {showOverlay && (
        <div className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/85 backdrop-blur-md transition-opacity duration-500 ${isFadingOut ? 'opacity-0' : 'animate-in fade-in'}`}>
          <div className="bg-slate-900 border border-slate-800 p-8 md:p-12 rounded-[2.5rem] shadow-2xl text-center flex flex-col items-center max-w-lg w-11/12 relative overflow-hidden">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-1.5 bg-red-600" />
            <div className="text-4xl md:text-5xl mb-4">⏳</div>
            <h2 className="text-xl md:text-2xl font-black text-white uppercase tracking-widest mb-2">ยังไม่ถึงเวลาเปิดจอง</h2>
            <p className="text-slate-400 mb-8 text-sm">ระบบจะเปิดให้เข้าจองที่นั่งได้ในอีก</p>

            {timeLeft && (
              <div className="flex gap-3 md:gap-4 text-white">
                {timeLeft.d > 0 && (
                  <>
                    <div className="flex flex-col items-center">
                      <div className="w-14 h-14 md:w-16 md:h-16 bg-slate-800 rounded-xl flex items-center justify-center text-2xl md:text-3xl font-mono font-bold border border-slate-700">{timeLeft.d}</div>
                      <span className="text-[10px] text-slate-500 mt-2 font-bold uppercase tracking-widest">Days</span>
                    </div>
                    <div className="text-2xl font-bold mt-3 text-slate-600">:</div>
                  </>
                )}
                <div className="flex flex-col items-center">
                  <div className="w-14 h-14 md:w-16 md:h-16 bg-slate-800 rounded-xl flex items-center justify-center text-2xl md:text-3xl font-mono font-bold border border-slate-700">{timeLeft.h.toString().padStart(2, '0')}</div>
                  <span className="text-[10px] text-slate-500 mt-2 font-bold uppercase tracking-widest">Hours</span>
                </div>
                <div className="text-2xl font-bold mt-3 text-slate-600">:</div>
                <div className="flex flex-col items-center">
                  <div className="w-14 h-14 md:w-16 md:h-16 bg-slate-800 rounded-xl flex items-center justify-center text-2xl md:text-3xl font-mono font-bold border border-slate-700">{timeLeft.m.toString().padStart(2, '0')}</div>
                  <span className="text-[10px] text-slate-500 mt-2 font-bold uppercase tracking-widest">Mins</span>
                </div>
                <div className="text-2xl font-bold mt-3 text-slate-600">:</div>
                <div className="flex flex-col items-center">
                  <div className="w-14 h-14 md:w-16 md:h-16 bg-slate-800 rounded-xl flex items-center justify-center text-2xl md:text-3xl font-mono font-bold text-red-500 border border-slate-700 shadow-[0_0_15px_rgba(220,38,38,0.2)]">{timeLeft.s.toString().padStart(2, '0')}</div>
                  <span className="text-[10px] text-slate-500 mt-2 font-bold uppercase tracking-widest">Secs</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}