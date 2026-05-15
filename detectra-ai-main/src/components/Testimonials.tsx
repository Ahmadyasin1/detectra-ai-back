import { motion } from 'framer-motion';
import { useInView } from 'framer-motion';
import { useRef, useState } from 'react';
import { Quote, Star, ChevronLeft, ChevronRight } from 'lucide-react';

export default function Testimonials() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-100px' });
  const [currentIndex, setCurrentIndex] = useState(0);

  const testimonials = [
    {
      name: 'Dr. Sarah Chen',
      role: 'Research Director',
      company: 'MIT AI Lab',
      content: 'Detecra AI\'s detection models have revolutionized our research capabilities. The accuracy and speed are unmatched in the industry.',
      avatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face',
      rating: 5,
    },
    {
      name: 'Michael Rodriguez',
      role: 'CTO',
      company: 'TechCorp Industries',
      content: 'The industrial defect detection system has improved our quality control by 300%. It\'s a game-changer for manufacturing.',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face',
      rating: 5,
    },
    {
      name: 'Dr. Emily Watson',
      role: 'Chief Medical Officer',
      company: 'HealthTech Solutions',
      content: 'The medical image classification system has enhanced our diagnostic accuracy significantly. It\'s transforming healthcare.',
      avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face',
      rating: 5,
    },
    {
      name: 'Prof. James Wilson',
      role: 'AI Research Lead',
      company: 'Stanford University',
      content: 'Working with Detecra AI has been exceptional. Their innovative approach to detection algorithms is groundbreaking.',
      avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face',
      rating: 5,
    },
  ];

  const nextTestimonial = () => {
    setCurrentIndex((prev) => (prev + 1) % testimonials.length);
  };

  const prevTestimonial = () => {
    setCurrentIndex((prev) => (prev - 1 + testimonials.length) % testimonials.length);
  };

  return (
    <section className="py-20 sm:py-32 bg-white/5 backdrop-blur-md relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,_var(--tw-gradient-stops))] from-violet-500/10 via-transparent to-transparent" />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10" ref={ref}>
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8 }}
          className="text-center mb-16"
        >
          <style>{`.star { filter: drop-shadow(0 0 3px #fbbf24); }`}</style>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-4">
            What Our <span className="bg-gradient-to-r from-cyan-400 to-blue-600 bg-clip-text text-transparent">Partners</span> Say
          </h2>
          <div className="w-24 h-1 bg-gradient-to-r from-cyan-500 to-blue-600 mx-auto mb-8" />
          <p className="text-gray-300 text-lg sm:text-xl max-w-3xl mx-auto">
            Trusted by leading organizations and research institutions worldwide
          </p>
        </motion.div>

        <div className="relative">
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="max-w-4xl mx-auto"
          >
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 to-blue-600/10 rounded-3xl blur-xl" />
              
              <div className="relative p-8 sm:p-12 rounded-3xl bg-gradient-to-br from-gray-800 to-gray-900 border border-cyan-500/20">
                <Quote className="w-12 h-12 text-cyan-400 mb-6 mx-auto" />
                
                <motion.p
                  key={currentIndex}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5 }}
                  className="text-xl sm:text-2xl text-gray-200 leading-relaxed mb-8 text-center italic"
                >
                  "{testimonials[currentIndex].content}"
                </motion.p>
                
                <div className="flex justify-center mb-6">
                  {[...Array(testimonials[currentIndex].rating)].map((_, i) => (
                    <Star key={i} className="w-5 h-5 text-yellow-400 fill-current star" />
                  ))}
                </div>
                
                <motion.div
                  key={currentIndex}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.5 }}
                  className="flex flex-col sm:flex-row items-center justify-center gap-4"
                >
                  <img
                    src={testimonials[currentIndex].avatar}
                    alt={testimonials[currentIndex].name}
                    className="w-16 h-16 rounded-full object-cover border-2 border-cyan-400"
                  />
                  <div className="text-center sm:text-left">
                    <h4 className="text-xl font-bold text-white">{testimonials[currentIndex].name}</h4>
                    <p className="text-cyan-400 font-semibold">{testimonials[currentIndex].role}</p>
                    <p className="text-gray-400 text-sm">{testimonials[currentIndex].company}</p>
                  </div>
                </motion.div>
              </div>
            </div>
          </motion.div>

          <div className="flex justify-center gap-4 mt-8">
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={prevTestimonial}
              className="p-3 bg-cyan-500/10 border border-cyan-500/30 rounded-full hover:bg-cyan-500/20 transition-colors"
            >
              <ChevronLeft className="w-5 h-5 text-cyan-400" />
            </motion.button>
            
            <div className="flex gap-2">
              {testimonials.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentIndex(index)}
                  className={`w-3 h-3 rounded-full transition-all ${
                    index === currentIndex ? 'bg-cyan-400' : 'bg-gray-600'
                  }`}
                />
              ))}
            </div>
            
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={nextTestimonial}
              className="p-3 bg-cyan-500/10 border border-cyan-500/30 rounded-full hover:bg-cyan-500/20 transition-colors"
            >
              <ChevronRight className="w-5 h-5 text-cyan-400" />
            </motion.button>
          </div>
        </div>
      </div>
    </section>
  );
}
