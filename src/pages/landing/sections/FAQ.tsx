import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';

interface FAQItem {
  id: string;
  question: string;
  answer: string;
}

export const faqData: FAQItem[] = [
  {
    id: 'internet-required',
    question: '¿Necesito internet para usar Cifrix?',
    answer: 'No, no necesitas internet para usar Cifrix. Nuestro sistema es offline-first, lo que significa que puedes trabajar sin conexión a internet y sincronizar tus datos automáticamente cuando te conectes. Ideal para zonas con conexión intermitente.',
  },
  {
    id: 'dian-compliance',
    question: '¿Cumple con las normas de la DIAN?',
    answer: 'Sí, Cifrix cumple con todas las normas y resoluciones de la DIAN. Nuestro sistema se actualiza constantemente para garantizar el cumplimiento de la facturación electrónica y demás obligaciones tributarias en Colombia.',
  },
  {
    id: 'free-plan',
    question: '¿Tiene plan gratuito?',
    answer: 'Sí, ofrecemos un plan gratuito para que conozcas Cifrix sin compromiso. El plan gratuito incluye funcionalidades básicas de contabilidad. También tenemos planes pagos con características avanzadas para negocios en crecimiento.',
  },
  {
    id: 'data-migration',
    question: '¿Puedo migrar mis datos de otro sistema?',
    answer: 'Sí, puedes migrar tus datos desde otros sistemas contables. Cifrix soporta importación de archivos CSV, Excel y formatos estándar de contabilidad. Nuestro equipo de soporte puede asistirte en el proceso de migración.',
  },
  {
    id: 'security',
    question: '¿Es seguro mi información?',
    answer: 'Absolutamente. Tu información está protegida con encriptación de grado bancario. Realizamos copias de seguridad automáticas y cumplimos con estándares internacionales de seguridad de datos. Solo tú tienes acceso a tu información.',
  },
  {
    id: 'technical-support',
    question: '¿Tiene soporte técnico?',
    answer: 'Sí, ofrecemos soporte técnico especializado para todos nuestros usuarios. Nuestro equipo está disponible por chat, correo electrónico y teléfono. Además, contamos con una amplia base de conocimientos y tutoriales.',
  },
  {
    id: 'cancel-anytime',
    question: '¿Puedo cancelar en cualquier momento?',
    answer: 'Sí, puedes cancelar tu suscripción en cualquier momento sin penalizaciones. No hay contratos forzosos ni compromisos a largo plazo. Tu decisión, tu control.',
  },
  {
    id: 'mobile-support',
    question: '¿Funciona en móviles?',
    answer: 'Sí, Cifrix es completamente responsive y funciona en dispositivos móviles. Puedes acceder desde tu smartphone o tablet, tanto Android como iOS, a través del navegador o nuestra app móvil.',
  },
];

/**
 * FAQPage Schema para SEO
 * Define las preguntas frecuentes para Google Rich Results
 */
export const faqPageSchema = {
  '@context': 'https://schema.org' as const,
  '@type': 'FAQPage' as const,
  mainEntity: faqData.map((item) => ({
    '@type': 'Question' as const,
    name: item.question,
    acceptedAnswer: {
      '@type': 'Answer' as const,
      text: item.answer,
    },
  })),
};

interface FAQProps {
  title?: string;
  subtitle?: string;
}

export const FAQ: React.FC<FAQProps> = ({
  title = 'Preguntas Frecuentes sobre Cifrix',
  subtitle = 'Resolvemos tus dudas sobre nuestro sistema contable',
}) => {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const handleToggle = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  const handleKeyDown = (index: number) => (event: React.KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleToggle(index);
    }
  };

  return (
    <section
      id="faq"
      className="relative py-16 sm:py-20 lg:py-24 bg-slate-50 dark:bg-slate-950"
      aria-labelledby="faq-heading"
    >
      {/* JSON-LD Schema for SEO */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqPageSchema) }}
        aria-hidden="true"
      />

      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          {/* Section Header */}
          <motion.div
            className="text-center mb-12 sm:mb-16"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true, margin: '-100px' }}
          >
            <h2
              id="faq-heading"
              className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-900 dark:text-white tracking-tight mb-4"
            >
              {title}
            </h2>
            {subtitle && (
              <p className="text-lg sm:text-xl text-slate-600 dark:text-slate-300 max-w-2xl mx-auto">
                {subtitle}
              </p>
            )}
          </motion.div>

          {/* FAQ Accordion */}
          <div className="space-y-4">
            {faqData.map((item, index) => (
              <FAQAccordionItem
                key={item.id}
                item={item}
                index={index}
                isOpen={openIndex === index}
onToggle={() => handleToggle(index)}
onKeyDown={handleKeyDown(index)}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

interface FAQAccordionItemProps {
  item: FAQItem;
  index: number;
  isOpen: boolean;
  onToggle: () => void;
  onKeyDown: (event: React.KeyboardEvent<HTMLButtonElement>) => void;
}

const FAQAccordionItem: React.FC<FAQAccordionItemProps> = ({
  item,
  index,
  isOpen,
  onToggle,
  onKeyDown,
}) => {
  const buttonId = `faq-question-${item.id}`;
  const panelId = `faq-answer-${item.id}`;

  return (
    <motion.div
      className="group bg-white dark:bg-slate-800 rounded-2xl shadow-md hover:shadow-lg border border-slate-200 dark:border-slate-700 overflow-hidden transition-all duration-300"
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.05 }}
      viewport={{ once: true, margin: '-50px' }}
    >
      {/* Accordion Trigger */}
      <button
        id={buttonId}
        className="w-full px-6 py-5 sm:px-8 sm:py-6 flex items-center justify-between gap-4 text-left focus:outline-none focus-visible:ring-4 focus-visible:ring-blue-500/30 transition-all"
        onClick={onToggle}
        onKeyDown={onKeyDown}
        aria-expanded={isOpen}
        aria-controls={panelId}
        type="button"
      >
        <span className="flex-1 text-base sm:text-lg font-bold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
          {item.question}
        </span>
        <motion.div
          className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center group-hover:bg-blue-100 dark:group-hover:bg-blue-900/30 transition-colors"
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.3, ease: 'easeInOut' }}
          aria-hidden="true"
        >
          <ChevronDown className="w-5 h-5 text-blue-600 dark:text-blue-400" />
        </motion.div>
      </button>

      {/* Accordion Content */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            id={panelId}
            role="region"
            aria-labelledby={buttonId}
            className="px-6 pb-6 sm:px-8 sm:pb-8"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
          >
            <motion.div
              initial={{ y: -10 }}
              animate={{ y: 0 }}
              transition={{ duration: 0.2 }}
              className="pt-2 border-t border-slate-100 dark:border-slate-700"
            >
              <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                {item.answer}
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default FAQ;
