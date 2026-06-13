import { motion } from "framer-motion";
import { colors } from "@/lib/utils";

interface ProgressBarProps {
  progress: number;
}

export default function ProgressBar({ progress }: ProgressBarProps) {
  return (
    <div className="w-full h-1 bg-pink-100 overflow-hidden">
      <motion.div
        className="h-full"
        style={{ backgroundColor: colors.primary }}
        initial={{ width: 0 }}
        animate={{ width: `${progress}%` }}
        transition={{ duration: 0.5, ease: "easeOut" }}
      />
    </div>
  );
}