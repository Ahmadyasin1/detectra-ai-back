import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Play, Pause, RotateCcw, Eye, Target, Zap, Brain, Camera, Volume2, VolumeX } from 'lucide-react';

const DEMO_VIDEO_URL = 'https://txkwnceefmaotmqluajc.supabase.co/storage/v1/object/sign/videos/WhatsApp%20Video%202025-10-31%20at%206.05.36%20PM.mp4?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV85M2I5Nzc3Ny03Y2UzLTQ4ODItODI1My0wMTE5ODRkMDcwYjUiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJ2aWRlb3MvV2hhdHNBcHAgVmlkZW8gMjAyNS0xMC0zMSBhdCA2LjA1LjM2IFBNLm1wNCIsImlhdCI6MTc2NjgwMzQ1MSwiZXhwIjoxODI5ODc1NDUxfQ.FE8CA643RBbDrCKUnEzq4awXhTUpg8Rr7MubFVP_Cd8';

export default function DetectraVideoShowcase() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentFrame, setCurrentFrame] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [videoError, setVideoError] = useState(false);
  const [videoLoading, setVideoLoading] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();

  // Simulated video frames with different detection scenarios
  const videoFrames = [
    {
      scene: 'Street Scene',
      detections: [
        { type: 'person', confidence: 0.95, x: 120, y: 180, w: 60, h: 120, color: '#06b6d4' },
        { type: 'car', confidence: 0.89, x: 300, y: 220, w: 140, h: 80, color: '#3b82f6' },
        { type: 'bicycle', confidence: 0.87, x: 200, y: 200, w: 80, h: 60, color: '#8b5cf6' }
      ],
      audio: 'Street noise, car engines, footsteps'
    },
    {
      scene: 'Office Environment',
      detections: [
        { type: 'person', confidence: 0.92, x: 150, y: 150, w: 70, h: 130, color: '#06b6d4' },
        { type: 'person', confidence: 0.88, x: 350, y: 160, w: 65, h: 125, color: '#06b6d4' },
        { type: 'laptop', confidence: 0.94, x: 200, y: 200, w: 100, h: 60, color: '#f59e0b' },
        { type: 'chair', confidence: 0.91, x: 100, y: 250, w: 80, h: 100, color: '#10b981' }
      ],
      audio: 'Keyboard typing, office chatter, phone ringing'
    },
    {
      scene: 'Park Scene',
      detections: [
        { type: 'person', confidence: 0.96, x: 100, y: 200, w: 55, h: 110, color: '#06b6d4' },
        { type: 'dog', confidence: 0.93, x: 180, y: 250, w: 40, h: 60, color: '#ef4444' },
        { type: 'tree', confidence: 0.89, x: 300, y: 100, w: 60, h: 200, color: '#22c55e' },
        { type: 'bench', confidence: 0.85, x: 250, y: 220, w: 120, h: 40, color: '#a855f7' }
      ],
      audio: 'Birds chirping, wind, distant traffic'
    },
    {
      scene: 'Shopping Mall',
      detections: [
        { type: 'person', confidence: 0.94, x: 80, y: 180, w: 50, h: 120, color: '#06b6d4' },
        { type: 'person', confidence: 0.91, x: 200, y: 190, w: 55, h: 115, color: '#06b6d4' },
        { type: 'person', confidence: 0.88, x: 320, y: 185, w: 52, h: 118, color: '#06b6d4' },
        { type: 'shopping_cart', confidence: 0.92, x: 150, y: 250, w: 80, h: 60, color: '#f97316' },
        { type: 'escalator', confidence: 0.87, x: 400, y: 150, w: 60, h: 150, color: '#6366f1' }
      ],
      audio: 'Footsteps, shopping cart wheels, announcements'
    },
    {
      scene: 'Traffic Intersection',
      detections: [
        { type: 'car', confidence: 0.96, x: 100, y: 200, w: 120, h: 70, color: '#3b82f6' },
        { type: 'car', confidence: 0.93, x: 300, y: 180, w: 130, h: 75, color: '#3b82f6' },
        { type: 'truck', confidence: 0.89, x: 200, y: 220, w: 150, h: 90, color: '#1d4ed8' },
        { type: 'motorcycle', confidence: 0.91, x: 400, y: 190, w: 60, h: 80, color: '#dc2626' },
        { type: 'traffic_light', confidence: 0.95, x: 250, y: 100, w: 30, h: 80, color: '#16a34a' }
      ],
      audio: 'Engine sounds, horns, traffic noise'
    }
  ];

  const detectionStats = [
    { label: 'Objects Detected', value: '127', icon: Eye, color: 'from-blue-500 to-cyan-500' },
    { label: 'Detection Accuracy', value: '99.7%', icon: Target, color: 'from-cyan-500 to-green-500' },
    { label: 'Processing Speed', value: '&lt;10ms', icon: Zap, color: 'from-green-500 to-yellow-500' },
    { label: 'AI Confidence', value: '94.2%', icon: Brain, color: 'from-yellow-500 to-orange-500' },
  ];

  useEffect(() => {
    // Fallback animation for canvas if video fails
    if (videoError && isPlaying) {
      const animate = () => {
        setCurrentFrame((prev) => (prev + 1) % videoFrames.length);
        animationRef.current = requestAnimationFrame(animate);
      };
      animationRef.current = requestAnimationFrame(animate);
    } else {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPlaying, videoError]);

  const drawVideoFrame = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const frame = videoFrames[currentFrame];
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw background grid
    ctx.strokeStyle = 'rgba(6, 182, 212, 0.1)';
    ctx.lineWidth = 1;
    for (let i = 0; i < canvas.width; i += 20) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, canvas.height);
      ctx.stroke();
    }
    for (let i = 0; i < canvas.height; i += 20) {
      ctx.beginPath();
      ctx.moveTo(0, i);
      ctx.lineTo(canvas.width, i);
      ctx.stroke();
    }

    // Draw detection boxes with animations
    frame.detections.forEach((detection, index) => {
      const pulse = Math.sin(Date.now() * 0.005 + index) * 0.1 + 1;
      
      // Draw bounding box
      ctx.strokeStyle = detection.color;
      ctx.lineWidth = 3;
      ctx.strokeRect(detection.x, detection.y, detection.w, detection.h);

      // Draw label background
      ctx.fillStyle = detection.color;
      ctx.fillRect(detection.x, detection.y - 25, detection.w, 25);

      // Draw label text
      ctx.fillStyle = 'white';
      ctx.font = 'bold 12px Inter';
      ctx.fillText(
        `${detection.type.toUpperCase()} ${Math.round(detection.confidence * 100)}%`,
        detection.x + 5,
        detection.y - 8
      );

      // Draw confidence bar
      ctx.fillStyle = detection.color + '40';
      ctx.fillRect(detection.x, detection.y + detection.h + 2, detection.w, 6);
      ctx.fillStyle = detection.color;
      ctx.fillRect(detection.x, detection.y + detection.h + 2, detection.w * detection.confidence, 6);

      // Draw pulsing effect
      ctx.strokeStyle = detection.color + '60';
      ctx.lineWidth = 1;
      ctx.strokeRect(
        detection.x - 5 * pulse,
        detection.y - 5 * pulse,
        detection.w + 10 * pulse,
        detection.h + 10 * pulse
      );
    });

    // Draw scene info overlay
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(10, 10, 200, 60);
    ctx.fillStyle = '#06b6d4';
    ctx.font = 'bold 14px Inter';
    ctx.fillText(frame.scene, 20, 30);
    ctx.fillStyle = 'white';
    ctx.font = '12px Inter';
    ctx.fillText(`Frame: ${currentFrame + 1}/${videoFrames.length}`, 20, 50);
  };

  useEffect(() => {
    drawVideoFrame();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentFrame]);


  return (
    <section className="py-16 sm:py-24 bg-gradient-to-b from-gray-900 to-gray-950 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,_var(--tw-gradient-stops))] from-cyan-500/5 via-transparent to-transparent" />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-6">
            Detectra AI <span className="bg-gradient-to-r from-cyan-400 to-blue-600 bg-clip-text text-transparent">Live Demo</span>
          </h2>
          <p className="text-gray-300 text-lg max-w-3xl mx-auto">
            Watch our AI model in action - detecting objects, people, and scenes in real-time with high accuracy
          </p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Video Player */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
            className="relative"
          >
            <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl p-6 border border-cyan-500/20">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <Camera className="w-5 h-5 text-cyan-400" />
                  Live Detection Feed
                </h3>
                <div className="flex items-center gap-2">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setIsMuted(!isMuted)}
                    className="p-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-all duration-200"
                  >
                    {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
                  </motion.button>
                  <div className="flex items-center gap-2 text-sm text-cyan-400">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                    <span>Live</span>
                  </div>
                </div>
              </div>

              <div className="relative">
                {videoError ? (
                  <div className="w-full h-80 bg-white/5 backdrop-blur-md rounded-lg border border-white/20 flex items-center justify-center">
                    <div className="text-center">
                      <Camera className="w-12 h-12 text-gray-600 mx-auto mb-2" />
                      <p className="text-gray-400 text-sm">Video unavailable. Showing demo visualization.</p>
                    </div>
                  </div>
                ) : (
                  <>
                    <video
                      ref={videoRef}
                      src={DEMO_VIDEO_URL}
                      className="w-full h-80 bg-white/5 backdrop-blur-md rounded-lg border border-white/20 object-contain"
                      controls={false}
                      muted={isMuted}
                      playsInline
                      onLoadedData={() => {
                        setVideoLoading(false);
                        setVideoError(false);
                      }}
                      onError={() => {
                        setVideoError(true);
                        setVideoLoading(false);
                      }}
                      onPlay={() => setIsPlaying(true)}
                      onPause={() => setIsPlaying(false)}
                    />
                    {videoLoading && (
                      <div className="absolute inset-0 flex items-center justify-center bg-white/5 backdrop-blur-md rounded-lg">
                        <div className="text-center">
                          <div className="w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                          <p className="text-gray-400 text-sm">Loading video...</p>
                        </div>
                      </div>
                    )}
                    
                    {/* Video Controls Overlay */}
                    <div className="absolute bottom-4 left-4 right-4 bg-white/5 backdrop-blur-md backdrop-blur-sm rounded-lg p-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => {
                              if (videoRef.current) {
                                if (isPlaying) {
                                  videoRef.current.pause();
                                } else {
                                  videoRef.current.play();
                                }
                              }
                            }}
                            className="p-2 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-lg hover:shadow-lg hover:shadow-cyan-500/30 transition-all duration-200"
                          >
                            {isPlaying ? <Pause size={20} /> : <Play size={20} />}
                          </motion.button>
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => {
                              if (videoRef.current) {
                                videoRef.current.currentTime = 0;
                                videoRef.current.pause();
                                setIsPlaying(false);
                              }
                            }}
                            className="p-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-all duration-200"
                          >
                            <RotateCcw size={20} />
                          </motion.button>
                        </div>
                        <div className="text-white text-sm">
                          Detectra AI Demo Video
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Detection Results */}
              <div className="mt-4">
                <h4 className="text-white font-semibold mb-3">Current Detections:</h4>
                <div className="grid grid-cols-2 gap-2">
                  {videoFrames[currentFrame].detections.map((detection, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="flex items-center justify-between bg-gray-700/50 rounded-lg p-2"
                    >
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: detection.color }}
                        />
                        <span className="text-white font-medium text-sm capitalize">{detection.type}</span>
                      </div>
                      <div className="text-cyan-400 font-semibold text-sm">
                        {Math.round(detection.confidence * 100)}%
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>

          {/* Performance Metrics */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
            className="space-y-8"
          >
            <div>
              <h3 className="text-2xl font-bold text-white mb-6">Real-Time Performance</h3>
              <div className="grid grid-cols-2 gap-4">
                {detectionStats.map((stat, index) => (
                  <motion.div
                    key={stat.label}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    whileHover={{ scale: 1.02 }}
                    className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl p-6 border border-cyan-500/20 hover:border-cyan-500/40 transition-all duration-200"
                  >
                    <div className={`w-12 h-12 bg-gradient-to-br ${stat.color} rounded-xl flex items-center justify-center mb-4`}>
                      <stat.icon className="w-6 h-6 text-white" />
                    </div>
                    <div className="text-2xl font-bold text-white mb-2">{stat.value}</div>
                    <div className="text-gray-300 text-sm">{stat.label}</div>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Detection Types */}
            <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl p-6 border border-cyan-500/20">
              <h4 className="text-lg font-bold text-white mb-4">Detection Capabilities</h4>
              <div className="space-y-3">
                {[
                  { type: 'Person Detection', accuracy: '99.2%', color: '#06b6d4' },
                  { type: 'Vehicle Recognition', accuracy: '98.7%', color: '#3b82f6' },
                  { type: 'Object Classification', accuracy: '97.8%', color: '#8b5cf6' },
                  { type: 'Scene Understanding', accuracy: '96.5%', color: '#f59e0b' },
                  { type: 'Audio Analysis', accuracy: '94.2%', color: '#10b981' }
                ].map((capability) => (
                  <div key={capability.type} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: capability.color }}
                      />
                      <span className="text-white text-sm">{capability.type}</span>
                    </div>
                    <span className="text-cyan-400 font-semibold text-sm">{capability.accuracy}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Technical Specs */}
            <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl p-6 border border-cyan-500/20">
              <h4 className="text-lg font-bold text-white mb-4">Technical Specifications</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="text-gray-400">Model Architecture</div>
                  <div className="text-white font-semibold">YOLO v8 + Transformer</div>
                </div>
                <div>
                  <div className="text-gray-400">Input Resolution</div>
                  <div className="text-white font-semibold">1920x1080</div>
                </div>
                <div>
                  <div className="text-gray-400">Processing Speed</div>
                  <div className="text-white font-semibold">&lt;10ms per frame</div>
                </div>
                <div>
                  <div className="text-gray-400">Model Size</div>
                  <div className="text-white font-semibold">25.6MB</div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
