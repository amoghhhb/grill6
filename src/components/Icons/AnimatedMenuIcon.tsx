import React from 'react';
import { motion } from 'framer-motion';

const AnimatedMenuIcon = ({ size = 24, color = "currentColor" }) => {
  return (
    <motion.svg
      width={size}
      height={size}
      viewBox="0 0 512 512"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      whileHover="hover"
      initial="initial"
    >
      {/* Clipboard Body */}
      <motion.path
        d="M128 96V448C128 465.7 142.3 480 160 480H352C369.7 480 384 465.7 384 448V96C384 78.3 369.7 64 352 64H320V32C320 14.3 305.7 0 288 0H224C206.3 0 192 14.3 192 32V64H160C142.3 64 128 78.3 128 96Z"
        stroke={color}
        strokeWidth="24"
        strokeLinecap="round"
        strokeLinejoin="round"
        variants={{
          initial: { pathLength: 1, opacity: 1 },
          hover: { scale: 1.02, transition: { duration: 0.2 } }
        }}
      />

      {/* Top Clip Detail */}
      <motion.path
        d="M224 64H288"
        stroke={color}
        strokeWidth="24"
        strokeLinecap="round"
        variants={{
          hover: { y: -5, transition: { yoyo: Infinity, duration: 0.4 } }
        }}
      />

      {/* Knife */}
      <motion.path
        d="M192 160L256 224L320 160"
        stroke={color}
        strokeWidth="24"
        strokeLinecap="round"
        strokeLinejoin="round"
        variants={{
          initial: { rotate: 0 },
          hover: { rotate: 5, transition: { duration: 0.2 } }
        }}
      />
      <motion.path
        d="M224 256L288 320"
        stroke={color}
        strokeWidth="24"
        strokeLinecap="round"
        variants={{
          hover: { x: 2, y: 2 }
        }}
      />

      {/* Fork Detail (Crossed) */}
      <motion.path
        d="M320 160L256 224L192 288"
        stroke={color}
        strokeWidth="24"
        strokeLinecap="round"
        variants={{
          hover: { rotate: -5, transition: { duration: 0.2 } }
        }}
      />

      {/* Menu Lines */}
      <motion.path
        d="M176 360H336"
        stroke={color}
        strokeWidth="20"
        strokeLinecap="round"
        variants={{
          initial: { pathLength: 0 },
          animate: { pathLength: 1, transition: { delay: 0.2, duration: 0.5 } }
        }}
        animate="animate"
      />
      <motion.path
        d="M176 400H336"
        stroke={color}
        strokeWidth="20"
        strokeLinecap="round"
        variants={{
          initial: { pathLength: 0 },
          animate: { pathLength: 1, transition: { delay: 0.4, duration: 0.5 } }
        }}
        animate="animate"
      />
      <motion.path
        d="M176 440H256"
        stroke={color}
        strokeWidth="20"
        strokeLinecap="round"
        variants={{
          initial: { pathLength: 0 },
          animate: { pathLength: 1, transition: { delay: 0.6, duration: 0.5 } }
        }}
        animate="animate"
      />
    </motion.svg>
  );
};

export default AnimatedMenuIcon;
