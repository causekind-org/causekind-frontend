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
    <section id="about-sahas" className="min-h-0 lg:min-h-[calc(100svh-3.5rem)] py-8 lg:py-16 bg-stone-50 dark:bg-zinc-900/60 border-t border-stone-100 flex items-center">
      <div className="max-w-[90rem] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col lg:flex-row gap-8 lg:gap-20">
          
          {/* Left Column: Context */}
          <div className="lg:w-2/5">
            <span className="inline-block px-4 py-1.5 rounded-full bg-brand-50 dark:bg-brand-500/10 border border-brand-100 dark:border-brand-500/25 text-brand-700 dark:text-brand-300 text-xs font-semibold tracking-wider uppercase mb-4 sm:mb-6">
              About the organization
            </span>
            <h2 className="text-2xl sm:text-4xl lg:text-5xl font-extrabold text-foreground mb-4 sm:mb-6 leading-tight">
              <SahasLogo size={64} className="mb-4" />
              Who is Sahas Charitable Trust?
            </h2>
            <p className="text-base sm:text-lg text-stone-600 dark:text-stone-300 leading-relaxed mb-6 sm:mb-8">
              Sahas Charitable Trust is a registered non-profit organization based in Palghar, Maharashtra. Established with the mission of fostering an inclusive and self-reliant society, Sahas works to uplift underprivileged children and families through sustainable support systems.
            </p>
            {/* Optional visual element or trust indicator could go here */}
            <div className="bg-white dark:bg-zinc-900 p-5 rounded-xl border border-stone-100 dark:border-white/10 shadow-sm inline-block">
              <p className="text-sm font-bold text-stone-800">12AA & 80G Certified</p>
              <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">Donations are eligible for tax exemption in India.</p>
            </div>
          </div>

          {/* Right Column: Areas of work grid */}
          <div className="lg:w-3/5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-5">
              {areas.map((area, index) => (
                <div
                  key={index}
                  className="flex flex-col sm:flex-row gap-4 sm:gap-5 p-4 sm:p-6 rounded-2xl border border-stone-100 dark:border-white/10 bg-white dark:bg-zinc-900 hover:shadow-sm transition-all duration-300"
                >
                  <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-brand-50 dark:bg-brand-500/10 border border-brand-100 dark:border-brand-500/25 flex items-center justify-center text-brand-600">
                    {area.icon}
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-foreground mb-2">{area.title}</h3>
                    <p className="text-sm text-stone-500 dark:text-stone-400 leading-relaxed">{area.description}</p>
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
