'use client'
import React, { useState, useEffect, useRef } from 'react';
import { Stage, Layer, Rect, Text, Group } from 'react-konva';

interface ClassroomCanvasProps {
  initialLayout: any[];
  bookings?: any[]; // เพิ่ม Prop รับข้อมูลการจอง
  onSave: (data: any) => void;
  isReadOnly?: boolean;
}

export default function ClassroomCanvas({ 
  initialLayout, 
  bookings = [], // กำหนดค่าเริ่มต้นเป็นอาเรย์ว่าง
  onSave, 
  isReadOnly = false 
}: ClassroomCanvasProps) {
  const [desks, setDesks] = useState(initialLayout || []);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 500 });
  
  // ระบบ Zoom & Pan
  const [scale, setScale] = useState(1);
  const [stagePos, setStagePos] = useState({ x: 0, y: 0 });
  const lastDist = useRef<number>(0);
  const [editingDesk, setEditingDesk] = useState<any>(null); // State สำหรับโต๊ะที่ถูกคลิกตั้งค่า

  useEffect(() => {
    setDesks(initialLayout || []);
    
    // คำนวณขนาดหน้าจอเพื่อปรับ Canvas ให้พอดี
    const updateSize = () => {
      if (containerRef.current) {
        const { offsetWidth, offsetHeight } = containerRef.current;
        setDimensions({ width: offsetWidth, height: offsetHeight });
        
        // ปรับซูมออกอัตโนมัติบนหน้าจอมือถือ
        if (offsetWidth < 600 && scale === 1) {
          const initialScale = 0.45; // ซูมออกให้เห็นห้องกว้างขึ้น
          setScale(initialScale);
          setStagePos({ x: (offsetWidth - (800 * initialScale)) / 2, y: 30 }); // จัดกึ่งกลางแกน X ให้เป๊ะ
        }
      }
    };
    setTimeout(updateSize, 100);
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, [initialLayout]);

  // ใช้ Scroll เมาส์เพื่อ Zoom
  const handleWheel = (e: any) => {
    e.evt.preventDefault();
    const scaleBy = 1.1;
    const stage = e.target.getStage();
    const oldScale = stage.scaleX();
    const pointer = stage.getPointerPosition();
    if (!pointer) return;

    const mousePointTo = { x: (pointer.x - stage.x()) / oldScale, y: (pointer.y - stage.y()) / oldScale };
    const newScale = e.evt.deltaY > 0 ? oldScale / scaleBy : oldScale * scaleBy;
    const boundedScale = Math.max(0.2, Math.min(newScale, 5)); // ล็อกการซูมไว้ที่ 20% - 500%

    setScale(boundedScale);
    setStagePos({
      x: pointer.x - mousePointTo.x * boundedScale,
      y: pointer.y - mousePointTo.y * boundedScale,
    });
  };

  // ระบบ Pinch-to-Zoom สำหรับหน้าจอมือถือ (ใช้ 2 นิ้วซูม)
  const getDistance = (p1: any, p2: any) => {
    return Math.sqrt(Math.pow(p2.clientX - p1.clientX, 2) + Math.pow(p2.clientY - p1.clientY, 2));
  };

  const getCenter = (p1: any, p2: any) => {
    return { x: (p1.clientX + p2.clientX) / 2, y: (p1.clientY + p2.clientY) / 2 };
  };

  const handleTouchMove = (e: any) => {
    e.evt.preventDefault();
    const touch1 = e.evt.touches[0];
    const touch2 = e.evt.touches[1];

    if (touch1 && touch2) {
      const stage = e.target.getStage();
      if (stage.isDragging()) stage.stopDrag(); // หยุดลากกระดานเวลาจะซูม

      const dist = getDistance(touch1, touch2);
      if (!lastDist.current) lastDist.current = dist;

      const oldScale = stage.scaleX();
      const scaleBy = dist / lastDist.current;
      const newScale = Math.max(0.2, Math.min(oldScale * scaleBy, 5)); // ล็อกที่ 20% - 500%

      const center = getCenter(touch1, touch2);
      const container = containerRef.current?.getBoundingClientRect();
      if (!container) return;

      const pointerPosition = { x: center.x - container.left, y: center.y - container.top };
      const mousePointTo = {
        x: (pointerPosition.x - stage.x()) / oldScale,
        y: (pointerPosition.y - stage.y()) / oldScale,
      };

      setScale(newScale);
      setStagePos({
        x: pointerPosition.x - mousePointTo.x * newScale,
        y: pointerPosition.y - mousePointTo.y * newScale,
      });

      lastDist.current = dist;
    }
  };

  const handleTouchEnd = () => { lastDist.current = 0; };

  // ขนาดโต๊ะมาตรฐาน
  const deskWidth = 80;
  const deskHeight = 55;

  // อัปเดตตำแหน่งเมื่อลากโต๊ะเสร็จ
  const handleDragEnd = (id: string, e: any) => {
    if (isReadOnly) return;
    // ป้องกันไม่ให้อัปเดตโต๊ะ ถ้าผู้ใช้กำลังลากพื้นกระดาน (Stage)
    if (e.target === e.target.getStage()) return;

    const newDesks = desks.map((d: any) => {
      if (d.id === id) {
        return { ...d, x: Math.round(e.target.x() / 10) * 10, y: Math.round(e.target.y() / 10) * 10 }; // snap ลง grid ทีละ 10px
      }
      return d;
    });
    setDesks(newDesks);
  };

  // ฟังก์ชันเพิ่มโต๊ะใหม่ลงใน Canvas
  const handleAddDesk = () => {
    const newDesk = {
      id: `T${Date.now()}`,
      x: 50,
      y: 50,
      label: `T${desks.length + 1}` // รันเลขโต๊ะอัตโนมัติตามจำนวนที่มี
    };
    setDesks([...desks, newDesk]);
  };

  return (
    <div 
      ref={containerRef}
      className="w-full flex-1 h-[65vh] md:h-auto md:min-h-[600px] bg-slate-50 bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] [background-size:20px_20px] rounded-none md:rounded-xl border-y md:border border-slate-200 overflow-hidden relative group"
      style={{ touchAction: 'none' }} // ป้องกันจอไหลตอนใช้นิ้วลากแผนผัง
    >
      
      {/* แสดงปุ่มบันทึกแผนผังเฉพาะในโหมด Admin/Editor */}
      {!isReadOnly && (
        <div className="absolute bottom-4 left-4 md:bottom-auto md:top-4 md:left-auto md:right-4 z-20 flex gap-2 bg-white p-2 rounded-lg shadow-sm border border-slate-200">
          <button
            onClick={handleAddDesk}
            className="bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-md font-bold transition-colors text-sm flex items-center uppercase"
          >
            + เพิ่มโต๊ะ
          </button>
          <button
            onClick={() => onSave(desks)}
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md font-bold transition-colors text-sm flex items-center uppercase"
          >
            💾 บันทึกแผนผัง
          </button>
        </div>
      )}
      
      {/* เส้นบอกกึ่งกลางห้อง (UI ตามรูป) */}
      <div className="absolute top-0 bottom-0 left-1/2 w-px bg-slate-200 -translate-x-1/2 pointer-events-none hidden md:block" />

      {/* ชุดปุ่ม Zoom สไตล์ Canva */}
      <div className="absolute bottom-4 right-4 flex items-center gap-1 bg-white p-1 rounded-lg shadow-sm border border-slate-200 z-20">
        <button onClick={() => setScale(s => Math.max(0.2, s / 1.2))} className="w-8 h-8 flex items-center justify-center bg-white hover:bg-slate-100 rounded-md text-slate-700 font-bold text-lg transition-colors">-</button>
        <button onClick={() => { setScale(1); setStagePos({ x: 0, y: 0 }); }} className="w-12 text-center text-xs font-bold text-slate-500 hover:text-slate-900 transition-colors">
          {Math.round(scale * 100)}%
        </button>
        <button onClick={() => setScale(s => Math.min(5, s * 1.2))} className="w-8 h-8 flex items-center justify-center bg-white hover:bg-slate-100 rounded-md text-slate-700 font-bold text-lg transition-colors">+</button>
      </div>
      
      <Stage 
        width={dimensions.width} 
        height={dimensions.height}
        scaleX={scale}
        scaleY={scale}
        x={stagePos.x}
        y={stagePos.y}
        draggable={true} // อนุญาตให้ลากกระดานได้
        onWheel={handleWheel}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
        onDragEnd={(e) => {
          if (e.target === e.target.getStage()) {
            setStagePos({ x: e.target.x(), y: e.target.y() });
          }
        }}
      >
        <Layer>
          {desks.map((desk: any) => {
            // ตรวจสอบว่าโต๊ะนี้ถูกจองหรือยัง
            const booking = bookings.find(b => b.desk_id === desk.label);
            const isBooked = !!booking;
            const ownerName = booking?.user_name || '';

            // กำหนดสีตามสถานะ (โต๊ะปกติ vs สิ่งของ)
            let fillColor = isBooked ? '#F1F5F9' : '#DEFF9A'; 
            let strokeColor = isBooked ? '#CBD5E1' : '#4ade80';
            if (desk.isObject) {
              fillColor = '#E2E8F0';
              strokeColor = '#94A3B8';
            }

            return (
              <Group
                key={desk.id}
                x={desk.x}
                y={desk.y}
                draggable={!isReadOnly && !desk.isLocked} // ลากไม่ได้ถ้าถูกล็อก หรือเป็นโหมด ReadOnly
                onDragEnd={(e) => handleDragEnd(desk.id, e)}
                onClick={() => {
                  if (isReadOnly) {
                    if (desk.isObject) return alert('นี่คือสิ่งของ ไม่สามารถจองได้ครับ');
                    if (!isBooked) {
                      onSave(desk.label); // ถ้าว่างถึงจะกดจองได้
                    } else {
                      alert(`โต๊ะหมายเลข ${desk.label} ถูกจองโดยคุณ ${ownerName} แล้วครับ`);
                    }
                  } else {
                    setEditingDesk({ ...desk }); // เปิด Modal ตั้งค่าโต๊ะ
                  }
                }}
                onTap={() => { // เพิ่ม onTap สำหรับรองรับบนมือถือ
                  if (isReadOnly) {
                    if (desk.isObject) return alert('นี่คือสิ่งของ ไม่สามารถจองได้ครับ');
                    if (!isBooked) {
                      onSave(desk.label);
                    } else {
                      alert(`โต๊ะหมายเลข ${desk.label} ถูกจองโดยคุณ ${ownerName} แล้วครับ`);
                    }
                  } else {
                    setEditingDesk({ ...desk });
                  }
                }}
                // เปลี่ยน Mouse cursor เมื่อชี้
                onMouseEnter={(e: any) => {
                  const container = e.target.getStage().container();
                  if (!isReadOnly) {
                    container.style.cursor = desk.isLocked ? 'pointer' : 'move';
                  } else {
                    container.style.cursor = desk.isObject ? 'default' : (isBooked ? 'not-allowed' : 'pointer');
                  }
                }}
                onMouseLeave={(e: any) => {
                  const container = e.target.getStage().container();
                  container.style.cursor = 'default';
                }}
              >
                {/* ตัวโต๊ะ */}
                <Rect
                  width={deskWidth}
                  height={deskHeight}
                  fill={fillColor}
                  stroke={strokeColor}
                  strokeWidth={2}
                  cornerRadius={10}
                  // เอฟเฟกต์เงา
                  shadowColor="rgba(0,0,0,0.1)"
                  shadowBlur={isBooked ? 0 : 5}
                  shadowOffset={{ x: 0, y: isBooked ? 0 : 3 }}
                  shadowOpacity={0.5}
                />
                
                {/* แสดงไอคอนล็อกเฉพาะโหมด Editor */}
                {!isReadOnly && desk.isLocked && (
                  <Text text="🔒" x={5} y={5} fontSize={10} />
                )}

                {/* หมายเลขโต๊ะ (ซ่อนมุมบนขวาถ้าเป็นสิ่งของ) */}
                {!desk.isObject && (
                  <Text
                    text={desk.label}
                    x={deskWidth - 25} // ชิดมุมขวาบน
                    y={5}
                    fontSize={10}
                    fontStyle="bold"
                    fill={isBooked ? "#94A3B8" : "#166534"}
                  />
                )}

                {/* ชื่อผู้จอง หรือชื่อสิ่งของ (แสดงตรงกลางโต๊ะ) */}
                <Text
                  text={desk.isObject ? desk.label : (isBooked ? ownerName : 'ว่าง')} 
                  width={deskWidth - 10} // เว้นขอบ
                  height={deskHeight - 15}
                  x={5}
                  y={12} // ขยับลงมาหน่อย
                  align="center"
                  verticalAlign="middle"
                  fontSize={12}
                  fontStyle={isBooked || desk.isObject ? "normal" : "bold"}
                  fill={desk.isObject ? "#475569" : (isBooked ? "#475569" : "#15803D")}
                  // ตัดคำถ้าชื่อยาวเกิน
                  ellipsis={true}
                  wrap="none"
                />
              </Group>
            );
          })}
        </Layer>
      </Stage>

      {/* Modal ตั้งค่าโต๊ะ (โหมด Editor) */}
      {!isReadOnly && editingDesk && (
        <div 
          className="absolute inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
          onPointerDown={(e) => e.stopPropagation()} // ป้องกันการลากแผนผังทะลุ
          onWheel={(e) => e.stopPropagation()}
        >
          <div className="bg-white p-6 rounded-xl shadow-xl w-full max-w-sm border border-slate-200">
            <h3 className="text-lg font-bold mb-4 text-slate-900 uppercase border-b border-slate-100 pb-2">⚙️ ตั้งค่าวัตถุ</h3>
            
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1 block">ชื่อโต๊ะ / สิ่งของ</label>
                <input
                  type="text"
                  value={editingDesk.label}
                  onChange={(e) => setEditingDesk({...editingDesk, label: e.target.value})}
                  className="w-full p-2.5 border border-slate-300 rounded-lg outline-none focus:border-slate-900 font-bold text-slate-800 transition-colors"
                />
              </div>
              
              <label className="flex items-center gap-3 p-3 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50 transition-colors">
                <input
                  type="checkbox"
                  checked={editingDesk.isLocked || false}
                  onChange={(e) => setEditingDesk({...editingDesk, isLocked: e.target.checked})}
                  className="w-5 h-5 text-red-600 rounded focus:ring-red-500 cursor-pointer"
                />
                <div className="flex-1">
                  <div className="text-sm font-bold text-slate-800">🔒 ล็อกตำแหน่ง</div>
                  <div className="text-xs text-slate-400">ป้องกันการเผลอลากขยับ</div>
                </div>
              </label>

              <label className="flex items-center gap-3 p-3 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50 transition-colors">
                <input
                  type="checkbox"
                  checked={editingDesk.isObject || false}
                  onChange={(e) => setEditingDesk({...editingDesk, isObject: e.target.checked})}
                  className="w-5 h-5 text-red-600 rounded focus:ring-red-500 cursor-pointer"
                />
                <div className="flex-1">
                  <div className="text-sm font-bold text-slate-800">📦 เป็นสิ่งของตกแต่ง</div>
                  <div className="text-xs text-slate-400">ผู้ใช้จะไม่สามารถจองได้</div>
                </div>
              </label>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={() => {
                  const newDesks = desks.filter((d: any) => d.id !== editingDesk.id);
                  setDesks(newDesks);
                  setEditingDesk(null);
                  onSave(newDesks); // บันทึกลงฐานข้อมูลทันทีเมื่อกดลบ
                }}
                className="px-4 py-2 bg-red-50 text-red-600 font-bold rounded-lg hover:bg-red-100 transition-colors mr-auto text-sm uppercase"
              >
                Delete
              </button>
              <button
                onClick={() => setEditingDesk(null)}
                className="px-4 py-2 text-slate-500 font-bold hover:bg-slate-100 rounded-lg transition-colors text-sm uppercase"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  const newDesks = desks.map((d: any) => d.id === editingDesk.id ? editingDesk : d);
                  setDesks(newDesks);
                  setEditingDesk(null);
                  onSave(newDesks); // บันทึกลงฐานข้อมูลทันทีเมื่อแก้ไข
                }}
                className="px-5 py-2 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 transition-colors text-sm uppercase"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}