"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, X } from "lucide-react";
import { colors } from "@/lib/utils";

interface SearchOverlayProps {
  sections: Array<{ id: string; title: string }>;
  onSelect: (index: number) => void;
  onClose: () => void;
}

export default function SearchOverlay({
  sections,
  onSelect,
  onClose,
}: SearchOverlayProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState(sections);

  useEffect(() => {
    if (!query.trim()) {
      setResults(sections);
      return;
    }

    const filtered = sections.filter((section) =>
      section.title.toLowerCase().includes(query.toLowerCase())
    );
    setResults(filtered);
  }, [query, sections]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-start justify-center pt-20"
    >
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl mx-4 rounded-2xl shadow-2xl overflow-hidden"
        style={{ backgroundColor: colors.white }}
      >
        <div className="p-6 border-b" style={{ borderColor: colors.primaryLight }}>
          <div className="flex items-center gap-3">
            <Search size={24} style={{ color: colors.primary }} />
            <input
              type="text"
              placeholder="Search sections..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              autoFocus
              className="flex-1 bg-transparent text-lg outline-none"
              style={{ color: colors.textDark }}
            />
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              onClick={onClose}
              className="p-2 rounded-lg"
              style={{ backgroundColor: colors.softBg }}
            >
              <X size={20} style={{ color: colors.textDark }} />
            </motion.button>
          </div>
        </div>

        <div className="max-h-96 overflow-y-auto">
          {results.length > 0 ? (
            results.map((section, idx) => (
              <motion.button
                key={section.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: idx * 0.05 }}
                onClick={() => {
                  onSelect(sections.findIndex((s) => s.id === section.id));
                  onClose();
                }}
                className="w-full text-left px-6 py-3 border-b hover:bg-pink-50 transition-colors"
                style={{ borderColor: colors.primaryLight }}
              >
                <p
                  className="font-bold"
                  style={{ color: colors.textDark }}
                >
                  {section.title}
                </p>
              </motion.button>
            ))
          ) : (
            <div className="p-8 text-center">
              <p style={{ color: colors.textLight }}>No sections found</p>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}