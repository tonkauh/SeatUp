🪑 SeatUp: Real-time Classroom Seating System

SeatUp is a real-time online seating reservation system designed to eliminate coordination chaos in classrooms. It focuses on speed, fairness, and precise spatial visualization.

🚀 The Viral Launch (Performance Metrics)

Upon its initial launch, the system experienced significant viral adoption with the following performance metrics:

Total Requests: 65,000+ requests within the first 24 hours.

Active Records: 1,000+ live booking transactions stored in the PostgreSQL database.

System Stability: Maintained a 0% Error Rate and 100% Uptime during peak traffic spikes (1.5K requests per 5-minute window).

Execution Efficiency: Processed 65,000 requests with a total CPU time of only 56 seconds (average ~0.8ms/request).

🛠️ Tech Stack

Frontend: Next.js 14 (App Router), Tailwind CSS, Lucide React

Backend: Next.js Serverless Functions, Supabase Authentication

Database: PostgreSQL (Supabase) with Real-time Subscriptions

Infrastructure: Vercel Edge Network & Observability Monitoring

✨ Key Features

Real-time Synchronization: Leverages Supabase Real-time to ensure seat availability updates instantly without page refreshes.

Spatial Grid Layout: Interactive classroom maps that mirror physical layouts for accurate seat selection.

Scalable Architecture: Built to handle massive concurrent users through efficient connection pooling and optimized database queries.

Responsive Experience: Fully optimized for seamless use across mobile and desktop devices.

🛡️ Database & Security

PostgreSQL Schema: Optimized relational schema maintaining a lean footprint (approx. ~26MB for 1,000+ records).

Data Integrity: Implements UUIDs for Primary/Foreign keys to ensure security and horizontal scalability.

Row-Level Security (RLS): (In-Progress) Architectural foundation laid for granular data access control, ensuring users can only modify their own reservations.

📸 Monitoring & Insights

<img width="587" height="249" alt="Screenshot 2569-05-10 at 10 27 26" src="https://github.com/user-attachments/assets/79148eea-96b8-41f2-b416-ccc795f91bc7" />

👨‍💻 Developer

Kittiphon Maneetan Computer Science Student at Assumption University

Live Project: seatup.vercel.app

Developed with ❤️ to bring order to classroom chaos.