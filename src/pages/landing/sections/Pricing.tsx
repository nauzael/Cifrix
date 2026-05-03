import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Check, Sparkles } from 'lucide-react';

export interface PricingPlan {
  id: string;
  name: string;
  priceMonthly: number;
  priceYearly: number;
  features: string[];
  featured?: boolean;
  ctaText: string;
  ctaHref: string;
}

export const plans: PricingPlan[] = [
  {
    id: 'gratis',
    name: 'Gratis',
    priceMonthly: 0,
    priceYearly: 0,
    features: [
      '1 usuario',
      '50 transacciones/mes',
      'Contabilidad básica',
      '1 organización',
    ],
    featured: false,
    ctaText: 'Comenzar Gratis',
    ctaHref: '/register?plan=gratis',
  },
  {
    id: 'profesional',
    name: 'Profesional',
    priceMonthly: 49900,
    priceYearly: Math.round(49900 * 12 * 0.8),
    features: [
      '5 usuarios',
      'Transacciones ilimitadas',
      'Facturación DIAN',
      'Renta',
      '3 organizaciones',
      'Sync automático',
    ],
    featured: true,
    ctaText: 'Empezar Profesional',
    ctaHref: '/register?plan=profesional',
  },
  {
    id: 'empresarial',
    name: 'Empresarial',
    priceMonthly: 99900,
    priceYearly: Math.round(99900 * 12 * 0.8),
    features: [
      'Usuarios ilimitados',
      'Todo ilimitado',
      'Módulo eclesiástico',
      'Soporte premium',
      'Organizaciones ilimitadas',
    ],
    featured: false,
    ctaText: 'Contactar Ventas',
    ctaHref: '/contact',
  },
];

interface PricingProps {
  title?: string;
  subtitle?: string;
}

const formatPrice = (price: number): string => {
  if (price === 0) return 'Gratis';
  return `$${price.toLocaleString('es-CO')}`;
};

export const Pricing: React.FC<PricingProps> = ({
  title = 'Planes y Precios de Cifrix',
  subtitle = 'Elige el plan perfecto para tu contabilidad. Sin costos ocultos.',
}) => {
  const [isAnnual, setIsAnnual] = useState(false);

  const toggleBillingCycle = () => {
    setIsAnnual(!isAnnual);
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.5,
        ease: [0.25, 0.1, 0.25, 1.0] as const,
      },
    },
  };

  return (
    <section
      id="pricing"
      className="relative py-16 sm:py-20 lg:py-24 bg-slate-50 dark:bg-slate-950"
      aria-label="Sección de precios"
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
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-900 dark:text-white tracking-tight mb-4">
              {title}
            </h2>
            <p className="text-lg sm:text-xl text-slate-600 dark:text-slate-300 max-w-2xl mx-auto">
              {subtitle}
            </p>
          </motion.div>

          {/* Billing Cycle Toggle */}
          <motion.div
            className="flex justify-center mb-12"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            viewport={{ once: true }}
          >
            <div
              className="inline-flex items-center gap-4 p-2 bg-white dark:bg-slate-800 rounded-full shadow-md border border-slate-200 dark:border-slate-700"
              role="group"
              aria-label="Opciones de facturación"
            >
              <button
                type="button"
                onClick={toggleBillingCycle}
                className={`relative inline-flex items-center gap-3 px-6 py-3 rounded-full text-sm font-semibold transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-blue-500/30 ${
                  !isAnnual
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                }`}
                aria-pressed={!isAnnual}
                aria-label={isAnnual ? 'Cambiar a facturación mensual' : 'Facturación mensual'}
              >
                Mensual
              </button>
              <button
                type="button"
                onClick={toggleBillingCycle}
                className={`relative inline-flex items-center gap-3 px-6 py-3 rounded-full text-sm font-semibold transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-blue-500/30 ${
                  isAnnual
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                }`}
                aria-pressed={isAnnual}
                aria-label={isAnnual ? 'Facturación anual' : 'Cambiar a facturación anual'}
              >
                Anual
                <span
                  className={`px-2 py-0.5 text-xs font-bold rounded-full ${
                    isAnnual
                      ? 'bg-white/20 text-white'
                      : 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                  }`}
                >
                  -20%
                </span>
              </button>
            </div>
          </motion.div>

          {/* Pricing Plans Grid */}
          <motion.div
            className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8"
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-50px' }}
            role="list"
            aria-label="Planes de precios"
          >
            {plans.map((plan, index) => (
              <motion.div
                key={plan.id}
                variants={cardVariants}
                transition={{ duration: 0.5, delay: index * 0.1, ease: 'easeOut' }}
                className={`relative bg-white dark:bg-slate-800 rounded-2xl p-6 sm:p-8 shadow-lg border transition-all duration-300 hover:-translate-y-2 hover:shadow-xl ${
                  plan.featured
                    ? 'border-blue-500 dark:border-blue-400 ring-2 ring-blue-500/20 dark:ring-blue-400/20'
                    : 'border-slate-200 dark:border-slate-700'
                }`}
                role="listitem"
                aria-labelledby={`plan-${plan.id}-name`}
                data-plan={plan.id}
              >
                {/* Featured Badge */}
                {plan.featured && (
                  <motion.div
                    className="absolute -top-4 left-1/2 -translate-x-1/2"
                    initial={{ scale: 0 }}
                    whileInView={{ scale: 1 }}
                    transition={{ duration: 0.4, delay: 0.3, type: 'spring', stiffness: 200 }}
                    viewport={{ once: true }}
                  >
                    <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-bold bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg shadow-blue-500/30">
                      <Sparkles className="w-4 h-4" aria-hidden="true" />
                      MÁS POPULAR
                    </span>
                  </motion.div>
                )}

                {/* Plan Name */}
                <h3
                  id={`plan-${plan.id}-name`}
                  className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white text-center mb-2"
                >
                  {plan.name}
                </h3>

                {/* Price */}
                <div className="text-center mb-6">
                  <div className="flex items-baseline justify-center gap-1">
                    <span className="text-4xl sm:text-5xl font-black text-slate-900 dark:text-white">
                      {formatPrice(isAnnual ? plan.priceYearly : plan.priceMonthly)}
                    </span>
                    {plan.priceMonthly > 0 && (
                      <span className="text-slate-500 dark:text-slate-400 font-medium">
                        {isAnnual ? '/año' : '/mes'}
                      </span>
                    )}
                  </div>
                  {isAnnual && plan.priceMonthly > 0 && (
                    <motion.div
                      className="text-sm text-green-600 dark:text-green-400 font-semibold mt-2"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.3 }}
                    >
                      Ahorras ${((plan.priceMonthly * 12 - plan.priceYearly) / 12).toLocaleString('es-CO')} por mes
                    </motion.div>
                  )}
                </div>

                {/* Features List */}
                <ul className="space-y-3 mb-8" role="list" aria-label="Características del plan">
                  {plan.features.map((feature, featureIndex) => (
                    <li
                      key={featureIndex}
                      className="flex items-start gap-3"
                      role="listitem"
                    >
                      <div
                        className="flex-shrink-0 w-5 h-5 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mt-0.5"
                        aria-hidden="true"
                      >
                        <Check className="w-3.5 h-3.5 text-green-600 dark:text-green-400" />
                      </div>
                      <span className="text-slate-600 dark:text-slate-300 text-sm sm:text-base leading-relaxed">
                        {feature}
                      </span>
                    </li>
                  ))}
                </ul>

                {/* CTA Button */}
                <a
                  href={plan.ctaHref}
                  className={`group inline-flex items-center justify-center w-full px-6 py-4 text-base font-bold rounded-xl transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-blue-500/30 transform hover:scale-105 active:scale-95 ${
                    plan.featured
                      ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg shadow-blue-500/30 hover:shadow-blue-500/40 hover:from-blue-700 hover:to-purple-700'
                      : 'bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white hover:bg-slate-200 dark:hover:bg-slate-600'
                  }`}
                  aria-label={`${plan.ctaText} - Plan ${plan.name}`}
                >
                  {plan.ctaText}
                </a>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default Pricing;
