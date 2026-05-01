import { motion } from 'framer-motion';
import { useInView } from 'framer-motion';
import { useRef } from 'react';
import { Linkedin, Github, Mail } from 'lucide-react';

export default function Team() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-100px' });

  const team = [
    {
      name: 'Ahmad Yasin',
      role: 'Founder & CEO',
      org: 'Nexariza AI',
      bio: 'Visionary leader driving AI innovation and spearheading Detecra AI initiatives',
      avatar: '/ahmad-yasin.jpg',
      linkedin: 'https://linkedin.com/in/ahmad-yasin',
      github: 'https://github.com/ahmad-yasin',
      email: 'ahmad@nexariza.ai',
    },
    {
      name: 'Eman Sarfraz',
      role: 'Chief Operating Officer',
      org: 'Nexariza AI',
      bio: 'Operations excellence and documentation strategist managing team coordination',
      avatar: '/eman-sarfraz.jpg',
      linkedin: 'https://linkedin.com/in/eman-sarfraz',
      github: 'https://github.com/eman-sarfraz',
      email: 'eman@nexariza.ai',
    },
    {
      name: 'Abdul Rehman',
      role: 'AI/ML Engineer',
      org: 'Detecra AI',
      bio: 'Technical architect building cutting-edge AI detection systems and models',
      avatar: '/abdul-rehman.jpg',
      linkedin: 'https://linkedin.com/in/abdul-rehman',
      github: 'https://github.com/abdul-rehman',
      email: 'abdul@detecra.ai',
    },
    {
      name: 'Usman Aamer',
      role: 'Supervisor & Director',
      org: 'FOIT, University of Central Punjab',
      bio: 'Distinguished academic leader and research supervisor guiding innovative AI projects and fostering technological advancement',
      avatar: '/usman-aamer.jpg',
      linkedin: 'https://linkedin.com/in/usman-aamer',
      github: '',
      email: 'usman.aamer@ucp.edu.pk',
    },
  ];

  return (
    <section id="team" className="py-20 sm:py-32 bg-gradient-to-b from-gray-950 to-gray-900 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_80%,_var(--tw-gradient-stops))] from-blue-600/10 via-transparent to-transparent" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10" ref={ref}>
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8 }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-4">
            Meet Our <span className="bg-gradient-to-r from-cyan-400 to-blue-600 bg-clip-text text-transparent">Team</span>
          </h2>
          <div className="w-24 h-1 bg-gradient-to-r from-cyan-500 to-blue-600 mx-auto mb-8" />
          <p className="text-gray-300 text-lg sm:text-xl max-w-3xl mx-auto">
            Brilliant minds from Nexariza AI and Detecra AI working together to shape the future
          </p>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {team.map((member, index) => (
            <motion.div
              key={member.name}
              initial={{ opacity: 0, y: 30 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.8, delay: index * 0.1 }}
              whileHover={{ y: -10 }}
              className="group"
            >
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/20 to-blue-600/20 rounded-3xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />

                <div className="relative p-6 rounded-3xl bg-gradient-to-br from-gray-800 to-gray-900 border border-cyan-500/20 hover:border-cyan-500/50 transition-all duration-300">
                  <div className="relative mb-6">
                    <div className="absolute inset-0 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity blur-md" />
                    <img
                      src={member.avatar}
                      alt={member.name}
                      className="relative w-full aspect-square object-cover rounded-2xl"
                    />
                  </div>

                  <h3 className="text-xl font-bold text-white mb-1">{member.name}</h3>
                  <p className="text-cyan-400 text-sm font-semibold mb-1">{member.role}</p>
                  <p className="text-gray-400 text-xs mb-4">{member.org}</p>
                  <p className="text-gray-300 text-sm leading-relaxed mb-6">{member.bio}</p>

                  <div className="flex gap-3">
                    <motion.a
                      href={member.linkedin}
                      target="_blank"
                      rel="noopener noreferrer"
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      className="p-2 bg-cyan-500/10 border border-cyan-500/30 rounded-lg hover:bg-cyan-500/20 transition-colors"
                    >
                      <Linkedin className="w-4 h-4 text-cyan-400" />
                    </motion.a>
                    {member.github && (
                      <motion.a
                        href={member.github}
                        target="_blank"
                        rel="noopener noreferrer"
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        className="p-2 bg-cyan-500/10 border border-cyan-500/30 rounded-lg hover:bg-cyan-500/20 transition-colors"
                      >
                        <Github className="w-4 h-4 text-cyan-400" />
                      </motion.a>
                    )}
                    <motion.a
                      href={`mailto:${member.email}`}
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      className="p-2 bg-cyan-500/10 border border-cyan-500/30 rounded-lg hover:bg-cyan-500/20 transition-colors"
                    >
                      <Mail className="w-4 h-4 text-cyan-400" />
                    </motion.a>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
