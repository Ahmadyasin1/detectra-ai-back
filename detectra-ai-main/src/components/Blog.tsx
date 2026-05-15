import { motion } from 'framer-motion';
import { useInView } from 'framer-motion';
import { useRef } from 'react';
import { Calendar, ArrowRight, User, Tag } from 'lucide-react';

export default function Blog() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-100px' });

  const blogPosts = [
    {
      id: 1,
      title: 'The Future of AI Detection in Healthcare',
      excerpt: 'Exploring how advanced detection algorithms are revolutionizing medical diagnosis and patient care.',
      author: 'Dr. Sarah Chen',
      date: '2024-01-15',
      category: 'Healthcare',
      readTime: '5 min read',
      image: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1f?w=400&h=250&fit=crop',
    },
    {
      id: 2,
      title: 'Industrial Automation with Edge AI',
      excerpt: 'How edge computing is transforming manufacturing with real-time defect detection and quality control.',
      author: 'Michael Rodriguez',
      date: '2024-01-10',
      category: 'Industrial',
      readTime: '7 min read',
      image: 'https://images.unsplash.com/photo-1581092160562-40aa08e78837?w=400&h=250&fit=crop',
    },
    {
      id: 3,
      title: 'Ethical AI: Building Responsible Detection Systems',
      excerpt: 'The importance of ethical considerations in AI development and deployment for detection systems.',
      author: 'Dr. Emily Watson',
      date: '2024-01-05',
      category: 'Ethics',
      readTime: '6 min read',
      image: 'https://images.unsplash.com/photo-1555949963-aa79dcee981c?w=400&h=250&fit=crop',
    },
  ];

  return (
    <section id="blog" className="py-20 sm:py-32 bg-gradient-to-b from-gray-950 to-gray-900 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_60%_40%,_var(--tw-gradient-stops))] from-violet-500/5 via-transparent to-transparent" />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10" ref={ref}>
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8 }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-4">
            Latest <span className="bg-gradient-to-r from-cyan-400 to-blue-600 bg-clip-text text-transparent">Insights</span>
          </h2>
          <div className="w-24 h-1 bg-gradient-to-r from-cyan-500 to-blue-600 mx-auto mb-8" />
          <p className="text-gray-300 text-lg sm:text-xl max-w-3xl mx-auto">
            Stay informed with the latest research, industry trends, and technological breakthroughs
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {blogPosts.map((post, index) => (
            <motion.article
              key={post.id}
              initial={{ opacity: 0, y: 30 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.8, delay: index * 0.1 }}
              whileHover={{ y: -10 }}
              className="group cursor-pointer"
            >
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 to-blue-600/10 rounded-3xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
                
                <div className="relative rounded-3xl bg-gradient-to-br from-gray-800 to-gray-900 border border-cyan-500/20 hover:border-cyan-500/50 transition-all duration-300 overflow-hidden">
                  <div className="relative h-48 overflow-hidden">
                    <img
                      src={post.image}
                      alt={post.title}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-gray-900/80 to-transparent" />
                    <div className="absolute top-4 left-4">
                      <span className="px-3 py-1 bg-cyan-500/20 border border-cyan-500/30 rounded-full text-cyan-400 text-xs font-semibold">
                        {post.category}
                      </span>
                    </div>
                  </div>
                  
                  <div className="p-6">
                    <div className="flex items-center gap-4 text-sm text-gray-400 mb-3">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {new Date(post.date).toLocaleDateString()}
                      </div>
                      <div className="flex items-center gap-1">
                        <User className="w-4 h-4" />
                        {post.author}
                      </div>
                      <div className="flex items-center gap-1">
                        <Tag className="w-4 h-4" />
                        {post.readTime}
                      </div>
                    </div>
                    
                    <h3 className="text-xl font-bold text-white mb-3 group-hover:text-cyan-400 transition-colors">
                      {post.title}
                    </h3>
                    
                    <p className="text-gray-300 leading-relaxed mb-4">
                      {post.excerpt}
                    </p>
                    
                    <motion.div
                      whileHover={{ x: 5 }}
                      className="flex items-center text-cyan-400 font-semibold group-hover:text-cyan-300 transition-colors"
                    >
                      Read More
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </motion.div>
                  </div>
                </div>
              </div>
            </motion.article>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8, delay: 0.6 }}
          className="text-center mt-12"
        >
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="px-8 py-4 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-full font-semibold text-lg hover:shadow-2xl hover:shadow-cyan-500/50 transition-all"
          >
            View All Articles
          </motion.button>
        </motion.div>
      </div>
    </section>
  );
}
