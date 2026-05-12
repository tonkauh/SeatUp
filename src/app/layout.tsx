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
          <div className="w-20 h-20 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-red-500 mb-4 tracking-wide">ปิดให้บริการชั่วคราว</h1>
          <p className="text-slate-300 leading-relaxed text-sm md:text-base mb-8">
            เนื่องจากระบบตรวจพบการโจมตีจากผู้ไม่ประสงค์ดี ทางทีมพัฒนาจึงมีความจำเป็นต้อง <strong className="text-white">ระงับการใช้งานชั่วคราว</strong> เพื่อตรวจสอบข้อมูลและยกระดับความปลอดภัย
          </p>
          
          <div className="w-16 h-1 bg-slate-700 mx-auto mb-6 rounded-full"></div>
          
          <p className="text-slate-400 text-sm">
            ขออภัยในความไม่สะดวกมา ณ ที่นี้ครับ<br/>
            <span className="block mt-3 font-mono text-xs text-slate-600">System Locked by Admin</span>
          </p>
        </div>
      </body>
    </html>
  );
}
