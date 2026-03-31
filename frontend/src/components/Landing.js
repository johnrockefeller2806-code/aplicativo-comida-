import React from "react";
import { useNavigate } from "react-router-dom";
import { ShoppingBag, Store, Bike, Zap, Clock, Shield, ChevronRight, Star, MapPin, Heart, ArrowRight } from "lucide-react";

const FOOD_IMAGES = [
  { src: "https://images.pexels.com/photos/1327393/pexels-photo-1327393.jpeg?auto=compress&cs=tinysrgb&w=600", alt: "Gourmet plate" },
  { src: "https://images.pexels.com/photos/3915911/pexels-photo-3915911.jpeg?auto=compress&cs=tinysrgb&w=600", alt: "Loaded potato" },
  { src: "https://images.unsplash.com/photo-1669109230799-6d4d1d54e7c6?w=600&q=80", alt: "Pasta" },
  { src: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600&q=80", alt: "Burger" },
  { src: "https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=600&q=80", alt: "Sushi" },
  { src: "https://images.pexels.com/photos/36040894/pexels-photo-36040894.jpeg?auto=compress&cs=tinysrgb&w=600", alt: "Baked potato" },
];

const TESTIMONIALS = [
  { name: "Sofia R.", text: "Finally a delivery app that treats riders fairly! And the food arrives hot every time.", rating: 5, avatar: "S" },
  { name: "Liam O.", text: "As a student rider, the 20h tracker is a lifesaver. I earn well on weekends!", rating: 5, avatar: "L" },
  { name: "Maria C.", text: "Crazy Potato through Kangaroos is the best combo. Love tracking my order in real time!", rating: 5, avatar: "M" },
];

export default function Landing() {
  const nav = useNavigate();

  return (
    <div className="min-h-screen bg-[#FAF9F6]" data-testid="landing-page">
      {/* Nav */}
      <nav className="glass-nav sticky top-0 z-50 px-6 py-3">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/logo.svg" alt="Kangaroos" className="w-10 h-10 object-contain" />
            <span className="font-heading font-bold text-xl text-[#1A1D1A]">Kangaroos</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => nav("/auth/rider")}
              className="hidden sm:inline-flex px-4 py-2 text-[#8B5E3C] font-semibold text-sm hover:bg-[#8B5E3C]/5 rounded-full transition-colors"
              data-testid="nav-deliver-btn"
            >
              Become a Rider
            </button>
            <button
              onClick={() => nav("/auth/restaurant")}
              className="hidden sm:inline-flex px-4 py-2 text-[#1E3F20] font-semibold text-sm hover:bg-[#1E3F20]/5 rounded-full transition-colors"
              data-testid="nav-restaurant-btn"
            >
              Add Restaurant
            </button>
            <button
              onClick={() => nav("/auth/customer")}
              className="px-5 py-2.5 bg-[#D97746] text-white rounded-full font-semibold text-sm hover:bg-[#C46838] transition-colors active:scale-95"
              data-testid="nav-login-btn"
            >
              Sign In
            </button>
          </div>
        </div>
      </nav>

      {/* HERO - Full Width with Background Image */}
      <section className="relative min-h-[85vh] flex items-center overflow-hidden">
        {/* Background image */}
        <div className="absolute inset-0">
          <img
            src="https://images.pexels.com/photos/4393440/pexels-photo-4393440.jpeg?auto=compress&cs=tinysrgb&w=1920"
            alt="Happy delivery"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#1A1D1A]/90 via-[#1A1D1A]/70 to-[#1A1D1A]/30" />
        </div>

        <div className="relative z-10 max-w-6xl mx-auto px-6 py-20 grid lg:grid-cols-2 gap-12 items-center">
          <div className="animate-fade-in-up">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#D97746] rounded-full mb-6">
              <Zap className="w-4 h-4 text-white" />
              <span className="text-sm font-bold text-white">Riders get paid INSTANTLY</span>
            </div>
            <h1 className="font-heading font-extrabold text-5xl sm:text-6xl lg:text-7xl tracking-tighter text-white mb-6 leading-[1.05]">
              Your food,<br />
              <span className="text-[#D97746]">delivered</span><br />
              with love
            </h1>
            <p className="text-lg text-white/80 mb-10 max-w-md leading-relaxed">
              Dublin's fairest delivery platform. Great food from local restaurants, delivered fast by riders who are paid right.
            </p>
            <div className="flex flex-wrap gap-4">
              <button
                onClick={() => nav("/auth/customer")}
                className="group px-10 py-5 bg-[#D97746] text-white rounded-full font-bold text-lg hover:bg-[#C46838] transition-all active:scale-95 flex items-center gap-3 shadow-xl shadow-[#D97746]/30"
                data-testid="hero-order-btn"
              >
                Order Now
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
              <button
                onClick={() => nav("/auth/rider")}
                className="px-10 py-5 bg-white/10 backdrop-blur-sm text-white border border-white/20 rounded-full font-bold text-lg hover:bg-white/20 transition-all active:scale-95"
                data-testid="hero-rider-btn"
              >
                Start Earning
              </button>
            </div>

            {/* Quick Stats */}
            <div className="flex items-center gap-8 mt-12">
              <div>
                <p className="font-heading font-bold text-3xl text-white">15min</p>
                <p className="text-xs text-white/50 uppercase tracking-wider">avg. delivery</p>
              </div>
              <div className="w-px h-10 bg-white/20" />
              <div>
                <p className="font-heading font-bold text-3xl text-[#D97746]">EUR 2.99</p>
                <p className="text-xs text-white/50 uppercase tracking-wider">delivery fee</p>
              </div>
              <div className="w-px h-10 bg-white/20" />
              <div>
                <p className="font-heading font-bold text-3xl text-white">4.8</p>
                <p className="text-xs text-white/50 uppercase tracking-wider flex items-center gap-1"><Star className="w-3 h-3 fill-[#D97746] text-[#D97746]" /> rating</p>
              </div>
            </div>
          </div>

          {/* Floating food cards */}
          <div className="hidden lg:block relative">
            <div className="relative w-[420px] h-[500px] mx-auto">
              <div className="absolute top-0 right-0 w-64 h-64 rounded-3xl overflow-hidden shadow-2xl animate-fade-in-up" style={{animationDelay: '0.2s'}}>
                <img src={FOOD_IMAGES[0].src} alt={FOOD_IMAGES[0].alt} className="w-full h-full object-cover" />
              </div>
              <div className="absolute bottom-12 left-0 w-56 h-56 rounded-3xl overflow-hidden shadow-2xl animate-fade-in-up" style={{animationDelay: '0.4s'}}>
                <img src={FOOD_IMAGES[1].src} alt={FOOD_IMAGES[1].alt} className="w-full h-full object-cover" />
              </div>
              <div className="absolute top-32 left-8 w-44 h-44 rounded-3xl overflow-hidden shadow-2xl animate-fade-in-up" style={{animationDelay: '0.6s'}}>
                <img src={FOOD_IMAGES[3].src} alt={FOOD_IMAGES[3].alt} className="w-full h-full object-cover" />
              </div>
              {/* Instant Payment popup */}
              <div className="absolute bottom-0 right-4 bg-white rounded-2xl shadow-2xl p-4 animate-fade-in-up" style={{animationDelay: '0.8s'}}>
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 bg-green-100 rounded-full flex items-center justify-center">
                    <Zap className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <p className="font-heading font-bold text-sm text-[#1A1D1A]">Payment received!</p>
                    <p className="text-xs text-[#5C635A]">EUR 7.00 - instant payout</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Food Gallery Carousel */}
      <section className="py-16 overflow-hidden bg-white">
        <div className="max-w-6xl mx-auto px-6 mb-10">
          <h2 className="font-heading font-bold text-3xl text-[#1A1D1A] text-center">
            Taste Dublin's <span className="text-[#D97746]">Best</span>
          </h2>
          <p className="text-center text-[#5C635A] mt-2">From baked potatoes to sushi, your favorites delivered hot</p>
        </div>
        <div className="flex gap-4 overflow-x-auto pb-4 px-6 snap-x scroll-smooth no-scrollbar">
          {FOOD_IMAGES.map((img, i) => (
            <div key={i} className="flex-shrink-0 w-72 h-48 rounded-2xl overflow-hidden snap-center card-hover" data-testid={`food-gallery-${i}`}>
              <img src={img.src} alt={img.alt} className="w-full h-full object-cover hover:scale-110 transition-transform duration-500" />
            </div>
          ))}
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 bg-[#F3EFE9]">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="font-heading font-bold text-3xl text-center mb-4 text-[#1A1D1A]">How Kangaroos Works</h2>
          <p className="text-center text-[#5C635A] mb-14">Three simple steps to happiness</p>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { step: "01", title: "Choose & Order", desc: "Browse local restaurants, pick your favorites, and order in seconds", icon: ShoppingBag, color: "from-[#D97746] to-[#C46838]", img: FOOD_IMAGES[4].src },
              { step: "02", title: "We Prepare", desc: "Restaurant gets your order and starts cooking right away", icon: Clock, color: "from-[#1E3F20] to-[#163018]", img: FOOD_IMAGES[2].src },
              { step: "03", title: "Fast Delivery", desc: "A nearby rider picks up and brings it to your door", icon: Bike, color: "from-[#8B5E3C] to-[#6F4B2F]", img: "https://images.unsplash.com/photo-1757777440206-00dcce0205e3?w=600&q=80" },
            ].map((s, i) => (
              <div key={i} className="group relative bg-white rounded-3xl overflow-hidden card-hover border border-[#E5E1D8]" data-testid={`step-card-${i}`}>
                <div className="h-44 overflow-hidden">
                  <img src={s.img} alt={s.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                  <div className={`absolute top-4 left-4 bg-gradient-to-br ${s.color} w-12 h-12 rounded-xl flex items-center justify-center shadow-lg`}>
                    <span className="font-heading font-bold text-white text-lg">{s.step}</span>
                  </div>
                </div>
                <div className="p-6">
                  <h3 className="font-heading font-bold text-xl mb-2">{s.title}</h3>
                  <p className="text-[#5C635A] leading-relaxed">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why Kangaroos - Features */}
      <section className="py-20 bg-[#1A1D1A] text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#D97746]/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-[#1E3F20]/20 rounded-full blur-[100px]" />
        <div className="max-w-6xl mx-auto px-6 relative z-10">
          <h2 className="font-heading font-bold text-3xl text-center mb-4">Why Kangaroos?</h2>
          <p className="text-center text-white/50 mb-14">Built different. Built fair.</p>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { icon: Zap, title: "Instant Payment", desc: "Riders get paid the second they complete a delivery. No waiting, no delays. EUR 2.99 per delivery, instantly.", color: "#D97746" },
              { icon: Shield, title: "Student Friendly", desc: "Built-in 20h/week tracking for student riders. Work Fri-Sun, get paid hourly, stay legal in Ireland.", color: "#1E3F20" },
              { icon: Heart, title: "Fair for Everyone", desc: "Transparent payment splits. Restaurants, riders, and the platform all get their fair share. No hidden fees.", color: "#8B5E3C" },
            ].map((f, i) => (
              <div key={i} className="bg-white/5 backdrop-blur-sm rounded-2xl p-8 border border-white/10 card-hover" data-testid={`feature-card-${i}`}>
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-5" style={{ background: `${f.color}20` }}>
                  <f.icon className="w-7 h-7" style={{ color: f.color }} />
                </div>
                <h3 className="font-heading font-bold text-xl mb-3">{f.title}</h3>
                <p className="text-white/60 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 bg-white">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="font-heading font-bold text-3xl text-center mb-4 text-[#1A1D1A]">People Love Kangaroos</h2>
          <p className="text-center text-[#5C635A] mb-14">Real feedback from our Dublin community</p>
          <div className="grid md:grid-cols-3 gap-8">
            {TESTIMONIALS.map((t, i) => (
              <div key={i} className="bg-[#FAF9F6] rounded-2xl p-7 border border-[#E5E1D8] card-hover" data-testid={`testimonial-${i}`}>
                <div className="flex items-center gap-1 mb-4">
                  {[...Array(t.rating)].map((_, j) => (
                    <Star key={j} className="w-4 h-4 fill-[#D97746] text-[#D97746]" />
                  ))}
                </div>
                <p className="text-[#1A1D1A] leading-relaxed mb-6 italic">"{t.text}"</p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#D97746] flex items-center justify-center text-white font-bold">
                    {t.avatar}
                  </div>
                  <span className="font-semibold text-sm">{t.name}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Happy Scene with CTA */}
      <section className="relative py-24 overflow-hidden">
        <div className="absolute inset-0">
          <img
            src="https://images.pexels.com/photos/761854/pexels-photo-761854.jpeg?auto=compress&cs=tinysrgb&w=1920"
            alt="Friends dining"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-[#1A1D1A]/70" />
        </div>
        <div className="relative z-10 max-w-3xl mx-auto px-6 text-center text-white">
          <h2 className="font-heading font-bold text-4xl sm:text-5xl mb-6">
            Ready for <span className="text-[#D97746]">delicious</span>?
          </h2>
          <p className="text-lg text-white/70 mb-10 max-w-xl mx-auto">
            Join thousands in Dublin who already enjoy fast delivery, hot food, and fair prices. Your next meal is just a tap away.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <button
              onClick={() => nav("/auth/customer")}
              className="group px-10 py-5 bg-[#D97746] text-white rounded-full font-bold text-lg hover:bg-[#C46838] transition-all active:scale-95 shadow-xl shadow-[#D97746]/30 flex items-center gap-3"
              data-testid="cta-order-btn"
            >
              Order Now <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
            <button
              onClick={() => nav("/auth/rider")}
              className="px-10 py-5 border-2 border-white/30 text-white rounded-full font-bold text-lg hover:bg-white/10 transition-all active:scale-95"
              data-testid="cta-rider-btn"
            >
              Become a Rider
            </button>
          </div>
        </div>
      </section>

      {/* Role Cards */}
      <section className="py-20 bg-[#FAF9F6]">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="font-heading font-bold text-3xl text-center mb-4 text-[#1A1D1A]">Get Started</h2>
          <p className="text-center text-[#5C635A] mb-12">Choose how you want to use Kangaroos</p>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { key: "customer", icon: ShoppingBag, title: "Order Food", desc: "Browse restaurants & get fast delivery to your door", color: "bg-[#D97746]", hover: "hover:bg-[#C46838]" },
              { key: "restaurant", icon: Store, title: "Restaurant", desc: "Manage orders, grow your business, get paid automatically", color: "bg-[#1E3F20]", hover: "hover:bg-[#163018]" },
              { key: "rider", icon: Bike, title: "Deliver & Earn", desc: "Earn EUR 2.99/delivery. Instant payouts. Flexible hours.", color: "bg-[#8B5E3C]", hover: "hover:bg-[#6F4B2F]" },
            ].map(r => (
              <button
                key={r.key}
                onClick={() => nav(`/auth/${r.key}`)}
                className={`${r.color} ${r.hover} text-white rounded-2xl p-8 text-left transition-all active:scale-95 card-hover group`}
                data-testid={`role-${r.key}-btn`}
              >
                <r.icon className="w-10 h-10 mb-4" />
                <h3 className="font-heading font-bold text-2xl mb-2">{r.title}</h3>
                <p className="text-white/80 mb-6">{r.desc}</p>
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <span>Get started</span>
                  <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#1A1D1A] text-white py-12 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-8">
            <div className="flex items-center gap-3">
              <img src="/logo.svg" alt="Kangaroos" className="w-12 h-12 object-contain" />
              <div>
                <span className="font-heading font-bold text-xl">Kangaroos</span>
                <p className="text-xs text-white/40">Fast Delivery</p>
              </div>
            </div>
            <div className="flex items-center gap-6 text-sm text-white/50">
              <button onClick={() => nav("/auth/customer")} className="hover:text-white transition-colors">Order</button>
              <button onClick={() => nav("/auth/restaurant")} className="hover:text-white transition-colors">Restaurants</button>
              <button onClick={() => nav("/auth/rider")} className="hover:text-white transition-colors">Riders</button>
            </div>
          </div>
          <div className="border-t border-white/10 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-sm text-white/40">
              <MapPin className="w-4 h-4" />
              <span>Dublin, Ireland</span>
            </div>
            <span className="text-xs text-white/30">2026 Kangaroos Fast Delivery. All rights reserved.</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
