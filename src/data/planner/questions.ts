import { Question } from "@/data/planner";

export const MOCK_INTERVIEW_QUESTIONS: Question[] = [
  // ==========================================
  // HR QUESTIONS (5)
  // ==========================================
  {
    id: "hr-1",
    category: "hr",
    question: "Ceritakan tentang diri Anda.",
    suggestedAnswer: "Saya Reghien Arifa Suci, mahasiswa DKV Universitas Muhammadiyah Tangerang. Saya memiliki fokus pada branding dan komunikasi visual yang berorientasi pada hasil. Baru saja menyelesaikan magang sebagai Creative Intern di IELS (PT English Space Berkah Indonesia), sebuah Global Launchpad di mana saya memproduksi 20+ aset konten untuk kampanye internasional ke National University of Singapore. Saya adalah seorang yang disiplin dengan rekam jejak 100% ketepatan waktu pengiriman desain, serta peraih prestasi nasional di PEKSIMINAS XVII. Saya ingin membawa dedikasi dan keterampilan eksekusi kreatif saya ke dalam tim Lawson.",
    arbaNotes: "Tekankan kedisiplinan dan keberhasilanmu dalam mengelola target (20+ konten & 100% on-time).",
  },
  {
    id: "hr-2",
    category: "hr",
    question: "Mengapa Anda tertarik dengan magang di Lawson ini?",
    suggestedAnswer: "Saya tertarik dengan Lawson karena komitmennya terhadap pengalaman pelanggan dan keunggulan retail. Saya melihat tim kreatif sebagai jantung dalam membangun koneksi brand dengan pelanggan. Pendekatan modern Lawson terhadap convenience retail, dipadukan dengan fokusnya pada komunikasi visual dan branding, sangat sejalan dengan latar belakang desain saya. Saya ingin berkontribusi dengan keterampilan kreatif saya sekaligus belajar dari tim Anda tentang bagaimana desain memengaruhi pengalaman pelanggan nyata di dunia retail.",
    arbaNotes: "Berikan alasan spesifik tentang Lawson. Tunjukkan bahwa kamu sudah meriset perusahaan ini.",
  },
  {
    id: "hr-3",
    category: "hr",
    question: "Apa kelebihan Anda?",
    suggestedAnswer: "Kelebihan utama saya adalah pemikiran kreatif, keterampilan komunikasi yang kuat, dan keandalan. Saya bisa dengan cepat memahami brief desain dan menerjemahkannya menjadi solusi visual. Saya juga pendengar yang baik - saya memperhatikan masukan dan menggunakannya untuk memperbaiki hasil kerja saya. Pengalaman kepemimpinan saya sebagai Ketua HIMA DKV membuat saya terbiasa berkolaborasi dengan berbagai kepribadian dan gaya kerja.",
    arbaNotes: "Dukung dengan contoh. Jangan hanya mengklaim - buktikan.",
  },
  {
    id: "hr-6",
    category: "hr",
    question: "Ceritakan saat Anda berhasil mengatasi sebuah tantangan.",
    suggestedAnswer: "Saat magang di IELS, saya bertanggung jawab atas konten kampanye 'Global Impact Fellowship to NUS'. Tantangannya adalah volume produksi yang tinggi (20+ aset) dengan standar kualitas yang ketat. Saya melakukan inisiatif manajemen waktu yang proaktif dan menjalin komunikasi lintas divisi dengan tim marketing untuk memastikan semua brief dipahami tanpa ambiguitas. Hasilnya, saya berhasil memenuhi 100% tenggat waktu tanpa ada satu pun desain yang terlambat, dan kampanye tersebut sukses menjaga konsistensi brand IELS di mata audiens internasional.",
    arbaNotes: "Gunakan STAR method (Situation, Task, Action, Result). Fokus pada '100% on-time' sebagai bukti keandalan.",
  },
  {
    id: "hr-10",
    category: "hr",
    question: "Berapa ekspektasi gaji Anda untuk magang ini?",
    suggestedAnswer: "Fokus utama saya adalah mendapatkan pengalaman praktis dan belajar dari tim kreatif Lawson. Saya fleksibel mengenai kompensasi dan lebih tertarik pada peluang untuk berkembang. Meskipun begitu, saya memahami standar pasar untuk magang desain di Jakarta, dan saya terbuka untuk mendiskusikan apa yang menjadi standar untuk posisi ini.",
    arbaNotes: "Tunjukkan bahwa fokusmu adalah belajar, bukan uang. Tetaplah profesional.",
  },

  // ==========================================
  // CREATIVE QUESTIONS (5)
  // ==========================================
  {
    id: "creative-1",
    category: "creative",
    question: "Coba jelaskan proses kreatif Anda untuk sebuah proyek desain.",
    suggestedAnswer: "Saya mulai dengan memahami brief secara mendalam - siapa audiensnya, apa tujuannya, apa saja batasannya? Kemudian saya melakukan riset. Saya melihat kompetitor, tren saat ini, dan contoh-contoh sukses di bidang tersebut. Selanjutnya, saya membuat sketsa atau bertukar pikiran (brainstorming) untuk berbagai arah desain, tidak hanya satu. Lalu saya menyempurnakan konsep terkuat, meminta masukan, melakukan iterasi, dan menyelesaikannya. Bagi saya, prosesnya adalah: Riset → Eksplorasi → Penyempurnaan → Masukan → Eksekusi.",
    arbaNotes: "Tunjukkan struktur. Tunjukkan bahwa kamu berpikir secara strategis.",
  },
  {
    id: "creative-2",
    category: "creative",
    question: "Deskripsikan proyek desain yang Anda banggakan dan alasannya.",
    suggestedAnswer: "Proyek kampanye 'Global Impact Fellowship to NUS' di IELS. Saya bangga bukan hanya karena hasil visualnya, tetapi karena sistematisasi yang saya bangun. Saya memastikan 100% konsistensi identitas visual brand IELS di semua materi yang saya buat. Saya belajar bahwa di balik desain yang bagus, harus ada sistem yang memungkinkan brand tersebut berkomunikasi dengan jelas di skala internasional. Proyek ini membuktikan bahwa saya mampu bekerja dalam tekanan tinggi namun tetap menjaga standar kualitas brand.",
    arbaNotes: "Hubungkan desain dengan konsistensi brand dan skalabilitas.",
  },
  {
    id: "creative-5",
    category: "creative",
    question: "Ceritakan tentang sebuah keputusan desain yang Anda buat dan alasannya.",
    suggestedAnswer: "Dalam mendesain materi promosi IELS, saya memilih untuk memprioritaskan hierarki visual yang jelas dibandingkan elemen dekoratif. Saya belajar dari supervisor saya bahwa 'desain harus melayani tujuan bisnis'. Jika audiens adalah profesional muda, pesan utama harus tersampaikan dalam detik pertama. Saya memilih tipografi dan komposisi yang mendukung efisiensi komunikasi, bukan sekadar estetika. Setiap pixel memiliki alasan strategis di baliknya.",
    arbaNotes: "Tunjukkan pola pikir 'Design Serves Business'.",
  },
  {
    id: "creative-6",
    category: "creative",
    question: "Bagaimana Anda menangani perbedaan pendapat kreatif dengan atasan?",
    suggestedAnswer: "Saya mendengarkan terlebih dahulu. Saya mencoba memahami mengapa mereka menyarankan arah yang berbeda - sering kali mereka melihat sesuatu yang saya lewatkan. Kemudian saya menjelaskan alasan saya dengan tenang dan mengusulkan kompromi atau menguji kedua pendekatan tersebut. Desain bersifat subjektif, tetapi tujuan bisnis tidak. Jika arahan mereka melayani tujuan bisnis dengan lebih baik, saya akan mengikutinya. Kesuksesan proyek jauh lebih penting daripada ego saya.",
    arbaNotes: "Tunjukkan fleksibilitas dan pemahaman bisnis.",
  },
  {
    id: "creative-8",
    category: "creative",
    question: "Bagaimana Anda akan meningkatkan komunikasi visual Lawson saat ini?",
    suggestedAnswer: "Saya perlu mempelajari brand Lawson saat ini secara menyeluruh terlebih dahulu. Namun dari apa yang saya amati, ada peluang untuk menciptakan bahasa visual yang lebih kohesif di semua titik sentuh (touchpoints) - materi di dalam toko, digital, sosial media, dan pengemasan. Saya juga akan mengeksplorasi bagaimana warna dan tipografi dapat mengkomunikasikan positioning Lawson dengan lebih baik sebagai tempat yang praktis, tepercaya, dan modern. Tetapi ini adalah pemikiran awal - saya akan banyak bertanya sebelum memberikan rekomendasi yang pasti.",
    arbaNotes: "Penuh pertimbangan, jangan menggurui. Tunjukkan bahwa kamu akan bertanya terlebih dahulu.",
  },

  // ==========================================
  // PORTFOLIO QUESTIONS (2)
  // ==========================================
  {
    id: "portfolio-1",
    category: "portfolio",
    question: "Tolong pandu kami melihat portofolio Anda.",
    suggestedAnswer: "Portofolio saya mencakup karya dari magang saya di IELS, proyek akademis, dan karya seni lukis pribadi. Saya menyusunnya sedemikian rupa untuk menunjukkan jangkauan saya - desain media sosial, materi cetak, karya kampanye, dan seni murni (fine art). Setiap karya menceritakan kisah tentang cara berpikir saya. Saya tidak hanya memamerkan hasil akhir; saya menjelaskan brief-nya, tantangannya, dan solusinya. Lukisan PEKSIMIDA, misalnya, menunjukkan landasan artistik saya dan bagaimana warna serta komposisi mengkomunikasikan emosi.",
    arbaNotes: "Atur dan narasikan portofoliomu dengan niat yang jelas.",
  },
  {
    id: "portfolio-2",
    category: "portfolio",
    question: "Ceritakan tentang proyek yang gagal dan apa yang Anda pelajari.",
    suggestedAnswer: "Di awal masa magang saya di IELS, saya mendesain poster promosi yang terlalu rumit - itu terlihat bagus bagi saya, tetapi masukan yang ada menunjukkan bahwa poster itu sulit dibaca dari kejauhan. Saya belajar melalui pengalaman pahit tersebut bahwa desain yang baik harus bekerja di dunia nyata, bukan hanya di layar. Saya mendesain ulangnya dengan tipografi yang lebih besar, tata letak yang lebih bersih, dan performanya jauh lebih baik. Kegagalan tersebut mengajarkan saya untuk menguji desain secara praktis dan memprioritaskan kejelasan daripada kerumitan.",
    arbaNotes: "Tunjukkan pembelajaran dari kesalahan. Ini sangat berharga.",
  },

  // ==========================================
  // BEHAVIORAL QUESTIONS (5)
  // ==========================================
  {
    id: "behavioral-1",
    category: "behavioral",
    question: "Ceritakan saat Anda bekerja dalam tim dan tantangan yang Anda hadapi.",
    suggestedAnswer: "Sebagai Ketua HIMA DKV, saya memimpin tim dengan 15+ anggota. Tantangannya adalah kami semua memiliki gaya kerja dan prioritas yang berbeda-beda. Beberapa anggota berorientasi pada detail, yang lain pemikir gambaran besar (big-picture). Alih-alih mencoba menyeragamkan semua orang, saya merancang sistem yang memanfaatkan kekuatan masing-masing orang. Saya mengadakan sesi evaluasi rutin (check-ins), memperjelas ekspektasi, dan mendelegasikan tugas berdasarkan kekuatan individu. Hasilnya adalah kekompakan yang lebih baik dan eksekusi acara yang lebih efisien.",
    arbaNotes: "Tunjukkan kepemimpinan dan kecerdasan emosional.",
  },
  {
    id: "behavioral-2",
    category: "behavioral",
    question: "Gambarkan situasi di mana Anda harus beradaptasi dengan cepat.",
    suggestedAnswer: "Selama magang di IELS, sebuah kampanye besar yang saya desain tiba-tiba harus beralih fokus karena permintaan klien yang tak terduga dua hari sebelum peluncuran. Daripada panik, saya menilai elemen mana yang bisa digunakan kembali dan mana yang perlu didesain ulang. Saya mengkomunikasikan lini masa (timeline) yang baru kepada supervisor saya dan bekerja efisien untuk memberikan karya berkualitas sesuai jadwal. Kuncinya adalah tetap tenang dan memecahkan masalah alih-alih bersikap defensif.",
    arbaNotes: "Tunjukkan ketahanan mental (resilience) dan kemampuan berpikir cepat.",
  },
  {
    id: "behavioral-3",
    category: "behavioral",
    question: "Ceritakan saat Anda mengambil inisiatif.",
    suggestedAnswer: "Di IELS, saya melihat bahwa alur produksi konten bisa dibuat lebih efisien. Saya mengambil inisiatif untuk menyusun sistem aset desain yang lebih terstandarisasi. Saya mempresentasikannya kepada supervisor, yang kemudian membantu kami bekerja lebih cepat dan tetap konsisten dengan guideline brand. Saya percaya seorang intern tidak hanya bertugas mengeksekusi, tetapi juga memberikan nilai tambah (added value) bagi sistem kerja di perusahaan.",
    arbaNotes: "Ini adalah jawaban paling kuat yang menunjukkan *ownership*.",
  },
  {
    id: "behavioral-6",
    category: "behavioral",
    question: "Jelaskan konflik yang pernah Anda alami dan bagaimana Anda menyelesaikannya.",
    suggestedAnswer: "Selama perencanaan HIMA, dua anggota tim berselisih paham mengenai arah identitas visual sebuah acara. Daripada memihak salah satu, saya memfasilitasi diskusi di mana keduanya mempresentasikan alasannya. Ternyata mereka sedang memecahkan masalah untuk audiens yang berbeda. Kami membuat dua arahan - satu untuk media sosial, satu untuk materi saat acara berlangsung. Keduanya mendapatkan apa yang mereka inginkan, dan acara tersebut diuntungkan oleh variasi tersebut. Terkadang konflik hanyalah perspektif berbeda yang bisa berdampingan.",
    arbaNotes: "Tunjukkan pemecahan masalah yang diplomatis dan kolaboratif.",
  },
  {
    id: "behavioral-9",
    category: "behavioral",
    question: "Bagaimana Anda menangani pekerjaan dengan orang yang secara natural tidak 'klik' dengan Anda?",
    suggestedAnswer: "Saya fokus mencari titik temu dan tujuan bersama. Sekalipun kepribadian kami tidak sejalan, saya biasanya bisa menemukan rasa hormat profesional dan misi bersama. Di HIMA, saya bekerja dengan anggota yang gayanya sangat berbeda dari saya. Saya melakukan usaha ekstra untuk memahami perspektif mereka dan menunjukkan minat yang tulus pada pekerjaan mereka. Profesionalisme dan tujuan bersama bisa menjembatani sebagian besar celah kepribadian.",
    arbaNotes: "Tunjukkan kedewasaan dan fokus pada pekerjaan.",
  },

  // ==========================================
  // LAWSON-SPECIFIC QUESTIONS (2)
  // ==========================================
  {
    id: "lawson-1",
    category: "lawson",
    question: "Apa yang Anda ketahui tentang brand dan nilai-nilai Lawson?",
    suggestedAnswer: "Lawson adalah pemimpin retail convenience di Asia dengan jaringan yang kuat di Indonesia. Brand Anda dibangun di atas prinsip praktis, berpusat pada pelanggan (customer-centric), dan modern. Saya melihat Lawson lebih dari sekadar toko kelontong (convenience store) - Anda adalah pilihan gaya hidup bagi orang-orang sibuk yang menghargai kualitas dan efisiensi. Identitas visual Anda mencerminkan kemudahan untuk didekati (approachability) dan keterpercayaan, dan tim kreatif Anda memastikan bahwa setiap titik sentuh memperkuat janji brand tersebut. Hal yang menarik bagi saya adalah fokus Lawson dalam menciptakan nilai nyata bagi pelanggan, bukan sekadar menjual produk.",
    arbaNotes: "Tunjukkan bahwa kamu sudah melakukan riset. Jadilah spesifik.",
  },
  {
    id: "lawson-4",
    category: "lawson",
    question: "Bagaimana pendekatan Anda dalam mendesain kampanye promosi untuk Lawson?",
    suggestedAnswer: "Pertama, saya akan membedah tujuan dari kampanye tersebut: apakah untuk mendorong foot-traffic atau meningkatkan awareness produk baru. Mengacu pada pengalaman saya di IELS, saya akan memastikan desain tersebut mematuhi guideline brand Lawson secara mutlak. Saya akan meriset audiens Lawson yang sangat beragam, lalu memproduksi materi kreatif yang tidak hanya estetik, tetapi juga memiliki pesan yang 'langsung' dan relevan dengan gaya hidup pelanggan Lawson yang dinamis.",
    arbaNotes: "Tunjukkan bahwa kamu bisa mengadaptasi disiplin IELS ke lingkungan retail Lawson.",
  },
];