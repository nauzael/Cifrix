import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Users, Shield } from 'lucide-react';

interface CTAProps {
  title?: string;
  subtitle?: string;
  primaryCtaText?: string;
  secondaryCtaText?: string;
  primaryCtaHref?: string;
  secondaryCtaHref?: string;
  guaranteeText?: string;
  socialProofText?: string;
}

export const CTA: React.FC<CTAProps> = ({
  title = 'Comienza a Usar Cifrix Hoy Mismo',
  subtitle = 'Únete a miles de contadores, iglesias y empresas en Colombia',
  primaryCtaText = 'Comienza Gratis - Sin tarjeta de crédito',
  secondaryCtaText = 'Agendar Demo Personalizada',
  primaryCtaHref = '/register',
  secondaryCtaHref = '#demo',
  guaranteeText = '14 días de prueba gratis • Sin compromiso',
  socialProofText = '+1,000 usuarios satisfechos',
}) => {
  return (
    <section
      id="cta"
      className="relative py-16 sm:py-20 lg:py-24 bg-gradient-to-br from-blue-600 via-purple-600 to-blue-800 overflow-hidden"
      aria-label="Llamado a la acción"
    >
      {/* Background Pattern */}
      <div
        className="absolute inset-0 opacity-10"
        aria-hidden="true"
      >
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff12_1px,transparent_1px),linear-gradient(to_bottom,#ffffff12_1px,transparent_1px)] bg-[size:32px_32px]" />
        <div className="absolute -top-1/2 -right-1/4 w-[800px] h-[800px] rounded-full bg-white/10 blur-[100px]" />
        <div className="absolute -bottom-1/2 -left-1/4 w-[800px] h-[800px] rounded-full bg-purple-400/10 blur-[100px]" />
      </div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="max-w-4xl mx-auto text-center">
          {/* Title */}
          <motion.h2
            className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black text-white leading-tight tracking-tight mb-6"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            viewport={{ once: true, margin: '-100px' }}
          >
            {title}
          </motion.h2>

          {/* Subtitle */}
          <motion.p
            className="text-lg sm:text-xl md:text-2xl text-blue-100 mb-10 max-w-3xl mx-auto leading-relaxed"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1, ease: 'easeOut' }}
            viewport={{ once: true, margin: '-100px' }}
          >
            {subtitle}
          </motion.p>

          {/* CTA Buttons */}
          <motion.div
            className="flex flex-col sm:flex-row gap-4 justify-center mb-10"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2, ease: 'easeOut' }}
            viewport={{ once: true, margin: '-100px' }}
          >
            {/* Primary CTA */}
            <a
              href={primaryCtaHref}
              className="group inline-flex items-center justify-center gap-2 px-8 py-4 text-base sm:text-lg font-bold text-blue-600 bg-white rounded-xl shadow-lg shadow-blue-900/30 hover:shadow-blue-900/40 hover:bg-blue-50 focus:outline-none focus:ring-4 focus:ring-white/30 transition-all duration-300 transform hover:scale-105 active:scale-95"
              aria-label={primaryCtaText}
            >
              {primaryCtaText}
              <ArrowRight
                className="w-5 h-5 group-hover:translate-x-1 transition-transform"
                aria-hidden="true"
              />
            </a>

            {/* Secondary CTA */}
            <a
              href={secondaryCtaHref}
              className="group inline-flex items-center justify-center gap-2 px-8 py-4 text-base sm:text-lg font-bold text-white border-2 border-white/40 rounded-xl hover:bg-white/10 hover:border-white focus:outline-none focus:ring-4 focus:ring-white/30 transition-all duration-300 transform hover:scale-105 active:scale-95"
              aria-label={secondaryCtaText}
            >
              {secondaryCtaText}
            </a>
          </motion.div>

          {/* Guarantee */}
          <motion.div
            className="flex items-center justify-center gap-2 mb-6"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3, ease: 'easeOut' }}
            viewport={{ once: true, margin: '-100px' }}
          >
            <Shield className="w-5 h-5 text-blue-200" aria-hidden="true" />
            <span className="text-sm sm:text-base font-semibold text-blue-100">
              {guaranteeText}
            </span>
          </motion.div>

          {/* Social Proof */}
          <motion.div
            className="flex items-center justify-center gap-2"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4, ease: 'easeOut' }}
            viewport={{ once: true, margin: '-100px' }}
          >
            <Users className="w-5 h-5 text-blue-200" aria-hidden="true" />
            <span className="text-sm sm:text-base font-semibold text-blue-100">
              {socialProofText}
            </span>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default CTA;
