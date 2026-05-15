import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Redirect all requests to the new domain
  return NextResponse.redirect('https://classroom-booking.seatup2.workers.dev', {
    status: 308, // Permanent redirect
  });
}

// Configure which routes to run middleware on
export const config = {
  matcher: ['/:path*'],
};
