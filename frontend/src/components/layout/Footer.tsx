'use client';

import React from 'react';

const Footer = () => {
  return (
    <footer className="border-t border-white/10 py-4 px-6">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-purple-200/40">
        <p>&copy; {new Date().getFullYear()} Student Performance & Academic Analytics Platform. All rights reserved.</p>
        <div className="flex items-center gap-4">
          <span className="hover:text-purple-200/60 cursor-pointer transition-colors">Privacy</span>
          <span className="hover:text-purple-200/60 cursor-pointer transition-colors">Terms</span>
          <span className="hover:text-purple-200/60 cursor-pointer transition-colors">Support</span>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
