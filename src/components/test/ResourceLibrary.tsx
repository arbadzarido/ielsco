"use client";

import { useState, useMemo } from "react";
import { 
  Download, FileText, BookOpen, Headphones, 
  ExternalLink, Search, ClipboardList, 
  GraduationCap, ArrowRight, Eye
} from "lucide-react";
import { cn } from "@/lib/utils";
import Pagination from "@/components/Pagination";

interface ResourceLibraryProps {
  className?: string;
}

// Helper to generate Google Drive Thumbnails
const getDriveThumbnail = (id: string) => `https://drive.google.com/thumbnail?id=${id}&sz=w400`;

const learningResources = [
  {
    id: 1,
    title: "Info for Candidates",
    description: "Official guide covering essential test day procedures and IELTS regulations.",
    type: "PDF",
    driveId: "1h2IPjkahj1yKqU1_pK0T3L1cYAMz2pQk",
  },
  {
    id: 2,
    title: "Preparation Guide",
    description: "A strategic step-by-step roadmap to plan your IELTS study journey.",
    type: "PDF",
    driveId: "1UWQ5UdDxf0OghbB5DVLlbv6kwFxwZgGD",
  },
  {
    id: 3,
    title: "Academic FAQ",
    description: "Answers to the most common questions regarding the Academic test module.",
    type: "PDF",
    driveId: "1PuIGIt0e_V1MOhCBSolSWris47PywoV3",
  },
  {
    id: 4,
    title: "Test Score Guidance",
    description: "Detailed breakdown of band descriptors to help you understand scoring criteria.",
    type: "PDF",
    driveId: "1BLceHNs_4U-yUtb7TaSswi8rBfJqeGxl",
  },
  {
    id: 5,
    title: "Helpful Hints for IELTS",
    description: "Practical tips and shortcuts to improve efficiency in all four sections.",
    type: "PDF",
    driveId: "1tHa5uNRdF6wyPDmya7cMK255bB2ytX-n",
  },
  {
    id: 6,
    title: "IELS Workshop Materials",
    description: "Comprehensive summaries from our intensive IELS training sessions.",
    type: "PDF",
    driveId: "1YRJXt6tnJNaWKZVNn6tt6suCoDs6kuBA",
  },
  {
    id: 7,
    title: "Academic Writing Practice",
    description: "Worksheets focused on improving formal writing and data description skills.",
    type: "PDF",
    driveId: "12cNgFIlBg8LGdDsEsSt6pg9L7rfhwfnE",
  },
  {
    id: 8,
    title: "IELTS Made Easy Task 1",
    description: "A simplified guide to master graphs, charts, and diagrams for Task 1.",
    type: "PDF",
    driveId: "1r1xyZuMh73rGmfLYAdpVYd1o3gEotg_F",
  },
  {
    id: 9,
    title: "Academic and General Task 2",
    description: "Master essay structures, coherence, and cohesive devices for Task 2.",
    type: "PDF",
    driveId: "1j_a22iGc_8ZLOQqTxRv6U_6JOsklQZ1u",
  },
  {
    id: 10,
    title: "How to Pass the Writing Module",
    description: "Advanced techniques and vocabulary used by Band 8.0+ candidates.",
    type: "PDF",
    driveId: "13PSuU3oZLCl5HmfhYVKeKDjIIk6bIGmD",
  }
];

const specializedFolders = [
  {
    title: "Books with Audio",
    description: "Full e-books bundled with audio tracks for authentic listening practice.",
    driveId: "14NvKo2PAf_Fzf7M5FhkgI8aPjdCx8C_I",
    icon: <Headphones className="text-blue-500" />,
    type: "FOLDER"
  },
  {
    title: "Practice Tests",
    description: "A large bank of full-length mock tests to simulate the real exam.",
    driveId: "1jbFz4_c6npkicPp9yFCLbrN2mshJj8yy",
    icon: <ClipboardList className="text-purple-500" />,
    type: "FOLDER"
  },
  {
    title: "Magoosh Practice Test",
    description: "High-quality diagnostic test material curated by Magoosh experts.",
    driveId: "1VNlRIZUV9HSJg6TaRCxFZ5JBp8sBMZPP",
    icon: <FileText className="text-red-500" />,
    type: "FILE"
  }
];

export default function ResourceLibrary({ className }: ResourceLibraryProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(0);
  const itemsPerPage = 3;

  const filteredResources = useMemo(() => {
    return learningResources.filter((item) =>
      item.title.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [searchQuery]);

  const pageCount = Math.ceil(filteredResources.length / itemsPerPage);
  const offset = currentPage * itemsPerPage;
  const currentResources = filteredResources.slice(offset, offset + itemsPerPage);

  return (
    <div className={cn("mb-20", className)}>
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-10 gap-6">
        <div className="space-y-1">
          <h2 className="text-3xl font-bold text-[#304156] tracking-tight">IELTS Resource Library</h2>
          <p className="text-[#577E90] font-medium flex items-center gap-2">
            Follow the learning flow from top to bottom for the best results <ArrowRight size={16} />
          </p>
        </div>
        
        <div className="relative w-full md:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input 
            type="text" 
            placeholder="Search materials..." 
            value={searchQuery}
            onChange={(e) => {setSearchQuery(e.target.value); setCurrentPage(0);}}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-[#E3E7ED]/50 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#577E90]/20"
          />
        </div>
      </div>

      {/* Main Flow (Paginated) */}
      <div className="grid gap-6 mb-12">
        {currentResources.map((resource, index) => (
          <div key={resource.id} className="group bg-white hover:bg-[#F7F8FA] border border-[#E3E7ED]/30 rounded-2xl overflow-hidden transition-all flex flex-col sm:flex-row items-center shadow-sm">
            {/* Thumbnail Preview */}
            <div className="w-full sm:w-48 aspect-video sm:aspect-square bg-gray-100 relative overflow-hidden shrink-0 border-r border-[#E3E7ED]/20">
              <img 
                src={getDriveThumbnail(resource.driveId)} 
                alt={resource.title}
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                onError={(e) => (e.currentTarget.src = "https://placehold.co/400x400/304156/white?text=IELS+PDF")}
              />
              <div className="absolute top-2 left-2 bg-[#304156] text-white w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs">
                {offset + index + 1}
              </div>
            </div>

            <div className="p-6 flex-1 flex flex-col sm:flex-row items-center justify-between gap-6 w-full">
              <div>
                <span className="text-[10px] font-bold text-[#577E90] uppercase tracking-widest bg-[#577E90]/5 px-2 py-0.5 rounded mb-2 inline-block">
                  {resource.type}
                </span>
                <h3 className="text-xl font-bold text-[#304156] group-hover:text-[#E56668] transition-colors">{resource.title}</h3>
                <p className="text-sm text-gray-500 mt-1">{resource.description}</p>
              </div>
              
              <div className="flex gap-2 w-full sm:w-auto">
                <a 
                  href={`https://drive.google.com/file/d/${resource.driveId}/view`} 
                  target="_blank" 
                  className="flex items-center justify-center gap-2 px-6 py-2.5 bg-[#E56668] text-white rounded-xl font-bold hover:bg-[#d65557] shadow-md hover:shadow-red-200 transition-all active:scale-95"
                >
                  <Eye size={16} /> Open
                </a>
              </div>
            </div>
          </div>
        ))}
      </div>

      {pageCount > 1 && (
        <Pagination pageCount={pageCount} onPageChange={({ selected }) => setCurrentPage(selected)} currentPage={currentPage} />
      )}

      {/* Folders & Practice Section */}
      <div className="mt-20 pt-10 border-t border-[#E3E7ED]/30">
        <h3 className="text-2xl font-bold text-[#304156] mb-8">Specialized Practice Packs</h3>
        <div className="grid md:grid-cols-3 gap-6">
          {specializedFolders.map((folder, idx) => (
            <a 
              key={idx}
              href={folder.type === "FOLDER" 
                ? `https://drive.google.com/drive/folders/${folder.driveId}` 
                : `https://drive.google.com/file/d/${folder.driveId}/view`}
              target="_blank"
              className="p-8 bg-white rounded-[2rem] border border-[#E3E7ED]/30 hover:border-[#E56668] transition-all group relative overflow-hidden"
            >
              <div className="absolute -top-4 -right-4 w-24 h-24 bg-gray-50 rounded-full group-hover:scale-150 transition-transform duration-700" />
              <div className="relative z-10">
                <div className="w-14 h-14 bg-white shadow-sm rounded-2xl flex items-center justify-center mb-6">
                  {folder.icon}
                </div>
                <h4 className="text-xl font-bold text-[#304156] mb-2">{folder.title}</h4>
                <p className="text-sm text-gray-500 mb-6">{folder.description}</p>
                <div className="text-[#E56668] text-sm font-bold flex items-center gap-2">
                  Explore Now <ExternalLink size={14} />
                </div>
              </div>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}