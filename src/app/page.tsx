'use client'
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import AdminPanel from '@/components/AdminPanel';
import RoomEditor from '@/components/RoomEditor';

export default function LandingPage() {
  const [view, setView] = useState<'landing' | 'host_menu' | 'host_create' | 'host_manage' | 'editor' | 'join'>('landing');
  const [editingRoom, setEditingRoom] = useState<any>(null); // เก็บห้องที่กำลังแต่ง
  const [joinCode, setJoinCode] = useState('');
  const [studentNameForJoin, setStudentNameForJoin] = useState('');
  const [manageCode, setManageCode] = useState(''); // รหัสสำหรับเข้าดู Dashboard

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
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-slate-900 font-sans">
        <h1 className="text-6xl md:text-7xl font-black mb-12 tracking-tighter uppercase">
          SEAT<span className="text-red-600 font-normal">UP</span>
        </h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-3xl">
          <button 
            onClick={() => setView('host_menu')} 
            className="p-8 bg-white border border-slate-200 rounded-xl hover:border-red-600 hover:shadow-lg transition-all duration-300 group text-left flex flex-col items-start"
          >
            <div className="w-12 h-12 bg-slate-900 text-white rounded-lg flex items-center justify-center text-xl mb-6">🛠️</div>
            <div className="text-2xl font-bold tracking-wide text-slate-900 uppercase">Manage Rooms</div>
            <p className="text-slate-500 mt-2 font-medium">สร้างและจัดการแผนผังห้องเรียน</p>
          </button>
          
          <button 
            onClick={() => setView('join')} 
            className="p-8 bg-white border border-slate-200 rounded-xl hover:border-red-600 hover:shadow-lg transition-all duration-300 group text-left flex flex-col items-start"
          >
            <div className="w-12 h-12 bg-red-600 text-white rounded-lg flex items-center justify-center text-xl mb-6">🎟️</div>
            <div className="text-2xl font-bold tracking-wide text-slate-900 uppercase">Join & Book</div>
            <p className="text-slate-500 mt-2 font-medium">กรอกโค้ดเพื่อเข้าจองที่นั่ง</p>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-10">
      <div className="max-w-5xl mx-auto">
        <button onClick={() => { setView('landing'); setEditingRoom(null); }} className="mb-6 text-slate-400 hover:text-slate-600 transition-colors font-medium">
          ← กลับหน้าหลัก
        </button>

        {view === 'host_menu' && (
          <div className="max-w-2xl mx-auto mt-10 text-center animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h2 className="text-2xl font-bold mb-8 text-slate-800">เลือกเมนูจัดการห้องเรียน</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <button onClick={() => setView('host_create')} className="p-8 bg-white border border-slate-200 hover:border-slate-900 rounded-xl hover:shadow-md transition-all duration-300 group">
                <div className="text-4xl mb-4 text-slate-800">➕</div>
                <div className="text-xl font-bold text-slate-900 uppercase">Create Room</div>
                <p className="text-slate-500 text-sm mt-2">ออกแบบห้องและรับรหัส</p>
              </button>
              <button onClick={() => setView('host_manage')} className="p-8 bg-white border border-slate-200 hover:border-slate-900 rounded-xl hover:shadow-md transition-all duration-300 group">
                <div className="text-4xl mb-4 text-slate-800">📊</div>
                <div className="text-xl font-bold text-slate-900 uppercase">Dashboard</div>
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
          <div className="max-w-md mx-auto text-center mt-20 bg-white p-10 border border-slate-200 rounded-xl shadow-sm animate-in fade-in duration-500">
            <h2 className="text-2xl font-bold mb-2 text-slate-900 uppercase">Admin Login</h2>
            <p className="text-slate-500 mb-6 text-sm">กรอกรหัสห้อง (Join Code) 6 หลัก</p>
            <input 
              type="text" 
              maxLength={6}
              value={manageCode}
              onChange={(e) => setManageCode(e.target.value.toUpperCase())}
              className="w-full text-center text-4xl font-mono py-4 rounded-lg border-2 border-slate-200 focus:border-slate-900 outline-none transition-all mb-8 uppercase text-slate-800"
              placeholder="XXXXXX"
            />
            <button 
               onClick={async () => {
                 const { data } = await supabase.from('rooms').select('*').eq('join_code', manageCode).single();
                 if (data) {
                   setEditingRoom(data);
                   setView('editor');
                 } else alert('ไม่พบรหัสห้องนี้ครับ กรุณาตรวจสอบอีกครั้ง');
               }}
               className="w-full bg-slate-900 hover:bg-slate-800 text-white py-4 rounded-lg font-bold text-lg uppercase transition-colors"
            >
              เข้าสู่ระบบจัดการ
            </button>
          </div>
        )}

        {view === 'editor' && editingRoom && (
          <div className="animate-in fade-in duration-500">
            <div className="bg-slate-900 text-white p-6 md:p-8 rounded-2xl mb-8 flex flex-col md:flex-row justify-between items-center gap-4">
              <div>
                <h2 className="text-2xl font-bold uppercase">{editingRoom.name}</h2>
                <p className="text-slate-400 text-sm mt-1 uppercase tracking-widest">Join Code: <span className="font-mono font-bold text-white text-lg ml-1">{editingRoom.join_code}</span></p>
              </div>
            </div>
            <RoomEditor room={editingRoom} onDataChange={refetchEditingRoom} />
          </div>
        )}

        {view === 'join' && (
           <div className="max-w-md mx-auto text-center mt-20 bg-white p-10 border border-slate-200 rounded-xl shadow-sm animate-in fade-in">
             <h2 className="text-2xl font-bold mb-6 text-slate-900 uppercase">Join Room</h2>
             <div className="space-y-4 mb-8">
               <input 
                 type="text" 
                 value={studentNameForJoin}
                 onChange={(e) => setStudentNameForJoin(e.target.value)}
                 className="w-full text-center p-4 rounded-lg border-2 border-slate-200 focus:border-red-600 outline-none transition-all text-slate-800 font-medium"
                 placeholder="กรอกชื่อ-นามสกุลของคุณ"
               />
               <input 
                 type="text" 
                 maxLength={6}
                 value={joinCode}
                 onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                 className="w-full text-center text-4xl font-mono py-4 rounded-lg border-2 border-slate-200 focus:border-red-600 outline-none transition-all uppercase text-slate-800"
                 placeholder="XXXXXX"
               />
             </div>
             <button 
                onClick={async () => {
                  if (!studentNameForJoin.trim()) return alert('กรุณากรอกชื่อ-นามสกุลของคุณก่อนครับ');
                  const { data } = await supabase.from('rooms').select('id').eq('join_code', joinCode).single();
                  if (data) window.location.href = `/room/${data.id}?name=${encodeURIComponent(studentNameForJoin)}`;
                  else alert('ไม่พบรหัสห้องนี้ครับ');
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