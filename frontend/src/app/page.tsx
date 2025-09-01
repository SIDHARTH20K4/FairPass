import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 bg-gradient-to-br from-foreground/5 via-transparent to-foreground/5"></div>
        
        <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-16 sm:py-20 lg:py-24">
          <div className="text-center fade-in">
            {/* Main Heading */}
            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-foreground mb-4 sm:mb-6 leading-tight">
              Welcome to{" "}
              <span className="relative">
                FairPass
                <div className="absolute -bottom-2 left-0 right-0 h-1 bg-foreground/20 rounded-full"></div>
              </span>
            </h1>
            
            {/* Subtitle */}
            <p className="text-lg sm:text-xl md:text-2xl text-foreground/70 max-w-2xl sm:max-w-3xl mx-auto mb-8 sm:mb-12 leading-relaxed px-4">
              Discover amazing events happening around the world. 
              Connect your wallet and start exploring the future of event ticketing.
            </p>
            
            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center items-center mb-12 sm:mb-16 px-4">
              <Link
                href="/events"
                className="btn-primary text-base sm:text-lg px-6 sm:px-8 py-3 sm:py-4 group w-full sm:w-auto"
              >
                <span>Explore Events</span>
                <svg className="w-4 h-4 sm:w-5 sm:h-5 ml-2 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </Link>
              
              <Link
                href="/host/signin"
                className="btn-secondary text-base sm:text-lg px-6 sm:px-8 py-3 sm:py-4 group w-full sm:w-auto"
              >
                <span>Host Events</span>
                <svg className="w-4 h-4 sm:w-5 sm:h-5 ml-2 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 sm:py-20 lg:py-24 bg-foreground/2">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12 sm:mb-16 fade-in">
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4 sm:mb-6">
              Why Choose FairPass?
            </h2>
            <p className="text-lg sm:text-xl text-foreground/70 max-w-2xl mx-auto px-4">
              Experience the next generation of event management with blockchain technology
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            {/* Feature 1 */}
            <div className="card p-6 sm:p-8 text-center group hover:scale-105 transition-all duration-300 slide-in" style={{ animationDelay: '100ms' }}>
              <div className="w-14 h-14 sm:w-16 sm:h-16 glass rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6 group-hover:scale-110 transition-transform">
                <svg className="w-7 h-7 sm:w-8 sm:h-8 text-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-lg sm:text-xl font-semibold text-foreground mb-3 sm:mb-4">Secure Ticketing</h3>
              <p className="text-sm sm:text-base text-foreground/70 leading-relaxed">
                Blockchain-powered tickets ensure authenticity and prevent fraud
              </p>
            </div>
            
            {/* Feature 2 */}
            <div className="card p-6 sm:p-8 text-center group hover:scale-105 transition-all duration-300 slide-in" style={{ animationDelay: '200ms' }}>
              <div className="w-14 h-14 sm:w-16 sm:h-16 glass rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6 group-hover:scale-110 transition-transform">
                <svg className="w-7 h-7 sm:w-8 sm:h-8 text-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h3 className="text-lg sm:text-xl font-semibold text-foreground mb-3 sm:mb-4">Global Events</h3>
              <p className="text-sm sm:text-base text-foreground/70 leading-relaxed">
                Discover events from around the world in one seamless platform
              </p>
            </div>
            
            {/* Feature 3 */}
            <div className="card p-6 sm:p-8 text-center group hover:scale-105 transition-all duration-300 slide-in" style={{ animationDelay: '300ms' }}>
              <div className="w-14 h-14 sm:w-16 sm:h-16 glass rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6 group-hover:scale-110 transition-transform">
                <svg className="w-7 h-7 sm:w-8 sm:h-8 text-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="text-lg sm:text-xl font-semibold text-foreground mb-3 sm:mb-4">Lightning Fast</h3>
              <p className="text-sm sm:text-base text-foreground/70 leading-relaxed">
                Instant transactions and real-time updates powered by modern technology
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 sm:py-20 lg:py-24">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 text-center">
          <div className="card p-8 sm:p-10 lg:p-12 fade-in">
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-4 sm:mb-6">
              Ready to Get Started?
            </h2>
            <p className="text-base sm:text-lg text-foreground/70 mb-6 sm:mb-8 max-w-2xl mx-auto">
              Join thousands of users who are already discovering and hosting amazing events on FairPass
            </p>
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
          <Link
            href="/events"
                className="btn-primary text-base sm:text-lg px-6 sm:px-8 py-3 sm:py-4 w-full sm:w-auto"
              >
                Start Exploring
              </Link>
              <Link
                href="/host/register"
                className="btn-secondary text-base sm:text-lg px-6 sm:px-8 py-3 sm:py-4 w-full sm:w-auto"
              >
                Become a Host
          </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
