'use client'
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { DialogProvider, useDialog } from '@/components/DialogContext';
import AdminPanel from '@/components/AdminPanel';
import RoomEditor from '@/components/RoomEditor';
import { Prompt } from 'next/font/google';

const prompt = Prompt({
  weight: ['300', '400', '500', '600', '700'],
  subsets: ['thai', 'latin'],
  display: 'swap',
});

function PageContent() {
  const [view, setView] = useState<'landing' | 'host_menu' | 'host_create' | 'host_manage' | 'editor' | 'join'>('landing');
  const [editingRoom, setEditingRoom] = useState<any>(null); // เก็บห้องที่กำลังแต่ง
  const [joinCode, setJoinCode] = useState('');
  const [studentNameForJoin, setStudentNameForJoin] = useState('');
  const [manageCode, setManageCode] = useState(''); // รหัสสำหรับเข้าดู Dashboard
  const { showAlert } = useDialog();

  const refetchEditingRoom = async () => {
    if (!editingRoom?.id) return;
    const { data: updatedRoom } = await supabase.from('rooms').select('*').eq('id', editingRoom.id).single();
    if (updatedRoom) {
      setEditingRoom(updatedRoom);
    }
  };

  // ฟังก์ชันหลังจากสร้างห้องสำเร็จใน AdminPanel
  const handleRoomCreated = (room: any) => {
    setEditingRoom(room);
    setView('editor'); // สลับไปหน้าต่างจัดการ/Dashboard
  };

  if (view === 'landing') {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 md:p-6 text-slate-900">
        {/* Logo Section */}
        <div className="flex items-center justify-center gap-3 md:gap-4 mb-8 md:mb-12 animate-in fade-in slide-in-from-top-4 duration-700">
          <div className="w-12 h-12 sm:w-16 sm:h-16 md:w-20 md:h-20 shrink-0 bg-slate-900 text-white rounded-2xl flex items-center justify-center transform -rotate-6 shadow-xl">
            <svg className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21v-4a2 2 0 00-2-2H7a2 2 0 00-2 2v4M5 10h14M7 10V5a2 2 0 012-2h6a2 2 0 012 2v5" /></svg>
          </div>
          <h1 className="text-4xl sm:text-5xl md:text-7xl font-black tracking-tighter uppercase">
            SEAT<span className="text-red-600 font-normal">UP</span>
          </h1>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-3xl">
          <button 
            onClick={() => setView('host_menu')} 
            className="p-6 md:p-8 bg-white border border-slate-200 rounded-xl hover:border-red-600 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group text-left flex flex-col items-start"
          >
            <div className="w-10 h-10 md:w-12 md:h-12 bg-slate-900 text-white rounded-lg flex items-center justify-center mb-4 md:mb-6 shrink-0">
              <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
            </div>
            <div className="text-xl md:text-2xl font-bold tracking-wide text-slate-900">จัดการห้องเรียน</div>
            <p className="text-slate-500 mt-2 font-medium">สร้างและจัดการแผนผังห้องเรียน</p>
          </button>
          
          <button 
            onClick={() => setView('join')} 
            className="p-6 md:p-8 bg-white border border-slate-200 rounded-xl hover:border-red-600 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group text-left flex flex-col items-start"
          >
            <div className="w-10 h-10 md:w-12 md:h-12 bg-red-600 text-white rounded-lg flex items-center justify-center mb-4 md:mb-6 shrink-0">
              <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" /></svg>
            </div>
            <div className="text-xl md:text-2xl font-bold tracking-wide text-slate-900">เข้าร่วมและจองที่นั่ง</div>
            <p className="text-slate-500 mt-2 font-medium">กรอกโค้ดเพื่อเข้าจองที่นั่ง</p>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-[100dvh] bg-slate-50 ${view === 'editor' ? 'p-0 md:p-6 flex flex-col' : 'p-4 md:p-10'}`}>
      <div className={`${view === 'editor' ? 'max-w-[1600px] w-full flex-1 flex flex-col relative' : 'max-w-5xl mx-auto'}`}>
        <button onClick={() => { setView('landing'); setEditingRoom(null); }} className={`${view === 'editor' ? 'hidden md:flex' : 'flex'} mb-6 text-slate-400 hover:text-slate-600 transition-colors font-medium items-center gap-2`}>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
          กลับหน้าหลัก
        </button>

        {view === 'host_menu' && (
          <div className="max-w-2xl mx-auto mt-10 text-center animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h2 className="text-2xl font-bold mb-8 text-slate-800">เลือกเมนูจัดการห้องเรียน</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <button onClick={() => setView('host_create')} className="p-6 md:p-8 bg-white border border-slate-200 hover:border-slate-900 rounded-xl hover:shadow-lg hover:-translate-y-1 transition-all duration-300 group">
                <svg className="w-10 h-10 text-slate-800 mb-4 mx-auto group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                <div className="text-xl font-bold text-slate-900">สร้างห้องเรียน</div>
                <p className="text-slate-500 text-sm mt-2">ออกแบบห้องและรับรหัส</p>
              </button>
              <button onClick={() => setView('host_manage')} className="p-6 md:p-8 bg-white border border-slate-200 hover:border-slate-900 rounded-xl hover:shadow-lg hover:-translate-y-1 transition-all duration-300 group">
                <svg className="w-10 h-10 text-slate-800 mb-4 mx-auto group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                <div className="text-xl font-bold text-slate-900">แผงควบคุม (Dashboard)</div>
                <p className="text-slate-500 text-sm mt-2">ดูรายชื่อผู้จองและแก้แผนผัง</p>
              </button>
            </div>
          </div>
        )}

        {view === 'host_create' && (
          <div className="mt-10 animate-in fade-in duration-500">
            <AdminPanel onCreated={handleRoomCreated} />
          </div>
        )}

        {view === 'host_manage' && (
          <div className="max-w-md mx-auto text-center mt-10 md:mt-20 bg-white p-6 md:p-10 border border-slate-200 rounded-xl shadow-sm animate-in fade-in duration-500">
            <h2 className="text-2xl font-bold mb-2 text-slate-900">เข้าสู่ระบบจัดการ</h2>
            <p className="text-slate-500 mb-6 text-sm">กรอกรหัสห้อง (Join Code) 6 หลัก</p>
            <input 
              type="text" 
              maxLength={6}
              value={manageCode}
              onChange={(e) => setManageCode(e.target.value.toUpperCase())}
              className="w-full text-center text-3xl md:text-4xl font-mono py-4 rounded-lg border-2 border-slate-200 focus:border-slate-900 focus:ring-4 focus:ring-slate-900/10 shadow-inner outline-none transition-all mb-8 uppercase text-slate-900"
              placeholder="XXXXXX"
            />
            <button 
               onClick={async () => {
                 const { data } = await supabase.from('rooms').select('*').eq('join_code', manageCode).single();
                 if (data) {
                   setEditingRoom(data);
                   setView('editor');
                 } else showAlert('ไม่พบรหัสห้องนี้ครับ กรุณาตรวจสอบอีกครั้ง');
               }}
               className="w-full bg-slate-900 hover:bg-slate-800 text-white py-4 rounded-lg font-bold text-lg uppercase transition-colors"
            >
              เข้าสู่ระบบจัดการ
            </button>
          </div>
        )}

        {view === 'editor' && editingRoom && (
          <div className="animate-in fade-in duration-500 flex-1 flex flex-col relative">
            {/* หัวข้อจะถูกซ่อนบนมือถือเพื่อประหยัดพื้นที่ และไปแสดงใน Popup แทน */}
            <div className="hidden md:flex bg-slate-900 text-white p-4 md:p-8 rounded-2xl mb-8 flex-col md:flex-row justify-between items-center gap-4">
              <div className="w-full">
                <h2 className="text-2xl font-bold uppercase">{editingRoom.name}</h2>
                <p className="text-slate-400 text-sm mt-1 tracking-widest">รหัสเข้าร่วม (Join Code): <span className="font-mono font-bold text-white text-lg ml-1">{editingRoom.join_code}</span></p>
              </div>
            </div>
            <RoomEditor room={editingRoom} onDataChange={refetchEditingRoom} onGoHome={() => { setView('landing'); setEditingRoom(null); }} />
          </div>
        )}

        {view === 'join' && (
           <div className="max-w-md mx-auto text-center mt-10 md:mt-20 bg-white p-6 md:p-10 border border-slate-200 rounded-xl shadow-sm animate-in fade-in">
             <h2 className="text-2xl font-bold mb-6 text-slate-900">เข้าร่วมห้องเรียน</h2>
             <div className="space-y-4 mb-8">
               <input 
                 type="text" 
                 value={studentNameForJoin}
                 onChange={(e) => setStudentNameForJoin(e.target.value)}
                 className="w-full text-center p-3 md:p-4 rounded-lg border-2 border-slate-200 focus:border-red-600 focus:ring-4 focus:ring-red-600/10 shadow-inner outline-none transition-all text-slate-900 font-medium text-lg"
                 placeholder="กรอกชื่อ-นามสกุลของคุณ"
               />
               <input 
                 type="text" 
                 maxLength={6}
                 value={joinCode}
                 onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                 className="w-full text-center text-3xl md:text-4xl font-mono py-4 rounded-lg border-2 border-slate-200 focus:border-red-600 focus:ring-4 focus:ring-red-600/10 shadow-inner outline-none transition-all uppercase text-slate-900"
                 placeholder="XXXXXX"
               />
             </div>
             <button 
                onClick={async () => {
                  if (!studentNameForJoin.trim()) return showAlert('กรุณากรอกชื่อ-นามสกุลของคุณก่อนครับ');
                  const { data } = await supabase.from('rooms').select('id').eq('join_code', joinCode).single();
                  if (data) window.location.href = `/room/${data.id}?name=${encodeURIComponent(studentNameForJoin)}`;
                  else showAlert('ไม่พบรหัสห้องนี้ครับ');
                }}
                className="w-full bg-red-600 hover:bg-red-700 text-white py-4 rounded-lg font-bold text-lg uppercase transition-colors"
             >
               เข้าร่วมจองโต๊ะ
             </button>
           </div>
        )}
      </div>
    </div>
  );
}

export default function LandingPage() {
  return (
    <DialogProvider>
      <main className={prompt.className}>
        <PageContent />
      </main>
    </DialogProvider>
  );
}