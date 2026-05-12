import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SeatUp",
  description: "ระบบจองที่นั่งห้องเรียน",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-slate-900 text-white items-center justify-center p-4">
        <div className="max-w-lg w-full bg-slate-800 p-8 md:p-10 rounded-[2.5rem] border border-slate-700 text-center shadow-2xl">
          <div className="w-20 h-20 bg-slate-700 text-slate-400 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg>
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-white mb-4 tracking-wide">ยุติการให้บริการ (End of Service)</h1>
          <p className="text-slate-300 leading-relaxed text-sm md:text-base mb-8 text-left">
            <strong className="text-white">เรียนผู้ใช้ทุกท่าน</strong><br/><br/>
            โปรเจกต์ SeatUp ได้เดินทางมาถึงจุดสิ้นสุดแล้วครับ ระบบนี้ถูกสร้างขึ้นเพื่อเป็นโปรเจกต์สำหรับการศึกษาและแก้ไขปัญหาการจองที่นั่งในห้องเรียน ซึ่งได้รับการตอบรับที่ดีเกินความคาดหมาย
            <br/><br/>
            อย่างไรก็ตาม ด้วยข้อจำกัดด้านทรัพยากรในการดูแลรักษาระบบในระยะยาว และเพื่อป้องกันปัญหาด้านความปลอดภัยที่อาจเกิดขึ้นในอนาคต ทีมพัฒนาจึงตัดสินใจยุติการให้บริการอย่างเป็นทางการ
          </p>
          
          <div className="w-16 h-1 bg-slate-700 mx-auto mb-6 rounded-full"></div>
          
          <p className="text-slate-400 text-sm">
            ขอขอบคุณทุกท่านที่เคยเข้ามาใช้งานและให้การสนับสนุนตลอดมาครับ<br/>
            <span className="block mt-3 font-mono text-xs text-slate-600">— ทีมพัฒนา SeatUp</span>
          </p>
        </div>
      </body>
    </html>
  );
}
