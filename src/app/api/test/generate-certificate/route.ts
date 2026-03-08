import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// ⚠️ JANGAN import generateCertificate dari @/lib/certificateGenerator di sini
// Karena file itu mengandung 'jspdf' yang hanya jalan di Browser, bukan di Server.

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

  // TAMBAHIN INI SEMENTARA BUAT MATIIN API
 

  // ... sisa kode lo dibawahnya

export async function POST(request: NextRequest) {
  try {
    const { attemptId } = await request.json();
 return NextResponse.json({ error: "API Disabled temporarily to stop loop" }, { status: 503 });
    if (!attemptId) {
      return NextResponse.json(
        { error: 'Attempt ID is required' },
        { status: 400 }
      );
    }

    // 1. Fetch data attempt & registration
    const { data: attempt, error: attemptError } = await supabase
      .from('test_attempts')
      .select(`
        *,
        test_registrations (
          email,
          full_name,
          test_type
        )
      `)
      .eq('id', attemptId)
      .single();

    if (attemptError || !attempt) {
      return NextResponse.json(
        { error: 'Test attempt not found' },
        { status: 404 }
      );
    }

    // 2. Validasi Kelulusan
    if (attempt.status !== 'completed') {
      return NextResponse.json(
        { error: 'Test must be completed to generate certificate' },
        { status: 400 }
      );
    }

    // Cek skor (Misal minimal 6.5 untuk lulus)
    // Sesuaikan logic ini dengan kebutuhanmu
    if (!attempt.overall_score || attempt.overall_score < 6.5) {
      return NextResponse.json(
        { error: 'Overall score must be 6.5 or higher to receive certificate' },
        { status: 400 }
      );
    }

    // 3. Cek apakah sertifikat SUDAH ADA (Biar nomornya gak ganti-ganti)
    const { data: existingCert } = await supabase
      .from('test_certificates')
      .select('*')
      .eq('attempt_id', attemptId)
      .eq('is_valid', true)
      .single();

    if (existingCert) {
      return NextResponse.json({
        success: true,
        certificate: {
          fullName: attempt.test_registrations.full_name,
          testType: attempt.test_registrations.test_type,
          attemptType: attempt.attempt_type,
          overallScore: attempt.overall_score,
          listeningScore: attempt.listening_score || 0,
          readingScore: attempt.reading_score || 0,
          writingScore: attempt.writing_score || 0,
          speakingScore: attempt.speaking_score || 0,
          certificateNumber: existingCert.certificate_number,
          verificationCode: existingCert.verification_code,
          issuedAt: existingCert.issued_at,
        },
        message: 'Certificate already exists',
      });
    }

    // 4. Generate Data Baru (Issue Certificate)
    const year = new Date().getFullYear();
    const randomStr = Math.random().toString(36).substring(2, 8).toUpperCase();
    const certificateNumber = `IELS-${year}-${randomStr}`;
    const verificationCode = Math.random().toString(36).substring(2, 12).toUpperCase();
    
    // Kita buat Verification URL (bukan PDF URL karena PDF digenerate on-the-fly)
    const verificationUrl = `${process.env.NEXT_PUBLIC_APP_URL}/verify/${verificationCode}`;

    // 5. Simpan Record ke Database
    // Note: Kolom 'pdf_url' di database mungkin bisa dikosongkan atau diisi verificationUrl
    // karena kita tidak menyimpan file fisik lagi di storage.
    const { data: certificate, error: certError } = await supabase
      .from('test_certificates')
      .insert({
        attempt_id: attemptId,
        certificate_number: certificateNumber,
        verification_code: verificationCode,
        pdf_url: verificationUrl, // Kita ganti fungsinya jadi link verifikasi
        is_valid: true,
        issued_at: new Date().toISOString()
      })
      .select()
      .single();

    if (certError) {
      console.error('Error saving certificate record:', certError);
      throw certError;
    }

    // 6. Return Data Lengkap ke Frontend
    // Frontend akan menerima data ini lalu memanggil fungsi 'generateCertificatePDF' (jsPDF)
    return NextResponse.json({
      success: true,
      certificate: {
        fullName: attempt.test_registrations.full_name,
        testType: attempt.test_registrations.test_type,
        attemptType: attempt.attempt_type,
        overallScore: attempt.overall_score,
        listeningScore: attempt.listening_score || 0,
        readingScore: attempt.reading_score || 0,
        writingScore: attempt.writing_score || 0,
        speakingScore: attempt.speaking_score || 0,
        certificateNumber: certificate.certificate_number,
        verificationCode: certificate.verification_code,
        issuedAt: certificate.issued_at,
      },
      message: 'Certificate generated successfully',
    });

  } catch (error) {
    console.error('Error generating certificate:', error);
    return NextResponse.json(
      { 
        error: 'Failed to generate certificate',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// GET method tetap sama, hanya untuk retrieval data
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const attemptId = searchParams.get('attemptId');
    const verificationCode = searchParams.get('verificationCode');

    if (!attemptId && !verificationCode) {
      return NextResponse.json({ error: 'Missing params' }, { status: 400 });
    }

    let query = supabase.from('test_certificates').select('*, test_attempts(*)').eq('is_valid', true);

    if (attemptId) query = query.eq('attempt_id', attemptId);
    else if (verificationCode) query = query.eq('verification_code', verificationCode);

    const { data: cert, error } = await query.single();

    if (error || !cert) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    return NextResponse.json({ success: true, certificate: cert });

  } catch (error) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}