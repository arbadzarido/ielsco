import { NextRequest, NextResponse } from "next/server";
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies } from "next/headers";

const MAYAR_API_KEY = process.env.MAYAR_API_KEY!;
const MAYAR_BASE_URL = "https://api.mayar.id/hl/v1";

interface PaymentRequest {
  tier: "pro" | "visionary";
  duration: number;
}

const tierPricing: Record<string, { name: string; priceMonthly: number; priceYearly: number; priceLifetime?: number }> = {
  pro: { 
    name: "Insider Membership", 
    priceMonthly: 25000, 
    priceYearly: 200000, 
  },
  visionary: { 
    name: "Visionary Membership", 
    priceLifetime: 500000, 
    priceMonthly: 0, 
    priceYearly: 0, 
  },
};

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    
    // 1. Auth Client
    const supabaseAuth = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) { return cookieStore.get(name)?.value; },
          set(name: string, value: string, options: CookieOptions) {
            try { cookieStore.set({ name, value, ...options }); } catch (error) {}
          },
          remove(name: string, options: CookieOptions) {
            try { cookieStore.set({ name, value: '', ...options }); } catch (error) {}
          },
        },
      }
    );
    
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized User" }, { status: 401 });
    }

    const body: PaymentRequest = await request.json();
    const { tier, duration } = body;

    if (!tier || !tierPricing[tier]) {
      return NextResponse.json({ error: "Invalid tier" }, { status: 400 });
    }

    // 2. Admin Client
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: existingMembership } = await supabaseAdmin
      .from("memberships")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    const pricing = tierPricing[tier];
    let amount: number;
    let description: string;
    
    if (tier === "visionary") {
      amount = pricing.priceLifetime!;
      description = `${pricing.name} - Lifetime Access`;
    } else {
      if (duration === 1) {
        amount = pricing.priceMonthly;
        description = `${pricing.name} - Monthly`;
      } else if (duration === 12) {
        amount = pricing.priceYearly;
        description = `${pricing.name} - Yearly (Save 33%)`;
      } else {
        return NextResponse.json({ error: "Invalid duration" }, { status: 400 });
      }
    }

    // Create transaction record
    const { data: transaction, error: txError } = await supabaseAdmin
      .from("transactions")
      .insert({
        user_id: user.id,
        tier: tier,
        amount: amount,
        currency: "IDR",
        status: "pending",
        duration_months: tier === "visionary" ? 999 : duration,
        metadata: { 
          user_email: user.email, 
          tier_name: pricing.name,
          user_name: user.user_metadata?.full_name || "IELS Member"
        },
      })
      .select()
      .single();

    if (txError || !transaction) {
      console.error("DB Transaction Error:", txError);
      return NextResponse.json({ 
        error: "Failed to create transaction", 
        details: txError?.message 
      }, { status: 500 });
    }

    console.log("✅ Transaction created:", transaction.id);

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || request.headers.get('origin') || 'http://localhost:3000';
    
    // CRITICAL FIX: Generate truly unique identifiers
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 10).toUpperCase();
    const txIdShort = transaction.id.split('-')[0]; // First segment of UUID
    
    // Unique invoice number (Mayar checks this for duplicates)
    const invoiceNo = `IELS-${timestamp}-${randomString}`;
    
    // Add small random variation to amount to bypass duplicate detection
    // Mayar treats Rp200,000 and Rp200,001 as different invoices
    const amountWithVariation = amount + Math.floor(Math.random() * 3); // Add 0-2 Rupiah
    
    console.log("Creating Mayar invoice:", invoiceNo);

 // Create Mayar PAYMENT Payload (Bukan Invoice)
    const mayarPayload = {
      name: `${user.user_metadata?.full_name || "IELS Member"} #${randomString}`,
      email: user.email,
      mobile: user.user_metadata?.phone || `0812${timestamp.toString().slice(-8)}`,
      amount: amountWithVariation,
      description: `${description} [Order ${txIdShort}]`,
      
      // PERHATIKAN: Array 'items' dan 'no' dihapus karena bikin error di endpoint ini.
      
      // Redirect URLs
      redirect_url: `${baseUrl}/dashboard/community?payment=success&new=${!existingMembership}&tx=${transaction.id}`,
      cancel_redirect_url: `${baseUrl}/dashboard/community?payment=cancelled`,
      
      // Metadata for webhook tracking
      metadata: {
        transaction_id: transaction.id,
        user_id: user.id,
        tier: tier,
        duration: duration,
      }
    };

    console.log("Mayar Payload:", JSON.stringify(mayarPayload, null, 2));

    // Call Mayar API - RUBAH ENDPOINT JADI /payment/create
    const mayarResponse = await fetch(`${MAYAR_BASE_URL}/payment/create`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${MAYAR_API_KEY}`,
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
      body: JSON.stringify(mayarPayload),
    });

    console.log("Mayar Response Status:", mayarResponse.status);

    const rawResponse = await mayarResponse.text();
    console.log("Mayar Raw Response:", rawResponse);

    let mayarData;
    try {
      mayarData = JSON.parse(rawResponse);
    } catch (parseError) {
      console.error("Failed to parse Mayar response");
      
      await supabaseAdmin
        .from("transactions")
        .update({ status: "failed" })
        .eq("id", transaction.id);
      
      return NextResponse.json({ 
        error: "Invalid response from payment gateway", 
        details: rawResponse.substring(0, 200) 
      }, { status: 500 });
    }

    // Handle Mayar errors
    if (!mayarResponse.ok) {
      console.error("Mayar API Error:", mayarData);
      
      await supabaseAdmin
        .from("transactions")
        .update({ status: "failed" })
        .eq("id", transaction.id);
      
      // Provide helpful error message based on status code
      let errorMessage = "Payment gateway rejected request";
      let hint = "";
      
      if (mayarResponse.status === 409) {
        errorMessage = "Duplicate invoice detected";
        hint = "Please try again in a few seconds";
      } else if (mayarResponse.status === 401) {
        errorMessage = "Invalid API credentials";
        hint = "Contact support";
      } else if (mayarResponse.status === 422) {
        errorMessage = "Invalid payment data";
        hint = "Please contact support with error code 422";
      }
      
      return NextResponse.json({ 
        error: errorMessage,
        hint: hint,
        details: mayarData 
      }, { status: 500 });
    }

    // Extract payment URL
    const paymentUrl = mayarData.data?.link || mayarData.link || mayarData.data?.url;
    const mayarOrderId = mayarData.data?.id || mayarData.id;

    if (!paymentUrl) {
      console.error("No payment URL in Mayar response:", mayarData);
      
      await supabaseAdmin
        .from("transactions")
        .update({ status: "failed" })
        .eq("id", transaction.id);
      
      return NextResponse.json({ 
        error: "Payment URL not found in response", 
        details: mayarData 
      }, { status: 500 });
    }

    // Update transaction with Mayar data
    await supabaseAdmin
      .from("transactions")
      .update({
        mayar_order_id: mayarOrderId,
        payment_url: paymentUrl,
        updated_at: new Date().toISOString(),
      })
      .eq("id", transaction.id);

    console.log("✅ Payment URL created:", paymentUrl);

    return NextResponse.json({
      success: true,
      payment_url: paymentUrl,
      transaction_id: transaction.id,
    });

  } catch (error: any) {
    console.error("=== CRITICAL ERROR ===");
    console.error("Error:", error);
    console.error("Stack:", error.stack);
    
    return NextResponse.json({ 
      error: "Server error", 
      details: error.message 
    }, { status: 500 });
  }
}