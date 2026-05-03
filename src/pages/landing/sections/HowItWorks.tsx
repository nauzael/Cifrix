import React from 'react';
import { motion } from 'framer-motion';
import {
  UserPlus,
  Settings,
  CloudOff,
  type LucideIcon,
} from 'lucide-react';

interface Step {
  id: string;
  number: number;
  title: string;
  description: string;
  icon: LucideIcon;
}

const steps: Step[] = [
  {
    id: 'paso-1',
    number: 1,
    title: 'Regístrate Gratis',
    description: 'Crea tu cuenta en menos de 2 minutos',
    icon: UserPlus,
  },
  {
    id: 'paso-2',
    number: 2,
    title: 'Configura tu Organización',
    description: 'Personaliza según tu negocio o iglesia',
    icon: Settings,
  },
  {
    id: 'paso-3',
    number: 3,
    title: 'Trabaja Offline',
    description: 'Usa sin internet y sincroniza automáticamente',
    icon: CloudOff,
  },
];

interface HowItWorksProps {
  title?: string;
}

export const HowItWorks: React.FC<HowItWorksProps> = ({
  title = '¿Cómo Funciona Cifrix?',
}) => {
  return (
    <section
      id="how-it-works"
      className="relative py-16 sm:py-20 lg:py-24 bg-slate-50 dark:bg-slate-950"
      aria-label="Cómo funciona"
    >
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          {/* Section Header */}
          <motion.div
            className="text-center mb-12 sm:mb-16"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true, margin: '-100px' }}
          >
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-900 dark:text-white tracking-tight">
              {title}
            </h2>
          </motion.div>

          {/* Steps Container */}
          <div className="relative">
            {/* Connector Line (Desktop Only) */}
            <div
              className="hidden lg:block absolute top-16 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-600 via-purple-600 to-blue-600"
              aria-hidden="true"
            />

            {/* Steps Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-4">
              {steps.map((step, index) => (
                <motion.div
                  key={step.id}
                  data-step-number={step.number}
                  className="relative flex flex-col items-center text-center"
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{
                    duration: 0.6,
                    delay: index * 0.2,
                    ease: 'easeOut',
                  }}
                  viewport={{ once: true, margin: '-50px' }}
                  role="article"
                  aria-labelledby={`step-${step.id}-title`}
                >
                  {/* Step Number Badge */}
                  <motion.div
                    className="relative z-10 mb-6 inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-blue-600 to-purple-600 text-white shadow-lg shadow-blue-500/30"
                    initial={{ scale: 0.8 }}
                    whileInView={{ scale: 1 }}
                    transition={{
                      duration: 0.4,
                      delay: index * 0.2 + 0.2,
                      type: 'spring',
                      stiffness: 200,
                    }}
                    viewport={{ once: true }}
                  >
                    <span className="text-2xl font-black">{step.number}</span>
                  </motion.div>

                  {/* Icon */}
                  <motion.div
                    className="mb-5 inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-white dark:bg-slate-800 shadow-md border border-slate-200 dark:border-slate-700"
                    initial={{ scale: 0.9, rotate: -5 }}
                    whileInView={{ scale: 1, rotate: 0 }}
                    transition={{
                      duration: 0.5,
                      delay: index * 0.2 + 0.3,
                      ease: 'easeOut',
                    }}
                    viewport={{ once: true }}
                  >
                    <step.icon
                      className="w-10 h-10 text-blue-600 dark:text-blue-400"
                      aria-hidden="true"
                    />
                  </motion.div>

                  {/* Title */}
                  <h3
                    id={`step-${step.id}-title`}
                    className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white mb-3"
                  >
                    {step.title}
                  </h3>

                  {/* Description */}
                  <p className="text-slate-600 dark:text-slate-300 leading-relaxed max-w-sm">
                    {step.description}
                  </p>

                  {/* Connector Dot (for mobile visual consistency) */}
                  <div
                    className="lg:hidden mt-6 w-2 h-2 rounded-full bg-blue-600"
                    aria-hidden="true"
                  />
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
