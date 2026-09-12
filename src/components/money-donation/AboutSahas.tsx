import React from 'react';
import { SahasLogo } from './SahasLogo';
import { BookOpen, Stethoscope, HelpingHand, HeartHandshake } from 'lucide-react';

export function AboutSahas() {
  const areas = [
    {
      title: 'Education',
      description: 'Providing scholarships, grants, and learning supplies to underserved students.',
      icon: <BookOpen className="w-6 h-6" />,
    },
    {
      title: 'Healthcare',
      description: 'Organizing community health camps and providing medical support.',
      icon: <Stethoscope className="w-6 h-6" />,
    },
    {
      title: 'Social Welfare & Relief',
      description: 'Emergency disaster relief, nutrition support, and community development.',
      icon: <HelpingHand className="w-6 h-6" />,
    },
    {
      title: 'Empowerment',
      description: 'Working toward empowerment of women and youth for an inclusive society.',
      icon: <HeartHandshake className="w-6 h-6" />,
    },
  ];

  return (
    <section id="about-sahas" className="min-h-[calc(100svh-3.5rem)] py-12 lg:py-16 bg-[#fff8f0] dark:bg-[#1b0c05] flex items-center">
      <div className="max-w-[90rem] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col lg:flex-row gap-12 lg:gap-20">
          
          {/* Left Column: Context */}
          <div className="lg:w-2/5">
            <span className="inline-block px-4 py-1.5 rounded-full bg-amber-100/90 dark:bg-amber-950/60 border border-amber-300/60 dark:border-amber-700/50 text-amber-900 dark:text-amber-200 text-xs font-bold tracking-wider uppercase mb-6 shadow-xs">
              About the organization
            </span>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-foreground mb-6 leading-tight">
              <SahasLogo size={64} className="mb-4" />
              Who is Sahas Charitable Trust?
            </h2>
            <p className="text-lg text-stone-600 dark:text-stone-300 leading-relaxed mb-8">
              Sahas Charitable Trust is a registered non-profit organization based in Palghar, Maharashtra. Established with the mission of fostering an inclusive and self-reliant society, Sahas works to uplift underprivileged children and families through sustainable support systems.
            </p>
            {/* Certified Indicator Card */}
            <div className="bg-amber-50/90 dark:bg-amber-950/50 p-5 rounded-xl border border-amber-300/60 dark:border-amber-700/50 shadow-xs inline-block">
              <p className="text-sm font-bold text-amber-950 dark:text-amber-100">12AA & 80G Certified</p>
              <p className="text-xs text-stone-600 dark:text-stone-300 mt-1">Donations are eligible for tax exemption in India.</p>
            </div>
          </div>

          {/* Right Column: Areas of work grid */}
          <div className="lg:w-3/5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {areas.map((area, index) => (
                <div
                  key={index}
                  className="flex flex-col sm:flex-row gap-5 p-6 rounded-2xl border border-amber-200/70 dark:border-amber-800/40 bg-[#fffdfa] dark:bg-[#23120a] shadow-[0_4px_16px_rgba(217,119,6,0.06)] hover:shadow-[0_10px_28px_rgba(217,119,6,0.18)] hover:border-amber-400 transition-all duration-300 group"
                >
                  <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br from-[#f97316] via-[#ea580c] to-[#c2410c] text-white shadow-md flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                    {area.icon}
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-foreground mb-2">{area.title}</h3>
                    <p className="text-sm text-stone-600 dark:text-stone-300 leading-relaxed">{area.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
        </div>
      </div>
    </section>
  );
}

