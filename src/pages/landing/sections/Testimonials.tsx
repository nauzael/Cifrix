import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Star, ChevronLeft, ChevronRight } from 'lucide-react';

interface Testimonial {
  id: string;
  name: string;
  role: string;
  company: string;
  image: string;
  rating: number;
  quote: string;
}

interface TestimonialsProps {
  testimonials?: Testimonial[];
  autoplay?: boolean;
  autoplayInterval?: number;
  title?: string;
}

export const defaultTestimonials: Testimonial[] = [
  {
    id: '1',
    name: 'Carlos Mendoza',
    role: 'Contador Independiente',
    company: 'Bogotá',
    image: 'https://i.pravatar.cc/150?img=1',
    rating: 5,
    quote:
      'Cifrix ha transformado la forma en que gestiono mis clientes. La capacidad de trabajar sin internet es increíble.',
  },
  {
    id: '2',
    name: 'María Fernanda López',
    role: 'Pastora',
    company: 'Iglesia Vida Nueva',
    image: 'https://i.pravatar.cc/150?img=5',
    rating: 5,
    quote:
      'El módulo eclesiástico es exactamente lo que necesitábamos. Los diezmos y ofrendas nunca fueron tan fáciles de administrar.',
  },
  {
    id: '3',
    name: 'Roberto Sánchez',
    role: 'Director Financiero',
    company: 'PYMES Colombia',
    image: 'https://i.pravatar.cc/150?img=3',
    rating: 5,
    quote:
      'La mejor inversión para nuestra empresa. Cumple con toda la normatividad colombiana y el soporte es excelente.',
  },
];

export const StarRating: React.FC<{ rating: number }> = ({ rating }) => {
  return (
    <div
      className="flex items-center gap-1"
      role="img"
      aria-label={`Rating: ${rating} de 5 estrellas`}
    >
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`w-4 h-4 sm:w-5 sm:h-5 ${
            star <= rating
              ? 'fill-yellow-400 text-yellow-400'
              : 'fill-gray-300 text-gray-300'
          }`}
          aria-hidden="true"
        />
      ))}
    </div>
  );
};

export const Testimonials: React.FC<TestimonialsProps> = ({
  testimonials = defaultTestimonials,
  autoplay = false,
  autoplayInterval = 5000,
  title = 'Lo Que Dicen Nuestros Usuarios',
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const autoplayRef = useRef<NodeJS.Timeout | null>(null);
  const carouselRef = useRef<HTMLDivElement>(null);

  // Determinar cuántos testimonios mostrar según el breakpoint
  // Mobile: 1, Tablet: 2, Desktop: 3
  const getVisibleCount = () => {
    if (typeof window === 'undefined') return 1;
    if (window.innerWidth >= 1024) return 3;
    if (window.innerWidth >= 768) return 2;
    return 1;
  };

  const [visibleCount, setVisibleCount] = useState(getVisibleCount());
  const maxIndex = Math.max(0, testimonials.length - visibleCount);

  const goToSlide = useCallback((index: number) => {
    setCurrentIndex((prevIndex) => {
      let newIndex = index;
      // Loop handling
      if (index < 0) {
        newIndex = maxIndex > 0 ? maxIndex : 0;
      } else if (index > maxIndex) {
        newIndex = 0;
      } else {
        newIndex = Math.min(index, maxIndex);
      }
      return newIndex;
    });
  }, [maxIndex]);

  const handlePrevious = useCallback(() => {
    goToSlide(currentIndex - 1);
  }, [currentIndex, goToSlide]);

  const handleNext = useCallback(() => {
    goToSlide(currentIndex + 1);
  }, [currentIndex, goToSlide]);

  // Autoplay functionality
  useEffect(() => {
    if (autoplay && !isPaused && testimonials.length > 1) {
      autoplayRef.current = setInterval(() => {
        goToSlide(currentIndex + 1);
      }, autoplayInterval);
    }

    return () => {
      if (autoplayRef.current) {
        clearInterval(autoplayRef.current);
      }
    };
  }, [autoplay, isPaused, autoplayInterval, currentIndex, goToSlide, testimonials.length]);

  // Pause autoplay on user interaction
  const handleInteraction = useCallback(() => {
    if (autoplay) {
      setIsPaused(true);
    }
  }, [autoplay]);

  // Resume autoplay after a delay
  useEffect(() => {
    if (isPaused && autoplay) {
      const resumeTimer = setTimeout(() => {
        setIsPaused(false);
      }, 10000); // Resume after 10 seconds of inactivity

      return () => clearTimeout(resumeTimer);
    }
  }, [isPaused, autoplay]);

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (event.key === 'ArrowLeft') {
        handlePrevious();
      } else if (event.key === 'ArrowRight') {
        handleNext();
      }
    },
    [handlePrevious, handleNext]
  );

  useEffect(() => {
    const handleResize = () => {
      setVisibleCount(getVisibleCount());
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <section
      id="testimonials"
      className="relative py-16 sm:py-20 lg:py-24 bg-slate-50 dark:bg-slate-800"
      aria-label="Sección de testimonios"
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

          {/* Carousel Container */}
          <div
            ref={carouselRef}
            className="relative"
            role="region"
            aria-label="Carrusel de testimonios de clientes"
            aria-roledescription="carousel"
            tabIndex={0}
            onKeyDown={handleKeyDown}
            onMouseEnter={handleInteraction}
            onTouchStart={handleInteraction}
          >
            {/* Testimonials Grid */}
            <div className="overflow-hidden">
              <AnimatePresence mode="popLayout">
                <motion.div
                  key={currentIndex}
                  className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8"
                  initial={{ opacity: 0, x: 100 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -100 }}
                  transition={{ duration: 0.5, ease: 'easeInOut' }}
                >
                  {testimonials
                    .slice(
                      currentIndex,
                      Math.min(currentIndex + visibleCount, testimonials.length)
                    )
                    .map((testimonial) => (
                      <motion.article
                        key={testimonial.id}
                        className="group relative bg-white dark:bg-slate-900 rounded-2xl p-6 sm:p-8 shadow-md hover:shadow-lg border border-slate-200 dark:border-slate-700 transition-all duration-300 hover:-translate-y-1 hover:shadow-blue-500/10 dark:hover:shadow-blue-500/20"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.5, ease: 'easeOut' }}
                        aria-labelledby={`testimonial-${testimonial.id}-name`}
                      >
                        {/* Header with Avatar and Info */}
                        <div className="flex items-center gap-4 mb-4">
                          {/* Avatar */}
                          <div className="flex-shrink-0">
                            <img
                              src={testimonial.image}
                              alt={`Foto de ${testimonial.name}`}
                              className="w-12 h-12 sm:w-14 sm:h-14 rounded-full object-cover border-2 border-blue-500 dark:border-blue-400 shadow-md"
                              loading="lazy"
                            />
                          </div>

                          {/* Name and Role */}
                          <div className="flex-1 min-w-0">
                            <h3
                              id={`testimonial-${testimonial.id}-name`}
                              className="text-base sm:text-lg font-bold text-slate-900 dark:text-white truncate"
                            >
                              {testimonial.name}
                            </h3>
                            <p className="text-sm text-slate-600 dark:text-slate-400 truncate">
                              {testimonial.role}
                            </p>
                            <p className="text-xs text-slate-500 dark:text-slate-500 truncate">
                              {testimonial.company}
                            </p>
                          </div>
                        </div>

                        {/* Rating */}
                        <div className="mb-4">
                          <StarRating rating={testimonial.rating} />
                        </div>

                        {/* Quote */}
                        <blockquote className="relative">
                          <p className="text-slate-700 dark:text-slate-300 leading-relaxed italic">
                            "{testimonial.quote}"
                          </p>
                          {/* Quote icon */}
                          <svg
                            className="absolute -top-2 -left-2 w-6 h-6 text-blue-500/20 dark:text-blue-400/20 transform rotate-180"
                            fill="currentColor"
                            viewBox="0 0 32 32"
                            aria-hidden="true"
                          >
                            <path d="M9.352 4.036c1.521-1.521 3.981-1.521 5.502 0 1.52 1.52 1.52 3.981 0 5.502L10.69 13.702c-1.521 1.52-3.981 1.52-5.502 0-1.52-1.521-1.52-3.981 0-5.502L9.352 4.036zM22.648 4.036c1.521-1.521 3.981-1.521 5.502 0 1.52 1.52 1.52 3.981 0 5.502L14.03 23.702c-1.521 1.52-3.981 1.52-5.502 0-1.52-1.521-1.52-3.981 0-5.502L22.648 4.036z" />
                          </svg>
                        </blockquote>

                        {/* Decorative gradient border on hover */}
                        <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
                          <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-blue-600 to-purple-600 opacity-[0.03] dark:opacity-[0.05]" />
                        </div>
                      </motion.article>
                    ))}
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Navigation Buttons */}
            <div className="flex items-center justify-center gap-4 mt-8">
              {/* Previous Button */}
              <button
                type="button"
                onClick={handlePrevious}
                className="inline-flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:border-blue-500 dark:hover:border-blue-400 hover:text-blue-600 dark:hover:text-blue-400 focus:outline-none focus:ring-4 focus:ring-blue-500/30 transition-all duration-300 shadow-md hover:shadow-lg"
                aria-label="Testimonio anterior"
                aria-controls="testimonial-carousel"
              >
                <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6" aria-hidden="true" />
              </button>

              {/* Progress Indicators */}
              <div
                className="flex items-center gap-2"
                role="tablist"
                aria-label="Indicadores de testimonios"
              >
                {testimonials.map((_, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => goToSlide(index)}
                    className={`w-2 h-2 sm:w-3 sm:h-3 rounded-full transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      index === currentIndex
                        ? 'bg-blue-600 w-6 sm:w-8'
                        : 'bg-slate-300 dark:bg-slate-600 hover:bg-slate-400 dark:hover:bg-slate-500'
                    }`}
                    aria-label={`Ir al testimonio ${index + 1}`}
                    aria-current={index === currentIndex ? 'true' : undefined}
                    role="tab"
                    aria-selected={index === currentIndex}
                  />
                ))}
              </div>

              {/* Next Button */}
              <button
                type="button"
                onClick={handleNext}
                className="inline-flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:border-blue-500 dark:hover:border-blue-400 hover:text-blue-600 dark:hover:text-blue-400 focus:outline-none focus:ring-4 focus:ring-blue-500/30 transition-all duration-300 shadow-md hover:shadow-lg"
                aria-label="Siguiente testimonio"
                aria-controls="testimonial-carousel"
              >
                <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6" aria-hidden="true" />
              </button>
            </div>

            {/* Screen reader live region for announcements */}
            <div
              className="sr-only"
              role="status"
              aria-live="polite"
              aria-atomic="true"
            >
              {`Testimonio ${currentIndex + 1} de ${testimonials.length}: ${
                testimonials[currentIndex]?.name
              }`}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Testimonials;
