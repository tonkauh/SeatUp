/** @type {import('next').NextConfig} */
const nextConfig = {
  // สั่งให้เปลี่ยนชื่อโฟลเดอร์ Cache เป็น .nosync เพื่อป้องกัน iCloud ดึงไฟล์จนพัง (os error 2)
  distDir: process.env.NODE_ENV === 'development' ? '.next.nosync' : '.next',
};

export default nextConfig;