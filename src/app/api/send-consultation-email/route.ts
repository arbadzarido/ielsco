import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { to, userName, userEmail, goalTitle, scheduledAt, topics, notes } = body;

    // Format date nicely
    const scheduledDate = new Date(scheduledAt);
    const formattedDate = scheduledDate.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    const formattedTime = scheduledDate.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });

    // Format topics
    const topicsList = topics.map((t: string) => 
      t.split('_').map((word: string) => 
        word.charAt(0).toUpperCase() + word.slice(1)
      ).join(' ')
    ).join(', ');

    // Email HTML Template
    const emailHTML = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #2F4157; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #8B5CF6 0%, #EC4899 100%); color: white; padding: 30px; border-radius: 16px 16px 0 0; text-align: center; }
    .header h1 { margin: 0; font-size: 24px; font-weight: 800; }
    .header p { margin: 10px 0 0 0; opacity: 0.9; font-size: 14px; }
    .content { background: white; padding: 30px; border: 1px solid #E5E7EB; border-top: none; }
    .info-card { background: #F9FAFB; border-left: 4px solid #8B5CF6; padding: 20px; margin: 20px 0; border-radius: 8px; }
    .info-card strong { color: #2F4157; display: block; margin-bottom: 5px; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; }
    .info-card p { margin: 0; color: #4B5563; font-size: 16px; font-weight: 600; }
    .topic-tag { display: inline-block; background: #EDE9FE; color: #7C3AED; padding: 6px 12px; border-radius: 6px; margin: 4px; font-size: 13px; font-weight: 600; }
    .notes-box { background: #FEF3C7; border-left: 4px solid #F59E0B; padding: 15px; margin: 20px 0; border-radius: 8px; }
    .footer { background: #F9FAFB; padding: 20px; text-align: center; border-radius: 0 0 16px 16px; border: 1px solid #E5E7EB; border-top: none; }
    .footer p { margin: 5px 0; font-size: 13px; color: #6B7280; }
    .urgent { background: #FEE2E2; border-left: 4px solid #EF4444; padding: 15px; margin: 20px 0; border-radius: 8px; }
    h2 { color: #2F4157; font-size: 18px; margin: 25px 0 15px 0; font-weight: 700; }
  </style>
</head>
<body>
  <div class="container">
    <!-- Header -->
    <div class="header">
      <h1>🎯 New Consultation Booking</h1>
      <p>A member has scheduled a mentorship session</p>
    </div>
    
    <!-- Content -->
    <div class="content">
      
      <!-- Urgent Notice -->
      <div class="urgent">
        <strong style="color: #DC2626; font-size: 14px;">⚠️ ACTION REQUIRED</strong>
        <p style="margin: 8px 0 0 0; color: #991B1B; font-size: 14px;">
          Please confirm this booking within 24 hours and send the meeting link to the student.
        </p>
      </div>

      <h2>📋 Booking Details</h2>
      
      <div class="info-card">
        <strong>👤 Student Name</strong>
        <p>${userName}</p>
      </div>

      <div class="info-card">
        <strong>📧 Email Address</strong>
        <p>${userEmail}</p>
      </div>

      <div class="info-card">
        <strong>🎯 Learning Goal</strong>
        <p>${goalTitle}</p>
      </div>

      <div class="info-card">
        <strong>📅 Scheduled Date</strong>
        <p>${formattedDate}</p>
      </div>

      <div class="info-card">
        <strong>🕐 Scheduled Time</strong>
        <p>${formattedTime} WIB</p>
      </div>

      <h2>💬 Discussion Topics</h2>
      <div style="margin: 15px 0;">
        ${topics.map((t: string) => `<span class="topic-tag">${t.split('_').map((word: string) => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}</span>`).join('')}
      </div>

      ${notes && notes.trim() !== '' ? `
        <h2>📝 Additional Notes from Student</h2>
        <div class="notes-box">
          <p style="margin: 0; color: #92400E; font-size: 14px; line-height: 1.6;">${notes}</p>
        </div>
      ` : ''}

      <h2>✅ Next Steps</h2>
      <div style="background: #F0F9FF; border-left: 4px solid #3B82F6; padding: 15px; border-radius: 8px;">
        <ol style="margin: 0; padding-left: 20px; color: #1E3A8A;">
          <li style="margin-bottom: 8px;">Confirm the booking via email to <strong>${userEmail}</strong></li>
          <li style="margin-bottom: 8px;">Create a Zoom/Google Meet link</li>
          <li style="margin-bottom: 8px;">Send the meeting link at least 24 hours before the session</li>
          <li>Prepare materials based on the selected topics</li>
        </ol>
      </div>

    </div>

    <!-- Footer -->
    <div class="footer">
      <p><strong>IELS Community</strong></p>
      <p>Mentor Consultation System</p>
      <p style="margin-top: 10px; font-size: 12px;">This is an automated notification from the IELS platform.</p>
    </div>
  </div>
</body>
</html>
    `;

    // Plain text version
    const emailText = `
New Consultation Booking - IELS

Student: ${userName}
Email: ${userEmail}
Goal: ${goalTitle}
Date: ${formattedDate}
Time: ${formattedTime} WIB

Discussion Topics:
${topicsList}

${notes ? `Additional Notes:\n${notes}\n` : ''}

Next Steps:
1. Confirm the booking via email to ${userEmail}
2. Create a Zoom/Google Meet link
3. Send the meeting link at least 24 hours before the session
4. Prepare materials based on the selected topics

---
IELS Community - Mentor Consultation System
    `;

    // Send email using Resend
    const resendApiKey = process.env.RESEND_API_KEY;
    
    if (!resendApiKey) {
      console.error('RESEND_API_KEY not configured');
      return NextResponse.json({ 
        success: false, 
        error: 'Email service not configured' 
      }, { status: 500 });
    }

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'IELS Platform <notifications@ielsco.com>',
        to: [to],
        reply_to: userEmail,
        subject: `🎯 New Consultation Booking - ${userName} (${formattedDate})`,
        html: emailHTML,
        text: emailText,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Resend API error:', data);
      return NextResponse.json({ 
        success: false, 
        error: data.message || 'Failed to send email' 
      }, { status: response.status });
    }

    return NextResponse.json({ 
      success: true, 
      messageId: data.id 
    });

  } catch (error: any) {
    console.error('Email notification error:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}