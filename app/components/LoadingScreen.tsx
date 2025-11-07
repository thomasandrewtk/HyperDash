'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';

interface LoadingScreenProps {
  isVisible: boolean;
}

export default function LoadingScreen({ isVisible }: LoadingScreenProps) {
  const [shouldRender, setShouldRender] = useState(true);

  useEffect(() => {
    if (!isVisible) {
      // Wait for fade-out animation to complete before removing from DOM
      const timer = setTimeout(() => {
        setShouldRender(false);
      }, 500); // Match fade-out duration
      return () => clearTimeout(timer);
    } else {
      setShouldRender(true);
    }
  }, [isVisible]);

  if (!shouldRender) {
    return null;
  }

  return (
    <div
      className={`fixed inset-0 z-50 bg-black flex items-center justify-center transition-opacity duration-500 ${
        isVisible ? 'opacity-100' : 'opacity-0'
      }`}
    >
      <div className="relative">
        <Image
          src="/hyperdash-logo-transparent.png"
          alt="HyperDash Logo"
          width={200}
          height={200}
          className="logo-pulse logo-glow"
          priority
        />
      </div>
    </div>
  );
}

