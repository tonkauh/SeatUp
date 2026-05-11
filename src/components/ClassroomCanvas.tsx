'use client'
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useDialog } from '@/components/DialogContext';
import { Stage, Layer, Rect, Text, Group, Path, Transformer } from 'react-konva';

interface ClassroomCanvasProps {
  initialLayout: any[];
  bookings?: any[]; // เพิ่ม Prop รับข้อมูลการจอง
  onSave: (data: any) => void;
  onCancelBooking?: (deskLabel: string, silent?: boolean) => Promise<boolean>;
  isReadOnly?: boolean;
}

export default function ClassroomCanvas({ 
  initialLayout, 
  bookings = [], // กำหนดค่าเริ่มต้นเป็นอาเรย์ว่าง
  onSave, 
  onCancelBooking,
  isReadOnly = false 
}: ClassroomCanvasProps) {
  const [desks, setDesks] = useState(initialLayout || []);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 500 });
  
  // ระบบ Zoom & Pan
  const [scale, setScale] = useState(1);
  const [stagePos, setStagePos] = useState({ x: 0, y: 0 });
  const lastDist = useRef<number>(0);
  
  const [selectedId, setSelectedId] = useState<string | null>(null); // State สำหรับโต๊ะที่ถูกเลือก (Canva style)
  const stageRef = useRef<any>(null);
  const trRef = useRef<any>(null);
  const { showAlert, showConfirm } = useDialog();
  const [toast, setToast] = useState<{ message: string; type: 'error' | 'success' } | null>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const [useMagnetGrid, setUseMagnetGrid] = useState(true); // สำหรับเปิด-ปิด Snap to Grid เวลาลาก
  const [showAutoLayoutModal, setShowAutoLayoutModal] = useState(false);
  const [autoLayoutConfig, setAutoLayoutConfig] = useState({
    totalDesks: 30,
    desksPerRow: 5, // จำนวนโต๊ะต่อแถว (แนวนอน)
    deskType: 'single' as 'single' | 'double'
  });

  // ฟังก์ชันบันทึกแบบหน่วงเวลา (Debounce) เพื่อลดจำนวน Request ตอนแก้ไข
  const debouncedSave = useCallback((data: any) => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    saveTimeoutRef.current = setTimeout(() => {
      onSave(data);
      setToast({ message: 'บันทึกแผนผังอัตโนมัติแล้ว', type: 'success' });
      setTimeout(() => setToast(null), 2000);
    }, 1500); // รอ 1.5 วินาทีหลังแก้ไขล่าสุดถึงจะยิง API
  }, [onSave]);

  useEffect(() => {
    // Clear timeout เมื่อ component unmount ป้องกัน memory leak
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, [debouncedSave]);

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

  // ผูก Transformer เข้ากับวัตถุที่ถูกเลือก
  useEffect(() => {
    if (!isReadOnly && selectedId && trRef.current && stageRef.current) {
      const node = stageRef.current.findOne('#' + selectedId);
      if (node) {
        trRef.current.nodes([node]);
        trRef.current.getLayer().batchDraw();
      }
    }
  }, [selectedId, desks, isReadOnly]);

  // ระบบ Pinch-to-Zoom สำหรับหน้าจอมือถือ (ใช้ 2 นิ้วซูม)
  const getDistance = (p1: any, p2: any) => {
    return Math.sqrt(Math.pow(p2.clientX - p1.clientX, 2) + Math.pow(p2.clientY - p1.clientY, 2));
  };

  const getCenter = (p1: any, p2: any) => {
    return { x: (p1.clientX + p2.clientX) / 2, y: (p1.clientY + p2.clientY) / 2 };
  };

  const handleTouchStart = (e: any) => {
    if (e.evt.touches.length === 2) {
      const touch1 = e.evt.touches[0];
      const touch2 = e.evt.touches[1];
      lastDist.current = getDistance(touch1, touch2);
    }
  };

  const handleTouchMove = (e: any) => {
    e.evt.preventDefault();
    if (e.evt.touches.length === 2) {
      const touch1 = e.evt.touches[0];
      const touch2 = e.evt.touches[1];

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
  const deskHeight = 60; // ปรับจาก 55 เป็น 60 เพื่อให้หาร 20 ลงตัว (พอดี 3 ช่อง Grid)

  // ฟังก์ชันอัปเดตข้อมูลโต๊ะ/สิ่งของแบบรวดเร็ว
  const updateDesk = (id: string, changes: any) => {
    const newDesks = desks.map((d: any) => d.id === id ? { ...d, ...changes } : d);
    setDesks(newDesks);
    debouncedSave(newDesks); // บันทึกลงฐานข้อมูลแบบหน่วงเวลา
  };

  // อัปเดตตำแหน่งเมื่อลากโต๊ะเสร็จ
  const handleDragEnd = (id: string, e: any) => {
    if (isReadOnly) return;
    if (e.target === e.target.getStage()) return; // ป้องกันไม่ให้อัปเดตโต๊ะ ถ้าผู้ใช้กำลังลากพื้นกระดาน (Stage)

        const newX = useMagnetGrid ? Math.round(e.target.x() / 20) * 20 : e.target.x();
        const newY = useMagnetGrid ? Math.round(e.target.y() / 20) * 20 : e.target.y();

        const currentDesk = desks.find((d: any) => d.id === id);
        const cWidth = currentDesk?.width || deskWidth;
        const cHeight = currentDesk?.height || deskHeight;

        // เช็กการซ้อนทับ (Collision Detection)
        const margin = 10; // ระยะยืดหยุ่นยอมให้ขอบซ้อนทับกันได้ 10px
        const isColliding = desks.some((d: any) => {
          if (d.id === id) return false; // ไม่เช็กตัวเอง
          const dWidth = d.width || deskWidth;
          const dHeight = d.height || deskHeight;
          // ค้นหาว่าขอบของโต๊ะทับกันหรือไม่ (หักลบ margin ออก)
          return (
            newX + margin < d.x + dWidth - margin &&
            newX + cWidth - margin > d.x + margin &&
            newY + margin < d.y + dHeight - margin &&
            newY + cHeight - margin > d.y + margin
          );
        });

        if (isColliding) {
          // ถ้าซ้อนทับ ให้เด้งกลับไปจุดเดิม
          const originalDesk = desks.find((d: any) => d.id === id);
          if (originalDesk) {
            e.target.position({ x: originalDesk.x, y: originalDesk.y });
            e.target.getLayer()?.batchDraw(); // สั่งให้วาดเฟรมใหม่เพื่อรีเฟรช UI ทันที
          }
          setToast({ message: 'ไม่สามารถวางโต๊ะซ้อนทับกันได้ครับ', type: 'error' });
          setTimeout(() => setToast(null), 3000); // แจ้งเตือน 3 วินาทีแล้วซ่อนเอง
          return;
        }

    const newDesks = desks.map((d: any) => {
      if (d.id === id) {
        return { ...d, x: newX, y: newY };
      }
      return d;
    });
    setDesks(newDesks);
    debouncedSave(newDesks); // บันทึกลงฐานข้อมูลแบบหน่วงเวลาเมื่อลากเสร็จ
  };

  // ฟังก์ชันเพิ่มโต๊ะใหม่ลงใน Canvas
  const handleAddDesk = () => {
        let newX = 60;
        let newY = 60;
        let isOccupied = true;
        const margin = 10;
        
        // หาตำแหน่งที่ว่างเพื่อไม่ให้โต๊ะเกิดมาทับกัน
        while (isOccupied) {
          isOccupied = desks.some((d: any) => {
            const dWidth = d.width || deskWidth;
            const dHeight = d.height || deskHeight;
            return (
              newX + margin < d.x + dWidth - margin && newX + deskWidth - margin > d.x + margin &&
              newY + margin < d.y + dHeight - margin && newY + deskHeight - margin > d.y + margin
            )
          });
          if (isOccupied) {
            newX += deskWidth + 20; // เลื่อนหาที่ว่างไปทางขวาทีละช่วงโต๊ะ
            // ถ้าหาที่ว่างไปจนสุดขอบกระดาน (ประมาณ 1000px) ให้ขึ้นบรรทัดใหม่
            if (newX > 1000) {
              newX = 60;
              newY += deskHeight + 20;
            }
          }
        }

    const newDesk = {
      id: `T${Date.now()}`,
          x: newX, 
          y: newY,
      label: `T${desks.length + 1}` // รันเลขโต๊ะอัตโนมัติตามจำนวนที่มี
    };
    const updatedDesks = [...desks, newDesk];
    setDesks(updatedDesks);
    onSave(updatedDesks); // บันทึกลงฐานข้อมูลอัตโนมัติเมื่อเพิ่มโต๊ะใหม่
  };

  // ฟังก์ชันจัดโต๊ะอัตโนมัติ (Auto-Layout)
  const handleAutoLayout = async () => {
    const { totalDesks, desksPerRow, deskType } = autoLayoutConfig;
    const newDesks = [];
    const spacingX = 40; // เพิ่มระยะห่างเป็น 40px (2 ช่อง Grid) ให้เท่ากันชัดเจน
    const spacingY = 40;
    const safeItemsPerRow = Math.max(1, desksPerRow); // ป้องกันหาร 0

    let startX = 60;
    const startY = 60; // เปลี่ยนจาก 50 เป็น 60 ให้ลงล็อก Grid

    // คำนวณความกว้างรวมเพื่อหาจุดเริ่มต้นกึ่งกลาง
    let totalWidth = 0;
    if (deskType === 'single') {
      const cols = Math.min(totalDesks, safeItemsPerRow);
      totalWidth = cols * deskWidth + Math.max(0, cols - 1) * spacingX;
    } else {
      const totalPairs = Math.ceil(totalDesks / 2);
      const cols = Math.min(totalPairs, safeItemsPerRow);
      totalWidth = cols * (2 * deskWidth) + Math.max(0, cols - 1) * spacingX;
    }
    startX = Math.max(60, (dimensions.width - totalWidth) / 2);
    startX = Math.round(startX / 20) * 20; // บังคับให้จุดเริ่มแกน X ลงล็อก Magnet Grid 100%

    for (let i = 0; i < totalDesks; i++) {
      let row, col, x = 0, y = 0;

      if (deskType === 'single') {
        col = i % safeItemsPerRow; // จัดเรียงแนวนอนทีละแถว
        row = Math.floor(i / safeItemsPerRow);
        
        x = startX + col * (deskWidth + spacingX);
        y = startY + row * (deskHeight + spacingY);

      } else if (deskType === 'double') {
        const pairIndex = Math.floor(i / 2);
        const isSecondInPair = i % 2 !== 0;
        
        col = pairIndex % safeItemsPerRow;
        row = Math.floor(pairIndex / safeItemsPerRow);

        x = startX + col * (2 * deskWidth + spacingX);
        if (isSecondInPair) x += deskWidth; // โต๊ะคู่ตัวที่สองติดกับตัวแรก

        y = startY + row * (deskHeight + spacingY);
      }

      // Snap ลง Grid อัตโนมัติเวลาสร้าง
      if (useMagnetGrid) {
        x = Math.round(x / 20) * 20;
        y = Math.round(y / 20) * 20;
      }

      newDesks.push({
        id: `T${Date.now()}_${i}`,
        x, y,
        label: `T${i + 1}`,
        isLocked: false,
        isObject: false
      });
    }

    const isConfirmed = await showConfirm('การจัดโต๊ะอัตโนมัติจะล้างแผนผังเดิมทั้งหมด คุณแน่ใจหรือไม่?');
    if (isConfirmed) {
      setDesks(newDesks);
      setShowAutoLayoutModal(false);
      onSave(newDesks); // บันทึกลงฐานข้อมูลอัตโนมัติ
    }
  };

  const selectedDesk = desks.find((d: any) => d.id === selectedId);
  const activeBooking = selectedDesk ? bookings.find((b: any) => b.desk_id === selectedDesk.label) : null;

  return (
    <div 
      ref={containerRef}
      className="w-full h-full min-h-[50vh] md:min-h-[600px] flex-1 bg-slate-50 bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] [background-size:20px_20px] rounded-none md:rounded-xl border-y md:border border-slate-200 overflow-hidden relative group"
      style={{ touchAction: 'none' }} // ป้องกันจอไหลตอนใช้นิ้วลากแผนผัง
    >
      {/* Toast แจ้งเตือนขนาดเล็ก */}
      {toast && (
        <div className={`absolute top-20 md:top-4 left-1/2 -translate-x-1/2 z-[60] ${toast.type === 'error' ? 'bg-red-600' : 'bg-slate-900'} text-white px-4 py-2 rounded-lg shadow-lg font-bold text-sm animate-in fade-in slide-in-from-top-4 pointer-events-none`}>
          {toast.message}
        </div>
      )}
      
      {/* แสดงปุ่มบันทึกแผนผังเฉพาะในโหมด Admin/Editor */}
      {!isReadOnly && (
        <div className="absolute top-4 left-4 z-20 flex flex-wrap gap-2 bg-white/90 backdrop-blur p-2 rounded-lg shadow-sm border border-slate-200">
          {/* Toggle ปิด/เปิด Magnet Grid */}
          <label className="flex items-center gap-2 bg-slate-50 px-3 py-2 rounded-md border border-slate-200 cursor-pointer hover:bg-slate-100 transition-colors hidden md:flex">
            <input 
              type="checkbox" 
              checked={useMagnetGrid} 
              onChange={(e) => setUseMagnetGrid(e.target.checked)}
              className="w-4 h-4 text-slate-900 rounded focus:ring-slate-900 cursor-pointer"
            />
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Magnet Grid</span>
          </label>
          
          <button
            onClick={() => setShowAutoLayoutModal(true)}
            className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 px-4 py-2 rounded-md font-bold transition-colors text-sm flex items-center uppercase"
          >
            <span className="flex items-center gap-1.5">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg> Auto Layout
            </span>
          </button>
          <button
            onClick={handleAddDesk}
            className="bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-md font-bold transition-colors text-sm flex items-center uppercase"
          >
            <span className="flex items-center gap-1.5">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg> Add Desk
            </span>
          </button>
        </div>
      )}
      
      {/* เส้นบอกกึ่งกลางห้อง (UI ตามรูป) */}
      <div className="absolute top-0 bottom-0 left-1/2 w-px bg-slate-200 -translate-x-1/2 pointer-events-none hidden md:block" />

      {/* ชุดปุ่ม Zoom */}
      <div className="absolute bottom-6 right-4 flex items-center gap-1 bg-white/90 backdrop-blur p-1 rounded-lg shadow-sm border border-slate-200 z-20">
        <button onClick={() => setScale(s => Math.max(0.2, s / 1.2))} className="w-8 h-8 md:w-10 md:h-10 flex items-center justify-center bg-white hover:bg-slate-100 rounded-md text-slate-700 font-bold text-lg transition-colors">-</button>
        <button onClick={() => { setScale(1); setStagePos({ x: 0, y: 0 }); }} className="w-12 md:w-16 text-center text-xs md:text-sm font-bold text-slate-500 hover:text-slate-900 transition-colors">
          {Math.round(scale * 100)}%
        </button>
        <button onClick={() => setScale(s => Math.min(5, s * 1.2))} className="w-8 h-8 md:w-10 md:h-10 flex items-center justify-center bg-white hover:bg-slate-100 rounded-md text-slate-700 font-bold text-lg transition-colors">+</button>
      </div>
      
      <Stage 
        ref={stageRef}
        width={dimensions.width} 
        height={dimensions.height}
        scaleX={scale}
        scaleY={scale}
        x={stagePos.x}
        y={stagePos.y}
        draggable={true} // อนุญาตให้ลากกระดานได้
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
        onPointerDown={(e) => {
          // คลายการเลือกวัตถุเมื่อคลิกที่พื้นหลังกระดาน
          if (e.target === e.target.getStage()) {
            setSelectedId(null);
          }
        }}
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

            const currentWidth = desk.width || deskWidth;
            const currentHeight = desk.height || deskHeight;

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
                id={desk.id}
                x={desk.x}
                y={desk.y}
                width={currentWidth}
                height={currentHeight}
                draggable={!isReadOnly && !desk.isLocked} // ลากไม่ได้ถ้าถูกล็อก หรือเป็นโหมด ReadOnly
                dragBoundFunc={function(this: any, pos) {
                  let logicalX = (pos.x - stagePos.x) / scale;
                  let logicalY = (pos.y - stagePos.y) / scale;
                  
                  if (useMagnetGrid) {
                    logicalX = Math.round(logicalX / 20) * 20;
                    logicalY = Math.round(logicalY / 20) * 20;
                  }

                  return {
                    x: logicalX * scale + stagePos.x,
                    y: logicalY * scale + stagePos.y,
                  };
                }}
                onDragEnd={(e) => handleDragEnd(desk.id, e)}
                onTransform={(e) => {
                  const node = e.target as any; // แปลงเป็น any เพื่อแก้ปัญหา TypeScript หา findOne ไม่เจอ
                  const scaleX = node.scaleX();
                  const scaleY = node.scaleY();
                  
                  // รีเซ็ตสเกลกลับเป็น 1 ทันที เพื่อไม่ให้ฟอนต์หรือเส้นขอบยืดเบี้ยว
                  node.scaleX(1);
                  node.scaleY(1);

                  const newWidth = Math.max(20, node.width() * scaleX);
                  const newHeight = Math.max(20, node.height() * scaleY);

                  node.width(newWidth);
                  node.height(newHeight);

                  const bgRect = node.findOne('.bg-rect');
                  const centerText = node.findOne('.center-text');
                  const labelText = node.findOne('.label-text');

                  // อัปเดตขนาดชิ้นส่วนข้างในแบบเรียลไทม์
                  if (bgRect) { bgRect.width(newWidth); bgRect.height(newHeight); }
                  if (centerText) { centerText.width(newWidth); centerText.height(newHeight); }
                  if (labelText) { labelText.x(newWidth - 25); }
                }}
                onTransformEnd={(e) => {
                  const node = e.target as any;

                  let newX = node.x();
                  let newY = node.y();
                  let newWidth = Math.max(20, node.width());
                  let newHeight = Math.max(20, node.height());

                  if (useMagnetGrid) {
                    newX = Math.round(newX / 20) * 20;
                    newY = Math.round(newY / 20) * 20;
                    newWidth = Math.round(newWidth / 20) * 20;
                    newHeight = Math.round(newHeight / 20) * 20;
                    
                    // ปรับภาพให้ลง Grid ทันทีก่อน React จะ re-render ให้สมูท
                    node.position({ x: newX, y: newY });
                    node.width(newWidth);
                    node.height(newHeight);
                    
                    // ปรับขนาดชิ้นส่วนด้านในให้ตรงกับขนาดที่ลง Grid ด้วย ป้องกันภาพเพี้ยน
                    const bgRect = node.findOne('.bg-rect');
                    const centerText = node.findOne('.center-text');
                    const labelText = node.findOne('.label-text');
                    if (bgRect) { bgRect.width(newWidth); bgRect.height(newHeight); }
                    if (centerText) { centerText.width(newWidth); centerText.height(newHeight); }
                    if (labelText) { labelText.x(newWidth - 25); }

                    node.getLayer()?.batchDraw();
                  }

                  updateDesk(desk.id, { x: newX, y: newY, width: newWidth, height: newHeight, rotation: node.rotation() });
                }}
                onClick={() => {
                  if (isReadOnly) {
                    if (desk.isObject) return showAlert('นี่คือสิ่งของ ไม่สามารถจองได้ครับ');
                    if (!isBooked) {
                      onSave(desk.label); // ถ้าว่างถึงจะกดจองได้
                    } else {
                      showAlert(`โต๊ะหมายเลข ${desk.label} ถูกจองโดยคุณ ${ownerName} แล้วครับ`);
                    }
                  } else {
                    setSelectedId(desk.id); // เลือกวัตถุเพื่อยืดหด
                  }
                }}
                onTap={() => { // เพิ่ม onTap สำหรับรองรับบนมือถือ
                  if (isReadOnly) {
                    if (desk.isObject) return showAlert('นี่คือสิ่งของ ไม่สามารถจองได้ครับ');
                    if (!isBooked) {
                      onSave(desk.label);
                    } else {
                      showAlert(`โต๊ะหมายเลข ${desk.label} ถูกจองโดยคุณ ${ownerName} แล้วครับ`);
                    }
                  } else {
                    setSelectedId(desk.id);
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
                  name="bg-rect"
                  width={currentWidth}
                  height={currentHeight}
                  fill={fillColor}
                  stroke={strokeColor}
                  strokeWidth={2}
                  cornerRadius={10}
                  // ปิด Perfect Draw ช่วยลดอาการกระตุกตอนซูม/แพนมหาศาล
                  perfectDrawEnabled={false} 
                />
                
                {/* แสดงไอคอนล็อกเฉพาะโหมด Editor */}
                {!isReadOnly && desk.isLocked && (
                  <Path 
                    data="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" 
                    stroke="#64748B" 
                    strokeWidth={2} 
                    fill="none"
                    scale={{x: 0.5, y: 0.5}} 
                    x={5} 
                    y={5} 
                    listening={false} // ปิดการรับ Event คลิก
                    perfectDrawEnabled={false}
                  />
                )}

                {/* หมายเลขโต๊ะ (ซ่อนมุมบนขวาถ้าเป็นสิ่งของ) */}
                {!desk.isObject && (
                  <Text
                    name="label-text"
                    text={desk.label}
                    x={currentWidth - 25} // ชิดมุมขวาบน
                    y={5}
                    fontSize={10}
                    fontStyle="bold"
                    fill={isBooked ? "#94A3B8" : "#166534"}
                    listening={false} // ปิด Event ทำให้เมาส์ไม่หน่วง
                    perfectDrawEnabled={false}
                  />
                )}

                {/* ชื่อผู้จอง หรือชื่อสิ่งของ (แสดงตรงกลางโต๊ะ) */}
                <Text
                  name="center-text"
                  text={desk.isObject ? desk.label : (isBooked ? ownerName : 'ว่าง')} 
                  width={currentWidth}
                  height={currentHeight}
                  x={0}
                  y={0}
                  padding={10}
                  align="center"
                  verticalAlign="middle"
                  fontSize={12}
                  fontStyle={isBooked || desk.isObject ? "normal" : "bold"}
                  fill={desk.isObject ? "#475569" : (isBooked ? "#475569" : "#15803D")}
                  // ตัดคำถ้าชื่อยาวเกิน
                  ellipsis={true}
                  wrap="none"
                  listening={false}
                  perfectDrawEnabled={false}
                />
              </Group>
            );
          })}

          {/* กรอบ Transformer (จุดจับยืดหดรอบวัตถุ) */}
          {!isReadOnly && selectedId && selectedDesk && !selectedDesk.isLocked && (
            <Transformer
              ref={trRef}
              flipEnabled={false}
              rotateEnabled={false} // ปิดหมุนไปก่อนเพื่อความเรียบร้อยของห้อง
              boundBoxFunc={(oldBox, newBox) => {
                // ป้องกันไม่ให้ย่อจนเล็กกว่า 20px
                if (Math.abs(newBox.width) < 20 || Math.abs(newBox.height) < 20) return oldBox;
                return newBox;
              }}
            />
          )}
        </Layer>
      </Stage>

      {/* Panel ตั้งค่าวัตถุ (โหมด Editor แบบ Floating Panel) */}
      {!isReadOnly && selectedDesk && (
        <div 
          className="absolute bottom-24 left-1/2 -translate-x-1/2 md:bottom-auto md:top-4 md:left-auto md:right-4 md:translate-x-0 z-40 bg-white p-4 md:p-5 rounded-2xl shadow-2xl border border-slate-200 w-[92%] max-w-[340px] max-h-[70vh] overflow-y-auto animate-in slide-in-from-bottom-4"
          onPointerDown={(e) => e.stopPropagation()}
          onWheel={(e) => e.stopPropagation()}
        >
          <div className="flex justify-between items-center mb-4 border-b border-slate-100 pb-3">
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
              <svg className="w-4 h-4 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
              ตั้งค่าวัตถุ
            </h3>
            <button onClick={() => setSelectedId(null)} className="text-slate-400 hover:text-slate-600 bg-slate-50 hover:bg-slate-100 p-1.5 rounded-full transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1 block">ชื่อโต๊ะ / สิ่งของ</label>
              <input
                type="text"
                value={selectedDesk.label}
                onChange={(e) => updateDesk(selectedDesk.id, { label: e.target.value })}
                className="w-full p-2.5 border border-slate-300 rounded-lg outline-none focus:border-indigo-500 font-bold text-slate-800 text-sm transition-colors"
              />
            </div>
            
            {/* Checkboxes */}
            <label className="flex items-center gap-3 p-2.5 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50 transition-colors">
              <input
                type="checkbox"
                checked={selectedDesk.isLocked || false}
                onChange={(e) => updateDesk(selectedDesk.id, { isLocked: e.target.checked })}
                className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500 cursor-pointer"
              />
              <div className="flex-1">
                <div className="text-xs font-bold text-slate-800">ล็อกตำแหน่ง (ป้องกันการเผลอขยับ)</div>
              </div>
            </label>
  
            <label className="flex items-center gap-3 p-2.5 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50 transition-colors">
              <input
                type="checkbox"
                checked={selectedDesk.isObject || false}
                onChange={(e) => updateDesk(selectedDesk.id, { isObject: e.target.checked })}
                className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500 cursor-pointer"
              />
              <div className="flex-1">
                <div className="text-xs font-bold text-slate-800">ตั้งเป็นสิ่งของ (ผู้ใช้จะจองไม่ได้)</div>
              </div>
            </label>
  
            {selectedDesk.isObject && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 block">ความกว้าง (Width)</label>
                  <input
                    type="number"
                    value={Math.round(selectedDesk.width || deskWidth)}
                    onChange={(e) => updateDesk(selectedDesk.id, { width: parseInt(e.target.value) || 80 })}
                    className="w-full p-2 border border-slate-300 rounded-lg outline-none focus:border-indigo-500 font-bold text-slate-800 text-sm transition-colors"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 block">ความสูง (Height)</label>
                  <input
                    type="number"
                    value={Math.round(selectedDesk.height || deskHeight)}
                    onChange={(e) => updateDesk(selectedDesk.id, { height: parseInt(e.target.value) || 60 })}
                    className="w-full p-2 border border-slate-300 rounded-lg outline-none focus:border-indigo-500 font-bold text-slate-800 text-sm transition-colors"
                  />
                </div>
              </div>
            )}
  
            {/* Cancel Booking Button */}
            {activeBooking && (
              <button
                onClick={async () => {
                  if (onCancelBooking) {
                    await onCancelBooking(selectedDesk.label);
                  }
                }}
                className="w-full mt-2 py-2.5 bg-orange-50 text-orange-600 font-bold rounded-lg hover:bg-orange-100 transition-colors text-xs uppercase tracking-wider flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg> ยกเลิกการจองของโต๊ะนี้
              </button>
            )}

            {/* Delete Button */}
            <button
              onClick={async () => {
                if (activeBooking) {
                  const confirmed = await showConfirm(`โต๊ะ ${selectedDesk.label} มีคุณ ${activeBooking.user_name} จองอยู่\nหากลบโต๊ะ การจองจะถูกยกเลิกด้วย ยืนยันลบหรือไม่?`);
                  if (!confirmed) return;
                  if (onCancelBooking) {
                    await onCancelBooking(selectedDesk.label, true);
                  }
                }
                const newDesks = desks.filter((d: any) => d.id !== selectedDesk.id);
                setDesks(newDesks);
                setSelectedId(null);
                onSave(newDesks);
              }}
              className="w-full mt-2 py-2.5 bg-red-50 text-red-600 font-bold rounded-lg hover:bg-red-100 transition-colors text-xs uppercase tracking-wider flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg> ลบวัตถุนี้
            </button>
          </div>
        </div>
      )}

      {/* Modal สำหรับจัดโต๊ะอัตโนมัติ */}
      {!isReadOnly && showAutoLayoutModal && (
        <div 
          className="absolute inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
          onPointerDown={(e) => e.stopPropagation()}
          onWheel={(e) => e.stopPropagation()}
        >
          <div className="bg-white p-6 rounded-xl shadow-xl w-full max-w-md border border-slate-200 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold mb-4 text-slate-900 uppercase border-b border-slate-100 pb-2 flex items-center gap-2">
              <svg className="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg> Auto Layout
            </h3>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1 block">จำนวนโต๊ะทั้งหมด</label>
                  <input type="number" value={autoLayoutConfig.totalDesks} onChange={(e) => setAutoLayoutConfig({...autoLayoutConfig, totalDesks: parseInt(e.target.value) || 0})} className="w-full p-2.5 border border-slate-300 rounded-lg outline-none focus:border-slate-900 font-bold text-slate-800 transition-colors" />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1 block">จำนวนโต๊ะต่อแถว (แนวนอน)</label>
                  <input type="number" value={autoLayoutConfig.desksPerRow} onChange={(e) => setAutoLayoutConfig({...autoLayoutConfig, desksPerRow: parseInt(e.target.value) || 0})} className="w-full p-2.5 border border-slate-300 rounded-lg outline-none focus:border-slate-900 font-bold text-slate-800 transition-colors" />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1 block">ประเภทโต๊ะ</label>
                <select
                  value={autoLayoutConfig.deskType}
                  onChange={(e) => setAutoLayoutConfig({...autoLayoutConfig, deskType: e.target.value as 'single' | 'double'})}
                  className="w-full p-2.5 border border-slate-300 rounded-lg outline-none focus:border-slate-900 font-bold text-slate-800 transition-colors bg-white"
                >
                  <option value="single">โต๊ะเดี่ยว (Single)</option>
                  <option value="double">โต๊ะคู่ (Double)</option>
                </select>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={() => setShowAutoLayoutModal(false)}
                className="px-4 py-2 text-slate-500 font-bold hover:bg-slate-100 rounded-lg transition-colors text-sm uppercase"
              >
                Cancel
              </button>
              <button
                onClick={handleAutoLayout}
                className="px-5 py-2 bg-slate-900 text-white font-bold rounded-lg hover:bg-slate-800 transition-colors text-sm uppercase"
              >
                Generate Layout
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}