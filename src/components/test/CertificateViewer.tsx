"use client";

import { useState, useEffect, useRef } from "react"; // Tambah useRef
import { X, Download, Share2, CheckCircle2, ExternalLink, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

interface CertificateViewerProps {
  attemptId: string;
  onClose: () => void;
}

export default function CertificateViewer({ attemptId, onClose }: CertificateViewerProps) {
  const [loading, setLoading] = useState(true);
  const [certificate, setCertificate] = useState<{
    certificateNumber: string;
    pdfUrl: string;
    verificationCode: string;
    issuedAt: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);

  // --- SAFETY GUARD: Cegah Infinite Loop ---
  const hasFetched = useRef(false); 

  useEffect(() => {
    // Kalau sudah pernah fetch atau attemptId kosong, jangan jalan lagi!
    if (hasFetched.current || !attemptId) return;
    
    fetchCertificate();
    hasFetched.current = true; // Kunci biar cuma jalan sekali
  }, [attemptId]);

  const fetchCertificate = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/test/generate-certificate?attemptId=${attemptId}`);
      
      // Jika 404, baru coba generate (POST)
      if (response.status === 404) {
        await generateCertificate();
        return;
      }

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to fetch certificate');

      setCertificate(data.certificate);
    } catch (err) {
      console.error("Fetch Error:", err);
      setError(err instanceof Error ? err.message : 'Failed to load certificate');
    } finally {
      setLoading(false);
    }
  };

  const generateCertificate = async () => {
    // Guard tambahan biar gak double generate
    if (generating) return;

    try {
      setGenerating(true);
      const response = await fetch('/api/test/generate-certificate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ attemptId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate certificate');
      }

      setCertificate(data.certificate);
    } catch (err) {
      console.error("Generate Error:", err);
      setError(err instanceof Error ? err.message : 'Failed to generate certificate');
    } finally {
      setGenerating(false);
      setLoading(false);
    }
  };

  // --- UI REMAINS THE SAME (Sesuai janji gak otak-atik layout) ---
  const handleDownload = () => {
    if (certificate?.pdfUrl) {
      window.open(certificate.pdfUrl, '_blank');
    }
  };

  const handleShare = async () => {
    if (!certificate) return;
    const shareData = {
      title: 'IELS Test Certificate',
      text: `I achieved ${certificate.certificateNumber} in my IELS test!`,
      url: `https://iels.id/verify/${certificate.verificationCode}`,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (err) { /* silent */ }
    } else {
      navigator.clipboard.writeText(shareData.url);
      alert('Link copied to clipboard!');
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-[#1A2534]/80 backdrop-blur-md z-[110] flex items-center justify-center p-4 animate-in fade-in duration-300"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-[2.5rem] max-w-4xl w-full shadow-2xl max-h-[90vh] overflow-y-auto relative animate-in slide-in-from-bottom-8 duration-500"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-white/80 backdrop-blur-md border-b border-gray-50 px-8 py-6 rounded-t-[2.5rem] z-10 flex justify-between items-center">
          <div>
            <h3 className="text-2xl font-black text-[#2F4157]">IELS Certificate</h3>
            {certificate && (
              <p className="text-sm font-bold text-[#E56668] mt-1 uppercase tracking-widest">
                NO: {certificate.certificateNumber}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-3 bg-gray-50 hover:bg-gray-100 rounded-2xl transition-all"
          >
            <X size={20} className="text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="p-8">
          {loading || generating ? (
            <div className="flex flex-col items-center justify-center py-24">
              <div className="w-16 h-16 border-4 border-[#E56668] border-t-transparent rounded-full animate-spin mb-6"></div>
              <p className="text-[#2F4157] font-black text-xl">
                {generating ? 'Securing your achievement...' : 'Retrieving certificate...'}
              </p>
              <p className="text-gray-400 mt-2">Please wait, we are verifying your data.</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-20 h-20 bg-red-50 rounded-[2rem] flex items-center justify-center mb-6">
                <AlertTriangle size={40} className="text-red-500" />
              </div>
              <p className="text-2xl font-black text-[#2F4157] mb-2">Something went wrong</p>
              <p className="text-gray-500 max-w-xs mx-auto mb-8">{error}</p>
              <button
                onClick={() => {
                  hasFetched.current = false; // Reset guard buat coba lagi
                  fetchCertificate();
                }}
                className="px-8 py-3 bg-[#E56668] text-white rounded-xl font-bold hover:bg-[#C04C4E] transition-all shadow-xl shadow-red-100"
              >
                Try Again
              </button>
            </div>
          ) : certificate ? (
            <>
              <div className="bg-[#F7F8FA] rounded-[2rem] p-10 border-2 border-dashed border-gray-200 mb-8 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-5">
                   <CheckCircle2 size={150} />
                </div>
                
                <div className="bg-white rounded-3xl p-10 text-center shadow-sm relative z-10">
                  <div className="mb-8">
                    <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-6">
                      <CheckCircle2 size={48} className="text-green-500" />
                    </div>
                    <h4 className="text-3xl font-black text-[#2F4157] mb-3">Verification Ready</h4>
                    <p className="text-gray-500">Your official IELS test certificate has been successfully issued and verified.</p>
                  </div>

                  <div className="grid md:grid-cols-2 gap-6 mb-8 text-left">
                    <div className="p-5 bg-gray-50 rounded-2xl border border-gray-100">
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2">ID Number</p>
                      <p className="text-lg font-bold text-[#2F4157]">{certificate.certificateNumber}</p>
                    </div>
                    <div className="p-5 bg-gray-50 rounded-2xl border border-gray-100">
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2">Verification Code</p>
                      <p className="text-lg font-bold text-[#2F4157]">{certificate.verificationCode}</p>
                    </div>
                  </div>

                  <div className="inline-flex items-center gap-2 px-6 py-2 bg-green-50 text-green-700 rounded-full text-sm font-bold border border-green-100">
                    <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                    Issued on {new Date(certificate.issuedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                  </div>
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <button
                  onClick={handleDownload}
                  className="flex items-center justify-center gap-3 py-4 bg-[#E56668] text-white rounded-2xl font-bold hover:bg-[#C04C4E] transition-all shadow-xl shadow-red-100"
                >
                  <Download size={20} /> Download PDF
                </button>
                <button
                  onClick={handleShare}
                  className="flex items-center justify-center gap-3 py-4 bg-[#2F4157] text-white rounded-2xl font-bold hover:bg-[#1A2534] transition-all shadow-xl shadow-blue-100"
                >
                  <Share2 size={20} /> Share Result
                </button>
              </div>

              <div className="mt-8 p-5 bg-blue-50/50 rounded-2xl border border-blue-100 flex items-center justify-center text-center">
                <p className="text-sm text-blue-900 font-medium">
                  Public verification link: <a href={`https://iels.id/verify/${certificate.verificationCode}`} target="_blank" className="text-[#E56668] font-bold underline ml-1">iels.id/verify/{certificate.verificationCode}</a>
                </p>
              </div>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}