import { ArrowRight, Compass, Map } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

interface HeroProps {
  onGetStarted: () => void;
  onLearnMore: () => void;
}

export default function Hero({ onGetStarted, onLearnMore }: HeroProps) {
  return (
    <div className="relative h-[90vh] flex items-center justify-center overflow-hidden">
      <div 
        className="absolute inset-0 bg-cover bg-center scale-110 animate-[zoom_25s_ease-in-out_infinite]"
        style={{
          backgroundImage: `url('https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?w=1920&q=80')`,
        }}
      />
      
      <div className="absolute inset-0 bg-gradient-to-br from-blue-900/50 via-purple-900/60 to-black/80" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(139,92,246,0.15),transparent_70%)]" />
      
      <motion.div 
        className="absolute top-20 left-10 opacity-20"
        animate={{ 
          rotate: 360,
          scale: [1, 1.1, 1],
        }}
        transition={{ 
          rotate: { duration: 20, repeat: Infinity, ease: "linear" },
          scale: { duration: 4, repeat: Infinity, ease: "easeInOut" }
        }}
      >
        <Compass className="h-32 w-32 text-blue-200" />
      </motion.div>

      <motion.div 
        className="absolute bottom-20 right-10 opacity-10"
        animate={{ 
          y: [0, -20, 0],
        }}
        transition={{ 
          duration: 6,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      >
        <Map className="h-40 w-40 text-purple-200" />
      </motion.div>
      
      <motion.div 
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="relative z-10 max-w-5xl mx-auto px-6 text-center text-white"
      >
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2, duration: 0.6 }}
          className="inline-flex items-center gap-2 mb-6 px-5 py-2.5 rounded-full bg-gradient-to-r from-blue-500/20 to-purple-500/20 backdrop-blur-md border border-white/30 shadow-lg"
        >
          <div className="h-2 w-2 rounded-full bg-green-400 animate-pulse" />
          <p className="text-sm font-medium">Begin Your Humanitarian Quest</p>
        </motion.div>

        <motion.h1 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.8 }}
          className="text-5xl md:text-7xl font-display font-bold mb-6 leading-tight" 
          data-testid="text-hero-title"
        >
          Your Journey to Make
          <br />
          <span className="bg-gradient-to-r from-blue-200 via-purple-200 to-blue-200 bg-clip-text text-transparent animate-[gradient_6s_ease-in-out_infinite]">
            an Impact Starts Here
          </span>
        </motion.h1>

        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6, duration: 0.8 }}
          className="text-xl md:text-2xl mb-10 text-white/90 max-w-3xl mx-auto leading-relaxed"
        >
          Discover where your help matters most and take your first step toward change.
        </motion.p>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8, duration: 0.6 }}
          className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-4 w-full max-w-md sm:max-w-none mx-auto"
        >
          <Button
            size="lg"
            onClick={onGetStarted}
            className="group text-lg px-10 py-6 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white shadow-2xl shadow-purple-500/30 border-0 h-auto transition-all duration-300 hover:scale-105"
            data-testid="button-get-started"
          >
            Begin Your Journey
            <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
          </Button>
          <Button
            size="lg"
            variant="outline"
            onClick={onLearnMore}
            className="text-lg px-10 py-6 bg-white/10 backdrop-blur-md border-white/40 text-white hover:bg-white/20 h-auto transition-all duration-300 hover:scale-105"
            data-testid="button-learn-more"
          >
            How It Works
          </Button>
        </motion.div>
        
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1, duration: 0.8 }}
          className="mt-16 flex flex-wrap items-center justify-center gap-8 md:gap-12 text-sm"
        >
          <motion.div 
            whileHover={{ scale: 1.05 }}
            className="text-center"
          >
            <p className="text-3xl font-display font-bold mb-1 bg-gradient-to-r from-blue-200 to-purple-200 bg-clip-text text-transparent">2.8M+</p>
            <p className="text-white/70">Donated</p>
          </motion.div>
          <div className="h-12 w-px bg-white/20" />
          <motion.div 
            whileHover={{ scale: 1.05 }}
            className="text-center"
          >
            <p className="text-3xl font-display font-bold mb-1 bg-gradient-to-r from-blue-200 to-purple-200 bg-clip-text text-transparent">156K+</p>
            <p className="text-white/70">People Helped</p>
          </motion.div>
          <div className="h-12 w-px bg-white/20" />
          <motion.div 
            whileHover={{ scale: 1.05 }}
            className="text-center"
          >
            <p className="text-3xl font-display font-bold mb-1 bg-gradient-to-r from-blue-200 to-purple-200 bg-clip-text text-transparent">47</p>
            <p className="text-white/70">Organizations</p>
          </motion.div>
        </motion.div>
      </motion.div>
    </div>
  );
}
