import { motion, useReducedMotion } from 'framer-motion';

// Animated AI orb — visual identity of the KathyaAI assistant.
// Pulsing concentric rings with a soft radial glow and breathing core.
export default function AIOrb({
  size = 120,
  active = false,
  label,
}: {
  size?: number;
  active?: boolean;
  label?: string;
}) {
  const prefersReduced = useReducedMotion() ?? false;
  const ringCount = 3;

  if (prefersReduced) {
    return (
      <div
        className="relative flex items-center justify-center"
        style={{ width: size, height: size }}
        role="img"
        aria-label={label ?? 'AI assistant'}
      >
        <div
          className="absolute rounded-full blur-2xl"
          style={{
            width: size * 1.2,
            height: size * 1.2,
            background: 'radial-gradient(circle, rgba(201,168,118,0.15) 0%, transparent 70%)',
          }}
        />
        <div
          className="relative flex items-center justify-center rounded-full"
          style={{
            width: size * 0.5,
            height: size * 0.5,
            background: 'linear-gradient(135deg, #1A1A1F 0%, #33302C 40%, #C9A876 100%)',
            boxShadow: '0 0 20px rgba(201,168,118,0.3)',
          }}
        />
      </div>
    );
  }

  return (
    <div
      className="relative flex items-center justify-center"
      style={{ width: size, height: size }}
      role="img"
      aria-label={label ?? 'AI assistant'}
    >
      {/* Outer glow */}
      <motion.div
        className="absolute rounded-full blur-2xl"
        style={{
          width: size * 1.3,
          height: size * 1.3,
          background: 'radial-gradient(circle, rgba(201,168,118,0.18) 0%, rgba(201,168,118,0.08) 50%, transparent 70%)',
        }}
        animate={{ opacity: [0.5, 0.8, 0.5], scale: [1, 1.08, 1] }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* Pulsing rings */}
      {Array.from({ length: ringCount }).map((_, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full border-2"
          style={{
            width: size * (0.85 - i * 0.15),
            height: size * (0.85 - i * 0.15),
            borderColor: i === 0 ? 'rgba(201,168,118,0.35)' : i === 1 ? 'rgba(201,168,118,0.2)' : 'rgba(201,168,118,0.1)',
          }}
          animate={{
            scale: active ? [1, 1.3, 1] : [1, 1.12, 1],
            opacity: [0.6, 0.1, 0.6],
          }}
          transition={{
            duration: active ? 1.2 : 3,
            repeat: Infinity,
            delay: i * 0.4,
            ease: 'easeInOut',
          }}
        />
      ))}

      {/* Core orb */}
      <motion.div
        className="relative flex items-center justify-center rounded-full"
        style={{
          width: size * 0.5,
          height: size * 0.5,
          background: 'linear-gradient(135deg, #1A1A1F 0%, #33302C 40%, #C9A876 100%)',
          boxShadow: '0 0 20px rgba(201,168,118,0.3), inset 0 0 15px rgba(255,255,255,0.1)',
        }}
        animate={{
          scale: active ? [1, 1.08, 1] : [1, 1.04, 1],
        }}
        transition={{
          duration: active ? 0.8 : 3.5,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      >
        {/* Inner shimmer */}
        <motion.div
          className="absolute rounded-full bg-white/20"
          style={{ width: '40%', height: '40%', top: '15%', left: '15%' }}
          animate={{ opacity: [0.3, 0.6, 0.3] }}
          transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
        />
      </motion.div>
    </div>
  );
}

// Floating info card used around the AI orb.
export function FloatingCard({
  children,
  delay = 0,
  className = '',
  position = '',
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
  position?: string;
}) {
  return (
    <motion.div
      className={`absolute ${position} z-10`}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{
        opacity: 1,
        scale: 1,
        y: [0, -8, 0],
      }}
      transition={{
        opacity: { duration: 0.5, delay },
        scale: { duration: 0.5, delay },
        y: {
          duration: 4,
          repeat: Infinity,
          ease: 'easeInOut',
          delay,
        },
      }}
    >
      <div
        className={`rounded-xl border border-cream-200 bg-cream-50/95 px-3 py-2 text-xs font-semibold shadow-soft-lg backdrop-blur-md dark:border-primary-600/50 dark:bg-primary-800/95 ${className}`}
      >
        {children}
      </div>
    </motion.div>
  );
}
